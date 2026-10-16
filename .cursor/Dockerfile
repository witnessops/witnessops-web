# Cloud agent base image for witnessops-web.
# Node matches deploy/app/Dockerfile (22.23.2). pnpm matches packageManager (9.15.4).
# Checksum is the official nodejs.org SHASUMS256.txt entry for this tarball.
# Cursor checks the repository out separately; do not COPY the repo into this image.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    COREPACK_HOME=/opt/corepack
ARG NODE_VERSION=22.23.2
ARG NODE_SHA256=d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307
ARG PNPM_VERSION=9.15.4

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        python3 \
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

USER ubuntu
WORKDIR /workspace
