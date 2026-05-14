# syntax=docker/dockerfile:1.7

FROM node:22-bookworm@sha256:379c51ac7bbf9bffe16769cfda3eb027d59d9c66ac314383da3fcf71b46d026c

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NODE_ENV=development
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_MAXSOCKETS=6

WORKDIR /opt/app

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts --no-audit --fund=false --loglevel=error

COPY bin ./bin
COPY client ./client
COPY server ./server
COPY shared ./shared

RUN mkdir -p /opt/app/client/js \
    && cp shared/js/gametypes.js client/js/gametypes.js

WORKDIR /opt/app/bin
RUN ./build.sh

WORKDIR /opt/app

EXPOSE 443
EXPOSE 8000
EXPOSE 9229

CMD ["node", "server/js/main.js"]
