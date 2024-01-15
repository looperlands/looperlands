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
    operation=$6
    chain=$7
    echo "Adding " $nftID $type $looperName $project_name $long_nftid
    # Prepare the tmp directory to add the NFT spritesheet to git
    rm -rf /tmp/$nftID
    mkdir /tmp/$nftID
    
    # copy the spritesheet to the tmp directory
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/1/$nftID.png /tmp/$nftID/1.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/2/$nftID.png /tmp/$nftID/2.png
    cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/3/$nftID.png /tmp/$nftID/3.png


    if [ "$type" = "weapon" ] || [ "$type" = "fishingrod" ]; then
        cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/4/$nftID.png /tmp/$nftID/item-1.png
        cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/5/$nftID.png /tmp/$nftID/item-2.png
        cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/6/$nftID.png /tmp/$nftID/item-3.png
    fi

    if [ "$operation" = "add" ]; then
        ./add_nft.sh /tmp/$nftID $nftID $type || {
            echo "returning due to add_nft.sh error: $nfID $type"
            return 1
        }
    elif [ "$operation" = "update" ]; then
        ./update_nft.sh /tmp/$nftID $nftID $type || {
            echo "returning due to update_nft.sh error: $nfID $type"
            return 1
        }
    else
        echo "Unknown operation $operation for $nftID"
        return 1
    fi

    git add ..
    git commit -m "$operation $looperName, $nftID, $type, $BRANCH_NAME"
    if [ "$operation" = "add" ]; then
        # add the NFT to the loopworms platform
        echo "adding nft"
        /root/add_looplands_nft.sh "$long_nftid" "$project_name" "$type" "$chain"
        rm sqlscript.sql
    fi
    
    # add the picker for avatars
    if [ "$type" = "armor" ]; then
        echo "Adding avatar picker"
        cp /home/loopworms.io/public_html/DEV/LooperLands/AddNewLooper/images/profilepic/$nftID.png /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
        chown loopw4130 /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
        chgrp loopw4130 /home/loopworms.io/public_html/DEV/LooperLands/img/$nftID.png
    fi
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
echo $nftsToAddJSON | jq -r '.[] | {short_nftid, asset_type, looper_name, project_name, long_nftid, operation, chain} | join(",")' | while IFS=, read short_nftid asset_type looper_name project_name long_nftid operation chain; do
    add_nft "$short_nftid" "$asset_type" "$looper_name" "$project_name" "$long_nftid" "$operation" "$chain"
done

git push --set-upstream origin $BRANCH_NAME
git checkout main
git merge $BRANCH_NAME
git push