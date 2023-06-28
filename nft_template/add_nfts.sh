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
    url=$LOOPWORMS_LOOPERLANDS_BASE_URL/AddNewLooper/mergedLooper.php?NFTID=$nftID
    curl -s -X POST -H "X-Api-Key: $LOOPWORMS_API_KEY" $url
}

BRANCH_NAME=bot_add_nfts_`date +"%Y_%m_%dT%H_%M_%S"`

function add_nft() {
    nftID=$1
    type=$2
    looperName=$3
    project_name=$4
    long_nftid=$5
    echo "Adding " $nftID $type $looperName $project_name $long_nftid
    # Prepare the tmp directory to add the NFT spritesheet to git
    rm -rf /tmp/$nftID
    mkdir /tmp/$nftID
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/1/$nftID.png /tmp/$nftID/1.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/2/$nftID.png /tmp/$nftID/2.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/3/$nftID.png /tmp/$nftID/3.png
    ./add_nft.sh /tmp/$nftID $nftID $type || {
        echo "exiting due to add_nft.sh error"
        exit 1
    }
    git add ..
    git commit -m "added $looperName, $nftID, $type, $BRANCH_NAME"
    # add the NFT to the loopworms platform
    /root/add_looplands_nft.sh "$long_nftid" "$project_name" "$type"
    rm sqlscript.sql
    # add the picker
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/profilepic/$nftID.png /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
    chown loopw4130 /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
    chgrp loopw4130 /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
    # update the status so it's not added again
    updateStatus $nftID
    rm -rf /tmp/$nftID
}

nftsToAddURL=$LOOPWORMS_LOOPERLANDS_BASE_URL/AddNewLooper/AddLooperDaily.php
nftsToAddJSON=$(curl -s $nftsToAddURL)
if [ "$nftsToAddJSON" = "null" ]; then
    echo "No NFTs to add"
    exit 1
fi

# prepare the git repo
git clean . -f
git checkout .
git checkout main
git pull
git checkout -b $BRANCH_NAME

#loop through each nft and add it
echo $nftsToAddJSON | jq -r '.[] | {short_nftid, asset_type, looper_name, project_name, long_nftid} | join(",")' | while IFS=, read short_nftid asset_type looper_name project_name long_nftid; do
    add_nft "$short_nftid" "$asset_type" "$looper_name" "$project_name" "$long_nftid"
done

git push --set-upstream origin $BRANCH_NAME