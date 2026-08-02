#!/bin/sh
set -eu

KCADM=/opt/keycloak/bin/kcadm.sh
"$KCADM" config credentials --server http://keycloak:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"
CLIENT_ID=$("$KCADM" get clients -r kal-flow -q clientId=kal-flow-web --fields id --format csv --noquotes)
test -n "$CLIENT_ID"
"$KCADM" update "clients/$CLIENT_ID" -r kal-flow \
  -s "secret=$KEYCLOAK_WEB_CLIENT_SECRET" \
  -s "redirectUris=[\"https://$APP_DOMAIN/api/auth/callback/keycloak\"]" \
  -s "webOrigins=[\"https://$APP_DOMAIN\"]" \
  -s "attributes.\"post.logout.redirect.uris\"=https://$APP_DOMAIN/*"
echo "Kal_flow staging Keycloak client configured."
