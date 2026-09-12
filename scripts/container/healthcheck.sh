#!/usr/bin/env bash

set -Eeuo pipefail

node -e '
  fetch("http://127.0.0.1:3008/api/health")
    .then((response) => {
      if (!response.ok) {
        process.exit(1);
      }
    })
    .catch(() => process.exit(1));
'
