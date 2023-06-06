FROM ubuntu:latest
EXPOSE 443
EXPOSE 8000
ENV DEBIAN_FRONTEND noninteractive
RUN apt -y update
RUN apt -q -y install curl vim
RUN apt-get update -yq \
    && apt-get install curl gnupg -yq \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash \
    && apt-get install nodejs -yq

COPY . /opt/app
WORKDIR /opt/app
COPY shared/js/gametypes.js client/js/gametypes.js
RUN npm install
RUN mkdir -p client/config
COPY configs/config_build.json client/config
WORKDIR /opt/app/bin
RUN ./build.sh
WORKDIR /opt/app
CMD node server/js/main.js