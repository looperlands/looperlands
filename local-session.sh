
sessionId=`curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d '{"walletId": "0x19fd9cf679440b980691735b4f95014964774f37", "nftId" : "0x17222e7f16e5fb69bbc410f8c093cf92904ab8d2e4681a6bc9dee01900d8e6b7"}' http://127.0.0.1:8000/session | jq -r '.sessionId'`
url=http://127.0.0.1:8000/?sessionId=$sessionId
echo Navigate to the following URL to start playing: $url
open $url

