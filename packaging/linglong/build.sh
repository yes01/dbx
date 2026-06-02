#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-22.13.1}"
RUST_TOOLCHAIN="${RUST_TOOLCHAIN:-stable}"

if [[ -z "${PREFIX:-}" ]]; then
  echo "PREFIX is required; run this script from ll-builder." >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64)
    node_arch="x64"
    ;;
  aarch64 | arm64)
    node_arch="arm64"
    ;;
  *)
    echo "Unsupported Node.js architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

node_dir="/tmp/dbx-node-v${NODE_VERSION}"
if [[ ! -x "${node_dir}/bin/node" ]]; then
  rm -rf "${node_dir}"
  mkdir -p "${node_dir}"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" \
    | tar -xJ --strip-components=1 -C "${node_dir}"
fi
export PATH="${node_dir}/bin:${HOME}/.cargo/bin:${PATH}"

if ! command -v rustc >/dev/null 2>&1; then
  curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain "${RUST_TOOLCHAIN}"
fi

corepack enable
corepack prepare pnpm@10.27.0 --activate

pnpm install --frozen-lockfile
pnpm tauri build --no-bundle

install -Dm755 src-tauri/target/release/dbx "${PREFIX}/bin/dbx"
install -Dm644 packaging/linglong/com.dbx.app.desktop "${PREFIX}/share/applications/com.dbx.app.desktop"
install -Dm644 packaging/linglong/com.dbx.app.metainfo.xml "${PREFIX}/share/metainfo/com.dbx.app.metainfo.xml"
install -Dm644 src-tauri/icons/32x32.png "${PREFIX}/share/icons/hicolor/32x32/apps/com.dbx.app.png"
install -Dm644 src-tauri/icons/128x128.png "${PREFIX}/share/icons/hicolor/128x128/apps/com.dbx.app.png"
install -Dm644 src-tauri/icons/128x128@2x.png "${PREFIX}/share/icons/hicolor/256x256/apps/com.dbx.app.png"
