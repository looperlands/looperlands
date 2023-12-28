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
RUN apt-get update -yq \
    && apt-get install curl gnupg python2 -yq \
    && apt-get install python3 -yq
COPY . /opt/app
WORKDIR /opt/app
COPY shared/js/gametypes.js client/js/gametypes.js
RUN npm ci
RUN mkdir -p client/config
COPY configs/config_build.json client/config
WORKDIR /opt/app/bin
RUN ./build.sh
WORKDIR /opt/app
CMD node server/js/main.js