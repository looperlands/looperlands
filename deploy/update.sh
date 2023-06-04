#!/bin/bash
cd looperlands
./deploy/build.sh && nohup ./deploy/run.sh >> /home/looperlands/logs/$today 2>&1
