# Cloud agent base image for witnessops-web.
# Local check uses Podman: podman build -f .cursor/Dockerfile .cursor
# Node matches deploy/app/Dockerfile (22.23.2). pnpm matches packageManager (9.15.4).
# python3-venv is required by packages/wops-cli installer tests inside pnpm health.
# Checksum is the official nodejs.org SHASUMS256.txt entry for this tarball.
# Cursor checks the repository out separately; do not COPY the repo into this image.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    COREPACK_HOME=/opt/corepack \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
ARG NODE_VERSION=22.23.2
ARG NODE_SHA256=d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307
ARG PNPM_VERSION=9.15.4

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        python3 \
        python3-pip \
        python3-venv \
        build-essential \
        xz-utils \
        sudo \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
    && rm /tmp/node.tar.xz \
    && mkdir -p /opt/corepack \
    && corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate \
    && chown -R ubuntu:ubuntu /opt/corepack \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu \
    && chmod 440 /etc/sudoers.d/ubuntu \
    && node -v \
    && pnpm -v

# uv on the default PATH. UV_UNMANAGED_INSTALL avoids a shell-rc install.
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_UNMANAGED_INSTALL=/usr/local/bin sh \
    && uv --version

# Playwright 1.59.1 matches pnpm-lock.yaml (@playwright/test@1.59.1 and
# playwright@1.59.1). Chromium and WebKit are the CI browser projects.
# System libraries are installed here so install.sh only checks the cache.
RUN npx --yes playwright@1.59.1 install --with-deps chromium webkit \
    && chmod -R a+rX /opt/ms-playwright \
    && chown -R ubuntu:ubuntu /opt/ms-playwright \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu
WORKDIR /workspace
