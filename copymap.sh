#!/bin/bash
CONTAINER_ID=$1
LOOPERLANDS_GIT_REPO=$2
if [ -z "$CONTAINER_ID" ]
  then
    echo "Missing CONTAINER_ID argument"
    exit 1
fi

if [ -z "$LOOPERLANDS_GIT_REPO" ]
  then
    echo "Missing LOOPERLANDS_GIT_REPO argument"
    exit 1
fi

echo $CONTAINER_ID, $LOOPERLANDS_GIT_REPO
docker cp $CONTAINER_ID:/opt/app/ $LOOPERLANDS_GIT_REPO/..