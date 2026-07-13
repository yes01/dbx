use std::future::Future;
use std::sync::Arc;

use axum::extract::{Multipart, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppError;
use crate::state::WebState;

async fn run_cancellable<T, F>(state: &Arc<WebState>, execution_id: Option<String>, future: F) -> Result<T, AppError>
where
    F: Future<Output = Result<T, String>>,
{
    let registered = execution_id
        .as_ref()
        .filter(|id| !id.trim().is_empty())
        .map(|id| state.app.running_queries.register(id.clone()));
    if let Some(query) = registered.as_ref() {
        let token = query.token();
        tokio::select! {
            biased;
            _ = token.cancelled() => Err(AppError(dbx_core::query::canceled_error())),
            result = future => result.map_err(AppError),
        }
    } else {
        future.await.map_err(AppError)
    }
}

/// Check if a connection is read-only and return an error if so.
async fn ensure_writable(
    app: &dbx_core::connection::AppState,
    connection_id: &str,
    action: &str,
) -> Result<(), AppError> {
    if let Some(name) = dbx_core::query::connection_readonly_name(app, connection_id).await {
        return Err(AppError(format!(
            "Read-only mode: connection '{}' has read-only protection enabled. {} blocked.",
            name, action
        )));
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoConnectionRequest {
    pub connection_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoCollectionRequest {
    pub connection_id: String,
    pub database: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoCollectionNameRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoFindRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub skip: Option<u64>,
    pub limit: Option<i64>,
    pub filter: Option<String>,
    pub projection: Option<String>,
    pub sort: Option<String>,
    pub execution_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoServerVersionRequest {
    pub connection_id: String,
    pub database: String,
    pub execution_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoAggregateRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub pipeline_json: String,
    pub max_rows: Option<usize>,
    pub execution_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoInsertRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub doc_json: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoInsertDocumentsRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub docs_json: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoUpdateDocumentsRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub filter_json: String,
    pub update_json: String,
    pub many: bool,
    pub options_json: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoDeleteDocumentsRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub filter_json: String,
    pub many: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoUpdateRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub id: String,
    pub doc_json: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MongoDeleteRequest {
    pub connection_id: String,
    pub database: String,
    pub collection: String,
    pub id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GridFsBucketRequest {
    pub connection_id: String,
    pub database: String,
    pub bucket: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GridFsDownloadRequest {
    pub connection_id: String,
    pub database: String,
    pub bucket: String,
    pub file_id: String,
}

pub async fn list_databases(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoConnectionRequest>,
) -> Result<Json<Vec<String>>, AppError> {
    let result =
        dbx_core::mongo_ops::mongo_list_databases_core(&state.app, &req.connection_id).await.map_err(AppError)?;
    Ok(Json(result))
}

pub async fn list_collections(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoCollectionRequest>,
) -> Result<Json<Vec<dbx_core::db::vector_driver::CollectionInfo>>, AppError> {
    let result = dbx_core::mongo_ops::mongo_list_collections_core(&state.app, &req.connection_id, &req.database)
        .await
        .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn create_database(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoCollectionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Create database").await?;
    dbx_core::mongo_ops::mongo_create_database_core(&state.app, &req.connection_id, &req.database)
        .await
        .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn drop_database(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoCollectionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Drop database").await?;
    dbx_core::mongo_ops::mongo_drop_database_core(&state.app, &req.connection_id, &req.database)
        .await
        .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn drop_collection(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoCollectionNameRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Drop collection").await?;
    dbx_core::mongo_ops::mongo_drop_collection_core(&state.app, &req.connection_id, &req.database, &req.collection)
        .await
        .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn find_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoFindRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = run_cancellable(
        &state,
        req.execution_id.clone(),
        dbx_core::mongo_ops::mongo_find_documents_core(
            &state.app,
            &req.connection_id,
            &req.database,
            &req.collection,
            req.skip.unwrap_or(0),
            req.limit.unwrap_or(50),
            req.filter.as_deref(),
            req.projection.as_deref(),
            req.sort.as_deref(),
        ),
    )
    .await?;
    Ok(Json(serde_json::to_value(result).map_err(|e| AppError(e.to_string()))?))
}

pub async fn document_find_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoFindRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = run_cancellable(
        &state,
        req.execution_id.clone(),
        dbx_core::mongo_ops::document_find_documents_core(
            &state.app,
            &req.connection_id,
            &req.database,
            &req.collection,
            req.skip.unwrap_or(0),
            req.limit.unwrap_or(50),
            req.filter.as_deref(),
            req.projection.as_deref(),
            req.sort.as_deref(),
        ),
    )
    .await?;
    Ok(Json(serde_json::to_value(result).map_err(|e| AppError(e.to_string()))?))
}

pub async fn list_gridfs_files(
    State(state): State<Arc<WebState>>,
    Json(req): Json<GridFsBucketRequest>,
) -> Result<Json<Vec<dbx_core::mongo_ops::MongoGridFsFileInfo>>, AppError> {
    let result =
        dbx_core::mongo_ops::mongo_list_gridfs_files_core(&state.app, &req.connection_id, &req.database, &req.bucket)
            .await
            .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn list_gridfs_buckets(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoCollectionRequest>,
) -> Result<Json<Vec<dbx_core::mongo_ops::MongoGridFsBucketInfo>>, AppError> {
    let result = dbx_core::mongo_ops::mongo_list_gridfs_buckets_core(&state.app, &req.connection_id, &req.database)
        .await
        .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn create_gridfs_bucket(
    State(state): State<Arc<WebState>>,
    Json(req): Json<GridFsBucketRequest>,
) -> Result<Json<()>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Create GridFS bucket").await?;
    dbx_core::mongo_ops::mongo_create_gridfs_bucket_core(&state.app, &req.connection_id, &req.database, &req.bucket)
        .await
        .map_err(AppError)?;
    Ok(Json(()))
}

pub async fn delete_gridfs_bucket(
    State(state): State<Arc<WebState>>,
    Json(req): Json<GridFsBucketRequest>,
) -> Result<Json<()>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Delete GridFS bucket").await?;
    dbx_core::mongo_ops::mongo_delete_gridfs_bucket_core(&state.app, &req.connection_id, &req.database, &req.bucket)
        .await
        .map_err(AppError)?;
    Ok(Json(()))
}

pub async fn download_gridfs_file(
    State(state): State<Arc<WebState>>,
    Json(req): Json<GridFsDownloadRequest>,
) -> Result<Json<Vec<u8>>, AppError> {
    let result = dbx_core::mongo_ops::mongo_download_gridfs_file_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.bucket,
        &req.file_id,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn upload_gridfs_file(
    State(state): State<Arc<WebState>>,
    mut multipart: Multipart,
) -> Result<Json<String>, AppError> {
    let mut connection_id: Option<String> = None;
    let mut database: Option<String> = None;
    let mut bucket: Option<String> = None;
    let mut file_name: Option<String> = None;
    let mut content_type: Option<String> = None;
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError(e.to_string()))? {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "connectionId" => connection_id = Some(field.text().await.map_err(|e| AppError(e.to_string()))?),
            "database" => database = Some(field.text().await.map_err(|e| AppError(e.to_string()))?),
            "bucket" => bucket = Some(field.text().await.map_err(|e| AppError(e.to_string()))?),
            "fileName" => file_name = Some(field.text().await.map_err(|e| AppError(e.to_string()))?),
            "contentType" => content_type = Some(field.text().await.map_err(|e| AppError(e.to_string()))?),
            "file" => {
                if file_name.is_none() {
                    file_name = field.file_name().map(str::to_string);
                }
                if content_type.is_none() {
                    content_type = field.content_type().map(str::to_string);
                }
                file_bytes = Some(field.bytes().await.map_err(|e| AppError(e.to_string()))?.to_vec());
            }
            _ => {
                let _ = field.bytes().await;
            }
        }
    }

    let connection_id = connection_id.ok_or_else(|| AppError("Missing connectionId".to_string()))?;
    let database = database.ok_or_else(|| AppError("Missing database".to_string()))?;
    let bucket = bucket.ok_or_else(|| AppError("Missing bucket".to_string()))?;
    let file_name = file_name.ok_or_else(|| AppError("Missing fileName".to_string()))?;
    let file_bytes = file_bytes.ok_or_else(|| AppError("No file uploaded".to_string()))?;

    ensure_writable(&state.app, &connection_id, "Upload GridFS file").await?;
    let result = dbx_core::mongo_ops::mongo_upload_gridfs_file_core(
        &state.app,
        &connection_id,
        &database,
        &bucket,
        &file_name,
        &file_bytes,
        content_type.as_deref(),
    )
    .await
    .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn delete_gridfs_file(
    State(state): State<Arc<WebState>>,
    Json(req): Json<GridFsDownloadRequest>,
) -> Result<Json<()>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Delete GridFS file").await?;
    dbx_core::mongo_ops::mongo_delete_gridfs_file_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.bucket,
        &req.file_id,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(()))
}

pub async fn server_version(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoServerVersionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = run_cancellable(
        &state,
        req.execution_id.clone(),
        dbx_core::mongo_ops::mongo_server_version_core(&state.app, &req.connection_id, &req.database),
    )
    .await?;
    Ok(Json(serde_json::to_value(result).map_err(|e| AppError(e.to_string()))?))
}

pub async fn aggregate_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoAggregateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = run_cancellable(
        &state,
        req.execution_id.clone(),
        dbx_core::mongo_ops::mongo_aggregate_documents_core(
            &state.app,
            &req.connection_id,
            &req.database,
            &req.collection,
            &req.pipeline_json,
            req.max_rows,
        ),
    )
    .await?;
    Ok(Json(serde_json::to_value(result).map_err(|e| AppError(e.to_string()))?))
}

pub async fn insert_document(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoInsertRequest>,
) -> Result<Json<String>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Insert").await?;
    let result = dbx_core::mongo_ops::mongo_insert_document_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.doc_json,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn insert_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoInsertDocumentsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Insert").await?;
    let result = dbx_core::mongo_ops::mongo_insert_documents_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.docs_json,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "affected_rows": result })))
}

pub async fn update_document(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoUpdateRequest>,
) -> Result<Json<u64>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Update").await?;
    let result = dbx_core::mongo_ops::mongo_update_document_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.id,
        &req.doc_json,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn update_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoUpdateDocumentsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Update").await?;
    let result = dbx_core::mongo_ops::mongo_update_documents_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.filter_json,
        &req.update_json,
        req.many,
        req.options_json.as_deref(),
    )
    .await
    .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "affected_rows": result })))
}

pub async fn delete_document(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoDeleteRequest>,
) -> Result<Json<u64>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Delete").await?;
    let result = dbx_core::mongo_ops::mongo_delete_document_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.id,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(result))
}

pub async fn delete_documents(
    State(state): State<Arc<WebState>>,
    Json(req): Json<MongoDeleteDocumentsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_writable(&state.app, &req.connection_id, "Delete").await?;
    let result = dbx_core::mongo_ops::mongo_delete_documents_core(
        &state.app,
        &req.connection_id,
        &req.database,
        &req.collection,
        &req.filter_json,
        req.many,
    )
    .await
    .map_err(AppError)?;
    Ok(Json(serde_json::json!({ "affected_rows": result })))
}
