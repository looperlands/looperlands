
sessionId=`curl -X POST -H "Content-Type: application/json" -H "x-api-key: 123" -d '{"walletId": "0xd26053b502ce7865106c421d22532ba5d5567783", "nftId" : "0x3c1fa300af2deef916ade14eb6ca68dd14913e4adc4a4d174ea98f1f878ef733"}' http://127.0.0.1:8000/session`
open http://127.0.0.1:8000/?sessionId=$sessionId
