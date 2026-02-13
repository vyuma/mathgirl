#!/bin/bash
# init-letsencrypt.sh
# ani-math.jp の初回SSL証明書を取得するスクリプト
# Usage: sudo bash init-letsencrypt.sh

set -e

DOMAIN="ani-math.jp"
EMAIL="${CERTBOT_EMAIL:-}"  # .env or env var で指定、空なら --register-unsafely-without-email
COMPOSE="docker compose -f docker-compose.prod.yml"

if [ -z "$EMAIL" ]; then
  echo "Warning: CERTBOT_EMAIL not set. Using --register-unsafely-without-email"
  EMAIL_ARG="--register-unsafely-without-email"
else
  EMAIL_ARG="--email $EMAIL -m $EMAIL"
fi

echo "==> 1. Creating dummy certificate for nginx to start..."
$COMPOSE run --rm --entrypoint "" certbot sh -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'
"

echo "==> 2. Starting nginx..."
$COMPOSE up -d nginx

echo "==> 3. Deleting dummy certificate..."
$COMPOSE run --rm --entrypoint "" certbot sh -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN &&
  rm -rf /etc/letsencrypt/archive/$DOMAIN &&
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf
"

echo "==> 4. Requesting real certificate from Let's Encrypt..."
$COMPOSE run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "$DOMAIN" \
  $EMAIL_ARG \
  --agree-tos \
  --no-eff-email \
  --force-renewal

echo "==> 5. Reloading nginx..."
$COMPOSE exec nginx nginx -s reload

echo "==> Done! HTTPS is now active for $DOMAIN"
