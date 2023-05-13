
sessionId=`curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d '{"walletId": "0x6fc60be0cce2730b78ad29d732d823866c07baa0", "nftId" : "0x38278eacc7d1c86fdbc85d798dca146fbca59a2e5e567dc15898ce2edac21f5f"}' http://127.0.0.1:8000/session | jq -r '.sessionId'`
url=http://127.0.0.1:8000/?sessionId=$sessionId
echo Navigate to the following URL to start playing: $url
open $url

