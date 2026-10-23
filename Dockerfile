FROM node:24.22.1-bookworm-slim
ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NODE_ENV=development
EXPOSE 8000 8010 9229
RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential python3 python3-lxml git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/app
COPY ./package.json ./package-lock.json /opt/app/
RUN npm ci
COPY . /opt/app
RUN mkdir -p /opt/app/client/js
COPY shared/js/gametypes.js /opt/app/client/js/gametypes.js
WORKDIR /opt/app/bin
RUN sed -i 's/\r$//' ./build.sh && bash ./build.sh
WORKDIR /opt/app
CMD ["node", "server/js/main.js"]
