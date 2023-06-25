#!/bin/bash

if [ -z "$LOOPWORMS_API_KEY" ]
  then
    echo "Missing LOOPWORMS_API_KEY environment variable"
    exit 1
fi

if [ -z "$LOOPWORMS_LOOPERLANDS_BASE_URL" ]
  then
    echo "Missing LOOPWORMS_LOOPERLANDS_BASE_URL environment variable"
    exit 1
fi

function updateStatus() {
    nftID=$1
    status=$2
    curl -s -X POST -H "x-api-key: $LOOPWORMS_API_KEY" -H "Content-Type: application/json" -d "{\"nftID\": \"$nftID\", \"status\": \"$status\"}" $LOOPWORMS_LOOPERLANDS_BASE_URL/AddNewLooper/UpdateStatus.php
}

function add_nft() {
    nftID=$1
    type=$2
    looperName=$3
    echo $nftID $type
    rm -rf /tmp/$nftID
    mkdir /tmp/$nftID
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/1/$nftID.png /tmp/$nftID/1.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/2/$nftID.png /tmp/$nftID/2.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/3/$nftID.png /tmp/$nftID/3.png
    ./add_nft.sh /tmp/$nftID $nftID $type || {
        updateStatus $nftID "error"
        echo "exiting due to add_nft.sh error"
        exit 1
    }
    git add .
    git commit -m "added $looperName, $nftID, $type"
    git push
    updateStatus $nftID "added"
    rm -rf /tmp/$nftID
}

nftsToAddURL=$LOOPWORMS_LOOPERLANDS_BASE_URL/AddNewLooper/AddLooperDaily.php
nftsToAddJSON=$(curl -s $nftsToAddURL)
if [ "$nftsToAddJSON" = "null" ]; then
    echo "No NFTs to add"
    exit 1
fi

git checkout main
git pull
branchName=add_nfts_`date +"%Y_%m_%dT%H_%M_%S%z"`
git checkout -b $branchName
echo $nftsToAddJSON | jq -r '.[] | {short_nftid, asset_type, looper_name} | join(" ")' | while read -r line; do
    add_nft $line
done
