# Dockerfile for the matrix test runner container
# Used by docker-compose.matrix.yml to test patcher compatibility
# across different package versions.

FROM node:20-slim

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the monorepo workspace structure needed for resolution
COPY package.json tsconfig.json ./
COPY packages/api/package.json packages/api/
COPY packages/api/tsconfig.cjs.json packages/api/
COPY packages/api/tests/matrix/ packages/api/tests/matrix/

# Install base dependencies
RUN npm install --ignore-scripts 2>/dev/null || true

# The entrypoint will be overridden by run-matrix.sh
CMD ["echo", "Use run-matrix.sh to execute matrix tests"]
