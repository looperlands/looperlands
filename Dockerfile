FROM ubuntu:latest
EXPOSE 8000
ENV DEBIAN_FRONTEND noninteractive
RUN apt -y update
RUN apt -q -y install nodejs npm
RUN apt -q -y install curl vim
COPY . /opt/app
WORKDIR /opt/app
COPY configs/config_build.json client/config
WORKDIR /opt/app/bin
RUN ./build.sh
WORKDIR /opt/app
CMD node server/js/main.js