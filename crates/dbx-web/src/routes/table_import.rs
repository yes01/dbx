use std::path::Path as StdPath;
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Multipart, Path, State};
use axum::response::sse::{Event, Sse};
use axum::Json;
use dbx_core::table_import::{self, TableImportRequest};
use dbx_core::transfer;
use futures::stream::Stream;
use futures::StreamExt;
use serde::Deserialize;
use tokio::io::AsyncWriteExt;

use crate::error::AppError;
use crate::state::WebState;

const MAX_IMPORT_UPLOAD_BYTES: usize = 100 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteImportWrapper {
    pub request: TableImportRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelImportRequest {
    pub import_id: String,
}

pub async fn preview_import(
    State(state): State<Arc<WebState>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let tmp_dir = state.data_dir.join("tmp");
    std::fs::create_dir_all(&tmp_dir).map_err(|e| AppError(e.to_string()))?;

    if let Some(field) = multipart.next_field().await.map_err(|e| AppError(e.to_string()))? {
        let file_name = field.file_name().unwrap_or("upload.csv").to_string();
        let safe_name = StdPath::new(&file_name).file_name().and_then(|name| name.to_str()).unwrap_or("upload.csv");
        let extension = StdPath::new(safe_name).extension().and_then(|value| value.to_str()).unwrap_or("csv");
        let file_path = tmp_dir.join(format!("{}.{extension}", uuid::Uuid::new_v4()));
        write_import_upload_stream(field, &file_path, MAX_IMPORT_UPLOAD_BYTES).await?;

        let file_path_str = file_path.to_string_lossy().to_string();
        let preview = table_import::preview_table_import_file_core(&file_path_str).await;
        let _ = tokio::fs::remove_file(&file_path).await;
        let preview = preview.map_err(AppError)?;
        return Ok(Json(serde_json::to_value(preview).map_err(|e| AppError(e.to_string()))?));
    }

    Err(AppError("No file uploaded".to_string()))
}

async fn write_import_upload_stream<S, E>(
    mut chunks: S,
    file_path: &StdPath,
    max_upload_bytes: usize,
) -> Result<(), AppError>
where
    S: Stream<Item = Result<Bytes, E>> + Unpin,
    E: std::fmt::Display,
{
    let mut upload = tokio::fs::File::create(file_path).await.map_err(|error| AppError(error.to_string()))?;
    let mut uploaded_bytes = 0usize;
    let result = async {
        while let Some(chunk) = chunks.next().await {
            let chunk = chunk.map_err(|error| AppError(error.to_string()))?;
            uploaded_bytes = uploaded_bytes.saturating_add(chunk.len());
            if uploaded_bytes > max_upload_bytes {
                return Err(AppError(format!(
                    "File too large: {uploaded_bytes} bytes received (max {max_upload_bytes} bytes)"
                )));
            }
            upload.write_all(&chunk).await.map_err(|error| AppError(error.to_string()))?;
        }
        upload.flush().await.map_err(|error| AppError(error.to_string()))
    }
    .await;
    drop(upload);

    if result.is_err() {
        let _ = tokio::fs::remove_file(file_path).await;
    }
    result
}

pub async fn execute_import(
    State(state): State<Arc<WebState>>,
    Json(body): Json<ExecuteImportWrapper>,
) -> Result<Json<serde_json::Value>, AppError> {
    let req = body.request;

    // Reject import early if the connection is read-only
    if let Some(name) = dbx_core::query::connection_readonly_name(&state.app, &req.connection_id).await {
        return Err(AppError(format!(
            "Read-only mode: connection '{}' has read-only protection enabled. Import blocked.",
            name
        )));
    }

    let import_id = req.import_id.clone();

    let (tx, _) = tokio::sync::broadcast::channel::<String>(256);
    state.sse_channels.write().await.insert(import_id.clone(), tx.clone());

    let app = state.app.clone();
    let state_clone = state.clone();

    tokio::spawn(async move {
        let db_type = match transfer::get_db_type(&app, &req.connection_id).await {
            Ok(t) => t,
            Err(e) => {
                let _ = tx.send(
                    serde_json::json!({
                        "importId": req.import_id,
                        "status": "error",
                        "error": e
                    })
                    .to_string(),
                );
                return;
            }
        };

        let pool_key = match app.get_or_create_pool(&req.connection_id, Some(&req.database)).await {
            Ok(k) => k,
            Err(e) => {
                let _ = tx.send(
                    serde_json::json!({
                        "importId": req.import_id,
                        "status": "error",
                        "error": e
                    })
                    .to_string(),
                );
                return;
            }
        };

        let tx_clone = tx.clone();
        let import_id_for_cancel = req.import_id.clone();
        let result = table_import::import_table_file_core(
            &app,
            &req,
            &db_type,
            &pool_key,
            |id: &str| {
                let id = id.to_string();
                Box::pin(async move { transfer::is_cancelled(&id).await })
            },
            |progress| {
                if let Ok(json) = serde_json::to_string(&progress) {
                    let _ = tx_clone.send(json);
                }
            },
        )
        .await;

        match result {
            Ok(summary) => {
                if let Ok(json) = serde_json::to_string(&summary) {
                    let _ = tx.send(json);
                }
            }
            Err(e) => {
                let _ = tx.send(
                    serde_json::json!({
                        "importId": import_id_for_cancel,
                        "status": "error",
                        "error": e
                    })
                    .to_string(),
                );
            }
        }

        state_clone.sse_channels.write().await.remove(&req.import_id);
    });

    Ok(Json(serde_json::json!({ "importId": import_id })))
}

pub async fn import_progress(
    State(state): State<Arc<WebState>>,
    Path(import_id): Path<String>,
) -> Result<Sse<impl Stream<Item = Result<Event, std::convert::Infallible>>>, AppError> {
    let channels = state.sse_channels.read().await;
    let tx = channels.get(&import_id).ok_or_else(|| AppError("Import not found".to_string()))?;
    let rx = tx.subscribe();
    drop(channels);
    Ok(crate::sse::sse_from_channel(rx))
}

pub async fn cancel_import(
    State(_state): State<Arc<WebState>>,
    Json(req): Json<CancelImportRequest>,
) -> Json<serde_json::Value> {
    transfer::set_cancelled(&req.import_id).await;
    Json(serde_json::json!({ "cancelled": true }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::stream;

    fn test_upload_path() -> std::path::PathBuf {
        std::env::temp_dir().join(format!("dbx-table-import-test-{}", uuid::Uuid::new_v4()))
    }

    #[tokio::test]
    async fn streams_import_upload_to_disk() {
        let file_path = test_upload_path();
        let chunks = stream::iter([Ok::<_, String>(Bytes::from_static(b"a,b\n")), Ok(Bytes::from_static(b"1,2\n"))]);
        assert!(write_import_upload_stream(chunks, &file_path, 8).await.is_ok());
        assert_eq!(tokio::fs::read(&file_path).await.unwrap(), b"a,b\n1,2\n");
        let _ = tokio::fs::remove_file(&file_path).await;
    }

    #[tokio::test]
    async fn removes_partial_upload_after_limit_or_stream_error() {
        let oversized_path = test_upload_path();
        let oversized = stream::iter([Ok::<_, String>(Bytes::from_static(b"1234")), Ok(Bytes::from_static(b"5"))]);
        assert!(write_import_upload_stream(oversized, &oversized_path, 4).await.is_err());
        assert!(!oversized_path.exists());

        let failed_path = test_upload_path();
        let failed = stream::iter([Ok(Bytes::from_static(b"1234")), Err("multipart stream failed")]);
        assert!(write_import_upload_stream(failed, &failed_path, 8).await.is_err());
        assert!(!failed_path.exists());
    }
}
