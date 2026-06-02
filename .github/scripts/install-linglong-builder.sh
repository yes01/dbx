#!/usr/bin/env bash
set -euo pipefail

source /etc/os-release

case "${ID}:${VERSION_ID}" in
  ubuntu:24.04)
    repo="https://ci.deepin.com/repo/obs/linglong:/CI:/release/xUbuntu_24.04/"
    ;;
  debian:12)
    repo="https://ci.deepin.com/repo/obs/linglong:/CI:/release/Debian_12/"
    ;;
  debian:13)
    repo="https://ci.deepin.com/repo/obs/linglong:/CI:/release/Debian_13/"
    ;;
  deepin:23)
    repo="https://ci.deepin.com/repo/obs/linglong:/CI:/release/Deepin_23/"
    ;;
  deepin:25)
    repo="https://ci.deepin.com/repo/obs/linglong:/CI:/release/Deepin_25/"
    ;;
  *)
    echo "Unsupported distribution for automated Linyaps install: ${ID} ${VERSION_ID}" >&2
    exit 1
    ;;
esac

sudo apt-get update
sudo apt-get install -y ca-certificates curl rsync
echo "deb [trusted=yes] ${repo} ./" | sudo tee /etc/apt/sources.list.d/linglong.list
sudo apt-get update
sudo apt-get install -y linglong-bin linglong-builder

ll-builder --version
