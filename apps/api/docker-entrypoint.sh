#!/bin/sh
# Applies pending migrations, then hands PID 1 to the API.
#
# This lives in a script rather than a platform start-command because Render
# splits `dockerCommand` on whitespace without honouring quotes, so an inline
# `sh -c "a && b"` reaches the container as a broken argv and exits 127.
set -e

./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

# Run from the workspace path so Node can resolve apps/api/node_modules before
# the root tree — see the layout note in the Dockerfile.
exec node apps/api/dist/main.js
