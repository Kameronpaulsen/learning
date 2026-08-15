#!/bin/bash

set -e

docker run --rm -v "$PWD":/app -w /app node:20-bookworm-slim npm "$@"
