#!/usr/bin/env bash
set -euo pipefail

workspace="${GITHUB_WORKSPACE:-$(pwd)}"
version="${1:-}"
output_dir="${2:-${workspace}/dist/linglong}"

if [[ -z "${version}" ]]; then
  if [[ "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
    version="${GITHUB_REF_NAME:-}"
  else
    version="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "${workspace}/package.json" | head -n 1)"
  fi
fi
version="${version#v}"

if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid version for Linyaps artifact: ${version}" >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64)
    arch="x86_64"
    ;;
  aarch64 | arm64)
    arch="aarch64"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

linglong_version="${version}"
if [[ "${linglong_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  linglong_version="${linglong_version}.0"
fi

cd "${workspace}"

LINGLONG_VERSION="${linglong_version}" LINGLONG_COMMIT="${GITHUB_SHA:-main}" ruby <<'RUBY'
require "yaml"

path = "linglong.yaml"
data = YAML.load_file(path)
data["package"]["version"] = ENV.fetch("LINGLONG_VERSION")
if data["sources"].is_a?(Array) && data["sources"][0].is_a?(Hash)
  data["sources"][0]["commit"] = ENV.fetch("LINGLONG_COMMIT")
end
File.write(path, YAML.dump(data).sub(/\A---\n/, ""))
RUBY

rm -rf linglong/sources/dbx.git
mkdir -p linglong/sources
tmp_source="$(mktemp -d)"
trap 'rm -rf "${tmp_source}"' EXIT
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'dist/' \
  --exclude 'linglong/' \
  --exclude 'node_modules/' \
  --exclude 'target/' \
  "${workspace}/" "${tmp_source}/dbx.git/"
mv "${tmp_source}/dbx.git" linglong/sources/dbx.git

ll-builder build --skip-fetch-source

mkdir -p "${output_dir}"
uab="${output_dir}/DBX_${version}_${arch}.uab"
ll-builder export --icon src-tauri/icons/128x128.png -o "${uab}"
sha256sum "${uab}" | tee "${uab}.sha256"
