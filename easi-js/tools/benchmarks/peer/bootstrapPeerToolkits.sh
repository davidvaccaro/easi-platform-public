#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$ROOT_DIR/vendors"
SRC_DIR="$VENDOR_DIR/src"
VENV_DIR="$ROOT_DIR/.venv"
FODICOM_PROJECT="$ROOT_DIR/runners/fodicom/FoDicomBench/FoDicomBench.csproj"
DCM4CHE_VERSION="5.34.3" # Keep aligned with runners/dcm4che/pom.xml.

mkdir -p "$VENDOR_DIR" "$SRC_DIR"

log() {
  echo "[peer-bootstrap] $*"
}

clone_if_missing() {
  local name="$1"
  local url="$2"
  local release="${3:-}"
  local target="$SRC_DIR/$name"

  if [[ -d "$target/.git" ]]; then
    if [[ -n "$release" ]]; then
      local current_release
      current_release="$(git -C "$target" describe --tags --exact-match HEAD 2>/dev/null || true)"
      if [[ "$current_release" != "$release" ]] || [[ -n "$(git -C "$target" status --porcelain)" ]]; then
        log "error: $name source must be an unmodified release $release checkout. Move $target aside and rerun bootstrap; local work has not been changed."
        return 1
      fi
    fi
    log "source already present: $name"
    return 0
  fi

  log "cloning $name from $url"
  if [[ -n "$release" ]]; then
    git clone --depth 1 --branch "$release" "$url" "$target"
  else
    git clone --depth 1 "$url" "$target"
  fi
}

bootstrap_sources() {
  clone_if_missing "dcmtk" "https://github.com/DCMTK/dcmtk.git"
  clone_if_missing "pydicom" "https://github.com/pydicom/pydicom.git"
  clone_if_missing "fo-dicom" "https://github.com/fo-dicom/fo-dicom.git"
  clone_if_missing "dcm4che" "https://github.com/dcm4che/dcm4che.git" "$DCM4CHE_VERSION"
  clone_if_missing "gdcm" "https://github.com/malaterre/GDCM.git"
}

bootstrap_python() {
  if [[ ! -d "$VENV_DIR" ]]; then
    log "creating python venv"
    python3 -m venv "$VENV_DIR"
  fi

  log "installing pydicom into venv"
  "$VENV_DIR/bin/python3" -m pip install --upgrade pip
  "$VENV_DIR/bin/python3" -m pip install pydicom
}

bootstrap_fodicom() {
  log "restoring fo-dicom benchmark project"
  dotnet restore "$FODICOM_PROJECT"
}

bootstrap_dcm4che_runner() {
  local dcm4che_root="$SRC_DIR/dcm4che"
  local runner_pom="$ROOT_DIR/runners/dcm4che/pom.xml"

  if [[ ! -f "$dcm4che_root/mvnw" ]]; then
    log "error: dcm4che Maven wrapper was not found at $dcm4che_root/mvnw"
    return 1
  fi

  log "installing dcm4che-core into local Maven cache"
  (cd "$dcm4che_root" && ./mvnw -q -DskipTests -pl dcm4che-core -am install)

  log "building in-process dcm4che benchmark runner jar"
  (cd "$dcm4che_root" && ./mvnw -q -f "$runner_pom" -DskipTests package)
}

download_dcm4che_bin() {

  local target_dir="$VENDOR_DIR/dcm4che"
  local bin_path="$target_dir/bin/dcmdump"
  if [[ -x "$bin_path" ]]; then
    log "dcm4che binary already installed"
    return 0
  fi

  mkdir -p "$target_dir"

  local versions=("5.34.1" "5.34.0" "5.33.1")
  local downloaded=0

  for version in "${versions[@]}"; do
    local url="https://github.com/dcm4che/dcm4che/releases/download/${version}/dcm4che-${version}-bin.zip"
    local zip_path="$VENDOR_DIR/dcm4che-${version}-bin.zip"

    log "attempting dcm4che binary download: $url"
    if curl -fL "$url" -o "$zip_path"; then
      rm -rf "$target_dir"
      mkdir -p "$target_dir"
      unzip -q "$zip_path" -d "$VENDOR_DIR"

      local extracted="$VENDOR_DIR/dcm4che-${version}"
      if [[ -d "$extracted" ]]; then
        mv "$extracted" "$target_dir"
      fi

      if [[ -x "$target_dir/bin/dcmdump" ]]; then
        downloaded=1
        rm -f "$zip_path"
        break
      fi
    fi
  done

  if [[ "$downloaded" -ne 1 ]]; then
    log "warning: failed to bootstrap dcm4che binary release automatically"
    return 0
  fi

  log "dcm4che binary installed at $target_dir/bin/dcmdump"
}

main() {
  bootstrap_sources
  bootstrap_python
  bootstrap_fodicom
  bootstrap_dcm4che_runner
  download_dcm4che_bin

  log "bootstrap complete"
  log "python runner: $VENV_DIR/bin/python3"
  log "dcm4che dcmdump: $VENDOR_DIR/dcm4che/bin/dcmdump"
  log "dcmtk/gdcm source cloned under: $SRC_DIR"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
