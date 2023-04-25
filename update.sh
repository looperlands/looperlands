#!/bin/bash
# this is meant to update the prod server
cd loopquest
git pull
./config_manager.py configs/prod_config.json && docker build . -t loopquest