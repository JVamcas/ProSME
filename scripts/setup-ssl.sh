#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.ssl}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN is required}"
: "${EMAIL:?EMAIL is required}"

ENABLE_WWW="${ENABLE_WWW:-false}"

echo "======================================"
echo "SSL Setup"
echo "======================================"
echo "Domain:     $DOMAIN"
echo "Email:      $EMAIL"
echo "Enable WWW: $ENABLE_WWW"
echo

echo "=== Installing Certbot ==="

sudo apt-get update

sudo apt-get install -y \
  certbot \
  python3-certbot-nginx \
  dnsutils

echo "=== Verifying Nginx ==="

sudo nginx -t

echo "=== Checking DNS ==="

DOMAIN_IP="$(dig +short "$DOMAIN" @8.8.8.8 | tail -n1)"

if [ -z "$DOMAIN_IP" ]; then
  echo "Unable to resolve $DOMAIN." >&2
  exit 1
fi

echo "$DOMAIN resolves to: $DOMAIN_IP"

if [ "$ENABLE_WWW" = "true" ]; then
  WWW_IP="$(dig +short "www.$DOMAIN" @8.8.8.8 | tail -n1)"

  if [ -z "$WWW_IP" ]; then
    echo "Unable to resolve www.$DOMAIN." >&2
    exit 1
  fi

  echo "www.$DOMAIN resolves to: $WWW_IP"
fi

echo "=== Checking HTTP availability ==="

if ! curl -fsSI "http://$DOMAIN" >/dev/null; then
  echo "HTTP is not reachable for $DOMAIN." >&2
  echo "Check DNS, Nginx, and GCP firewall rules before continuing." >&2
  exit 1
fi

echo "HTTP is reachable."

echo "=== Requesting certificate ==="

CERTBOT_DOMAINS=(
  -d "$DOMAIN"
)

if [ "$ENABLE_WWW" = "true" ]; then
  CERTBOT_DOMAINS+=(
    -d "www.$DOMAIN"
  )
fi

sudo certbot \
  --nginx \
  "${CERTBOT_DOMAINS[@]}" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --redirect \
  --non-interactive

echo "=== Verifying Nginx configuration ==="

sudo nginx -t
sudo systemctl reload nginx

echo "=== Testing HTTPS ==="

curl -fsSI "https://$DOMAIN"

echo "=== Testing certificate renewal ==="

sudo certbot renew --dry-run

echo "=== Checking Certbot timer ==="

sudo systemctl enable --now certbot.timer || true
sudo systemctl status certbot.timer --no-pager || true

echo
echo "======================================"
echo "SSL setup complete"
echo "======================================"
echo "HTTPS: https://$DOMAIN"

if [ "$ENABLE_WWW" = "true" ]; then
  echo "WWW:   https://www.$DOMAIN"
fi