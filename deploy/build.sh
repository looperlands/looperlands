#!/bin/bash
cd looperlands
git checkout .
git pull
./config_manager.py configs/loopworms_config.json
docker build . -t looperlands