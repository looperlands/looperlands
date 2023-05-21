#!/bin/bash
nftId=$1
ipfsID=`curl "https://eth-mainnet.alchemyapi.io/v2/6E2ie2YFOni8eq-uwgTRZFAXYyd1KfSD/getNFTMetadata?contractAddress=0xB25f6D711aEbf954fb0265A3b29F7b9Beba7E55d&tokenId=$nftId&tokenType=erc1155" | jq -r ".metadata.image"  | cut -d "/" -f 3`
curl https://nftstorage.link/ipfs/$ipfsID -L > $nftId.png