#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-smefund.na}"
APP_PORT="${APP_PORT:-3008}"
ENABLE_WWW="${ENABLE_WWW:-true}"

NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

echo "=== Installing Nginx ==="

sudo apt-get update
sudo apt-get install -y nginx

echo "=== Creating Nginx config ==="

SERVER_NAMES="$DOMAIN"

if [ "$ENABLE_WWW" = "true" ]; then
  SERVER_NAMES="$SERVER_NAMES www.$DOMAIN"
fi

sudo tee "$NGINX_SITE" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;

    server_name ${SERVER_NAMES};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};

        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

echo "=== Enabling site ==="

sudo ln -sfn "$NGINX_SITE" "$NGINX_ENABLED"

sudo rm -f /etc/nginx/sites-enabled/default

echo "=== Testing Nginx configuration ==="

sudo nginx -t

echo "=== Enabling Nginx service ==="

sudo systemctl enable nginx
sudo systemctl restart nginx

echo "=== Testing application ==="

if curl -fsS "http://127.0.0.1:${APP_PORT}" >/dev/null; then
  echo "Application responding on port ${APP_PORT}."
else
  echo "WARNING: Application is not responding on 127.0.0.1:${APP_PORT}" >&2
fi

echo "=== Testing Nginx locally ==="

if curl -fsS "http://127.0.0.1" >/dev/null; then
  echo "Nginx reverse proxy is responding."
else
  echo "WARNING: Nginx is not responding correctly." >&2
fi

echo
echo "=== Nginx setup complete ==="
echo "Domain:   ${DOMAIN}"
echo "App port: ${APP_PORT}"
echo
echo "Next:"
echo "1. Point DNS for ${DOMAIN} to this VM."
echo "2. Ensure GCP firewall allows TCP 80 and 443."
echo "3. Run setup-ssl.sh once DNS resolves."