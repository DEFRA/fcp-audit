#!/usr/bin/env sh

# Starts the service behind a Squid proxy (see compose.proxy.yml) and waits for it to become healthy.
# Passes only if the service starts, which requires the Entra JWKS lookup to succeed through the proxy.

PROJECT=fcp-audit-test
COMPOSE="docker compose -p ${PROJECT} -f compose.yml -f compose.test.yml -f compose.proxy.yml"

# Always tear down the stack, whatever the outcome
trap '${COMPOSE} down -v' EXIT

${COMPOSE} down -v

if ${COMPOSE} up --build --wait --wait-timeout 120 fcp-audit; then
  echo "Service started and is healthy behind the proxy"
else
  echo "Service failed to become healthy behind the proxy, logs follow:"
  ${COMPOSE} logs fcp-audit
  exit 1
fi
