#!/bin/sh
# Substitute only ${BACKEND_URL} in nginx template; leave nginx $variables untouched
envsubst '$BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec "$@"
