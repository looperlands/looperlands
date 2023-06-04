#!/bin/bash
today=`date --iso-8601`
logFile=/home/looperlands/logs/$today
cd looperlands
./deploy/build.sh && nohup ./deploy/run.sh >> $logFile 2>&1 &
