FROM ubuntu:latest
ENV NEW_RELIC_NO_CONFIG_FILE=true
EXPOSE 443
EXPOSE 8000
ENV DEBIAN_FRONTEND noninteractive
RUN apt -y update
RUN apt -q -y install curl
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v20.9.0
RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH
ENV NODE_ENV development
RUN apt-get update -yq \
    && apt-get install build-essential -yq
WORKDIR /opt/app
COPY ./package*.json /opt/app
RUN npm ci
COPY . /opt/app
RUN mkdir -p /opt/app/client/js
COPY shared/js/gametypes.js /opt/app/client/js/gametypes.js
WORKDIR /opt/app/bin
RUN ./build.sh
WORKDIR /opt/app
CMD node server/js/main.js