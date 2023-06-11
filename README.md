## LooperLands
Steps to run locally
1) ./config_manager.py configs/dev_config.json && docker build . -t blah && docker run -t -i -p 8000:8000 -t blah

NFT Image scales for armor: https://imgur.com/a/2WQ9ZOt
NFT Image scales for sprite: https://imgur.com/a/jNT3dFh
NFT Image scales for weapon: https://imgur.com/a/sKIRgha


# Create session
1) Create a session with a POST
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: <api-key-here>" -d '{"walletId": "0xd26053b502ce7865106c421d22532ba5d5567783", "nftId" : "0xc762bf80c40453b66f5eb91a99a5a84731c3cc83e1bcadaa9c62e2e59e19e4f6"}' http://127.0.0.1:8000/session
```
2) Navigate to http://127.0.0.1:8000/?sessionId=<sessionIdFromStep1>

# Set XP Multiplier
The following endpoint multiplies the experience gained by multiplier for duration.
Post to /setxpmultiplier with the following body:
```json
{
    "multiplier": y,
    "duration": x
}
```
Where Y is an integer, and X is seconds.
The following example will double the experience for 60 seconds after posting to the endpoint:
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d "{\"multiplier\": 2, \"duration\":60}" http://127.0.0.1:8000/setxpmultiplier
```
# Local development
The following script will build the client and server and run them locally, so you do not have to run the above steps.
```bash
LOOPWORMS_API_KEY=<api-key-here> ./run-local.sh
```
To kill it, press Ctrl+C.

To get a new session run:
```bash
LOOPWORMS_API_KEY=<api-key-here> ./local-session.sh
```
This will print out a URL and open up the URL in your browser

