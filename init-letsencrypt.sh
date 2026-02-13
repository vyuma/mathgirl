#!/bin/bash

# Let's Encrypt initialization script
# Obtains initial SSL certificate for ani-math.jp

set -e

DOMAIN="ani-math.jp"
EMAIL="yumaboda.official@gmail.com"
STAGING=0  # Set to 1 for testing with staging certificates

echo "### Let's Encrypt initialization ###"
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"

# Switch to HTTP-only config
echo "### Switching to HTTP-only config ###"
cp ./nginx/conf.d/app-http-only.conf ./nginx/conf.d/app.conf.temp
mv ./nginx/conf.d/app.conf ./nginx/conf.d/app.conf.https.backup 2>/dev/null || true
mv ./nginx/conf.d/app.conf.temp ./nginx/conf.d/app.conf
echo "Switched to HTTP-only config"

# Start all services (HTTP only)
echo "### Starting services ###"
docker compose -f docker-compose.prod.yml up -d
sleep 5
echo "Services started"

# Download recommended TLS parameters
echo "### Downloading TLS parameters ###"
mkdir -p ./certbot/conf

PARAMS_PATH="./certbot/conf/options-ssl-nginx.conf"
if [ ! -e "$PARAMS_PATH" ]; then
  echo "Downloading TLS parameters..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$PARAMS_PATH"
  echo "TLS parameters downloaded"
fi

DHPARAMS_PATH="./certbot/conf/ssl-dhparams.pem"
if [ ! -e "$DHPARAMS_PATH" ]; then
  echo "Downloading DH parameters..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DHPARAMS_PATH"
  echo "DH parameters downloaded"
fi

# Obtain certificate
echo "### Obtaining Let's Encrypt certificate ###"
STAGING_ARG=""
if [ $STAGING != "0" ]; then
  STAGING_ARG="--staging"
  echo "Using staging environment (test certificates)"
fi

docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot \
  $STAGING_ARG \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

# Restore HTTPS config
echo "### Restoring HTTPS config ###"
if [ -f ./nginx/conf.d/app.conf.https.backup ]; then
  mv ./nginx/conf.d/app.conf.https.backup ./nginx/conf.d/app.conf
  echo "HTTPS config restored"
else
  echo "WARNING: HTTPS backup not found, keeping current config"
fi

# Reload nginx
echo "### Reloading nginx ###"
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Done! ###"
echo "HTTPS is now active: https://${DOMAIN}"
