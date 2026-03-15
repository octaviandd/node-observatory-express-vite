# Dockerfile for end-to-end patcher verification.
# Runs the with-express server with real Observatory (MySQL + Redis),
# then verifies entries land in MySQL with correct data shapes.

FROM node:20-slim

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./

# Copy the packages needed (api, express adapter, with-express example)
COPY packages/api/package.json packages/api/
COPY packages/api/tsconfig.json packages/api/
COPY packages/api/tsconfig.cjs.json packages/api/
COPY packages/api/tsconfig.esm.json packages/api/
COPY packages/api/types.d.ts packages/api/
COPY packages/api/src/ packages/api/src/
COPY packages/api/tests/patcher-tests/ packages/api/tests/patcher-tests/

COPY packages/express/package.json packages/express/
COPY packages/express/tsconfig.json packages/express/
COPY packages/express/src/ packages/express/src/

COPY packages/examples/with-express/package.json packages/examples/with-express/
COPY packages/examples/with-express/tsconfig.json packages/examples/with-express/
COPY packages/examples/with-express/index.ts packages/examples/with-express/
COPY packages/examples/with-express/routes/ packages/examples/with-express/routes/
COPY packages/examples/with-express/.env packages/examples/with-express/

# We do NOT copy packages/ui — not needed for patcher tests.
# Create a stub so workspace resolution doesn't fail.
RUN mkdir -p packages/ui/dist/assets && \
  echo '{"name":"@node-observatory/ui","version":"0.0.0","private":true}' > packages/ui/package.json && \
  echo '<html><body>stub</body></html>' > packages/ui/dist/index.html

# Install all workspace dependencies
RUN npm install --legacy-peer-deps 2>&1 || true

# Build the API and Express adapter so they're importable
RUN cd packages/api && npm run build 2>&1 || true
RUN cd packages/express && npm run build 2>&1 || true

WORKDIR /app/packages/examples/with-express

CMD ["echo", "Use run-patcher-tests.sh to execute tests"]
