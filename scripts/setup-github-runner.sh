#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.runner}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${GITHUB_REPO_URL:?GITHUB_REPO_URL is required}"
: "${GITHUB_RUNNER_TOKEN:?GITHUB_RUNNER_TOKEN is required}"

RUNNER_USER="${RUNNER_USER:-github-runner}"
RUNNER_NAME="${RUNNER_NAME:-prosme-dev}"
RUNNER_LABELS="${RUNNER_LABELS:-prosme-dev}"
RUNNER_HOME="${RUNNER_HOME:-/home/${RUNNER_USER}/actions-runner}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/prosme-dev}"

echo "=== Detecting operating system ==="

if [ ! -f /etc/os-release ]; then
  echo "Unable to detect operating system." >&2
  exit 1
fi

. /etc/os-release

case "$ID" in
  ubuntu)
    DOCKER_REPO_OS="ubuntu"
    ;;
  debian)
    DOCKER_REPO_OS="debian"
    ;;
  *)
    echo "Unsupported operating system: $ID" >&2
    exit 1
    ;;
esac

echo "OS: ${PRETTY_NAME}"
echo "Docker repository: ${DOCKER_REPO_OS}"

echo "=== Cleaning stale Docker repositories ==="

sudo rm -f /etc/apt/sources.list.d/docker.list

for file in /etc/apt/sources.list.d/*; do
  [ -f "$file" ] || continue

  if grep -q "download.docker.com/linux/" "$file" 2>/dev/null; then
    echo "Removing stale Docker source: $file"
    sudo rm -f "$file"
  fi
done

echo "=== Installing base dependencies ==="

sudo apt-get update

sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  rsync \
  tar

echo "=== Installing Docker if required ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Installing Docker Engine..."

  sudo install -m 0755 -d /etc/apt/keyrings
  sudo rm -f /etc/apt/keyrings/docker.gpg

  curl -fsSL \
    "https://download.docker.com/linux/${DOCKER_REPO_OS}/gpg" \
    | sudo gpg --dearmor \
      -o /etc/apt/keyrings/docker.gpg

  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DOCKER_REPO_OS} ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update

  sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
else
  echo "Docker is already installed."
fi

echo "=== Enabling Docker ==="

sudo systemctl enable --now docker

echo "=== Verifying Docker installation ==="

sudo docker --version
sudo docker compose version

echo "=== Creating runner user ==="

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  sudo useradd \
    --create-home \
    --shell /bin/bash \
    "$RUNNER_USER"

  echo "Created runner user: $RUNNER_USER"
else
  echo "Runner user already exists: $RUNNER_USER"
fi

echo "=== Adding runner user to Docker group ==="

sudo usermod -aG docker "$RUNNER_USER"

echo "=== Creating deployment directory ==="

sudo mkdir -p "$DEPLOY_PATH"
sudo chown -R "$RUNNER_USER:$RUNNER_USER" "$DEPLOY_PATH"

echo "=== Creating runner directory ==="

sudo mkdir -p "$RUNNER_HOME"
sudo chown -R "$RUNNER_USER:$RUNNER_USER" "$(dirname "$RUNNER_HOME")"

echo "=== Determining latest GitHub Actions runner version ==="

RUNNER_VERSION="$(
  curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
    | grep '"tag_name"' \
    | head -n1 \
    | cut -d '"' -f4 \
    | sed 's/^v//'
)"

if [ -z "$RUNNER_VERSION" ]; then
  echo "Unable to determine GitHub Actions runner version." >&2
  exit 1
fi

echo "Runner version: $RUNNER_VERSION"

RUNNER_ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}"

echo "=== Downloading GitHub Actions runner ==="

sudo -u "$RUNNER_USER" bash <<EOF
set -euo pipefail

cd "$RUNNER_HOME"

if [ ! -f "./config.sh" ]; then
  curl -fL \
    -o "$RUNNER_ARCHIVE" \
    "$RUNNER_URL"

  tar xzf "$RUNNER_ARCHIVE"
  rm -f "$RUNNER_ARCHIVE"
else
  echo "Runner files already exist."
fi
EOF

echo "=== Registering GitHub Actions runner ==="

if [ ! -f "${RUNNER_HOME}/.runner" ]; then
  sudo -u "$RUNNER_USER" bash <<EOF
set -euo pipefail

cd "$RUNNER_HOME"

./config.sh \
  --unattended \
  --url "$GITHUB_REPO_URL" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work "_work"
EOF
else
  echo "Runner is already registered."
fi

echo "=== Installing GitHub Actions runner service ==="

if ! sudo "$RUNNER_HOME/svc.sh" status >/dev/null 2>&1; then
  sudo "$RUNNER_HOME/svc.sh" install "$RUNNER_USER"
else
  echo "Runner service already installed."
fi

echo "=== Restarting GitHub Actions runner service ==="

sudo "$RUNNER_HOME/svc.sh" stop || true
sudo "$RUNNER_HOME/svc.sh" start

echo "=== Verifying Docker access for runner user ==="

sudo -u "$RUNNER_USER" -H bash <<'EOF'
set -euo pipefail

docker --version
docker compose version
docker ps
EOF

echo "=== Checking runner service ==="

sudo "$RUNNER_HOME/svc.sh" status || true

echo
echo "======================================"
echo "GitHub runner setup complete"
echo "======================================"
echo "Runner user: $RUNNER_USER"
echo "Runner name: $RUNNER_NAME"
echo "Labels:      $RUNNER_LABELS"
echo "Runner path: $RUNNER_HOME"
echo "Deploy path: $DEPLOY_PATH"