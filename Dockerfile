FROM oven/bun:1.4.5-alpine@sha256:da816670775f4c2b4e990b6b1847cf5540dcdc721a42033dd331ce7a88ba6a3b AS bun-runtime

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS test-deps
COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY app/package.json app/bun.lock ./
# Unit tests do not need Electron downloads or native module lifecycle scripts.
RUN bun install --frozen-lockfile --ignore-scripts
COPY app/ ./

FROM test-deps AS test
# Dependency integrity tests serve their fixture registry on loopback only.
RUN --network=none mkdir /report && bun run lint && bun run typecheck && \
    bun test tests --reporter=junit --reporter-outfile=/report/junit.xml && bun run build

FROM scratch AS test-report
COPY --from=test /report /

FROM nginx:1.31.9-alpine@sha256:fb4658584bd9a916ffb6f6e365f97c25cfdb2923801f551ea08356e695f14ff7
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY landing/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
