FROM ubuntu:latest
EXPOSE 443
EXPOSE 8000
ENV DEBIAN_FRONTEND noninteractive
RUN apt -y update
RUN apt -q -y install curl vim
RUN apt-get update -yq \
    && apt-get install curl gnupg python2 -yq \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash \
    && apt-get install nodejs -yq
RUN curl https://bootstrap.pypa.io/pip/2.7/get-pip.py --output get-pip.py
RUN python2 get-pip.py
RUN python2 -m pip install lxml

COPY . /opt/app
WORKDIR /opt/app
COPY shared/js/gametypes.js client/js/gametypes.js
RUN npm install
WORKDIR /opt/app/tools/maps
RUN python2 ./export.py server && python2 ./export.py client
WORKDIR /opt/app
RUN mkdir -p client/config
COPY configs/config_build.json client/config
WORKDIR /opt/app/bin
RUN ./build.sh
WORKDIR /opt/app
CMD node server/js/main.js