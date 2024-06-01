if [ -z "$LOOPWORMS_API_KEY" ]
  then
    export LOOPWORMS_API_KEY=placeholder
fi
if [ $# -ne 5 ]; then
    echo "Usage: $0 <walletId> <nftId> <mapId> <checkpointId> <xp>"
    exit 1
fi
walletId=$1
nftId=$2
mapId=$3
checkpointId=$4
xp=$5
echo $walletId $nftId $mapId $checkpointId
sessionId=`curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d "{\"walletId\": \"$walletId\", \"nftId\" : \"$nftId\", \"title\": \"Title 🏛️\", \"xp\":$xp, \"mapId\": \"$mapId\", \"checkpointId\": \"$checkpointId\", \"f2p\": false, \"trait\": \"tank\"}" http://127.0.0.1:8000/session | jq -r '.sessionId'`
IP=${LOCAL_IP:-127.0.0.1}
url=http://$IP:8000/?sessionId=$sessionId
echo Navigate to the following URL to start playing: $url
open $url || "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" $url
