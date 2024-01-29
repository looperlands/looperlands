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
# Activate/deactivate trigger
The following endpoint activates/deactivates triggers (for example event doors).
Post to /activateTrigger or /deactivateTrigger with the following body:
```json
{
    "triggerId": "triggerId",
    "mapId": "mapId" // mapId is optional = defaults to main!
}
```
The following example will activate the doors with triggerId = Fight Night:
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d "{\"triggerId\": \"Fight Night\"}" http://127.0.0.1:8000/activateTrigger
```
# Local development
Install some dependencies.
```bash
sudo apt-get install unzip zip jq
```

Build a map
```bash
./build_maps.sh main.tmx
```

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


# Add a mob

* Add each scale image to client/img/n
* Create a sprite.json under client/sprites for the mob with the same name as the scale image. Make sure the ID inside the JSON matches
* Add sprite.json (with the correct name) to sprites.js
* Add the new id to game.js array `this.spriteNames`
* Add new mob entity to gametypes.js
* Add a new mob class in mobs.js
* Add the new entity factory in entityfactory.js
* Add the new mob to properties.js
* Add the mob to mobset_oa.png. Reopen tiled and note the id.
* Add the mob to the .tmx file noting the id in tiled. 

# Performance profiling
This is useful to determine bottle necks.
1) Edit the Docker file to have this command (note the --prof):
```Dockerfile
CMD node --prof server/js/main.js
```
2) Run the game server
3) `docker ps` to find its id
4) `docker exec -it <id> /bin/bash` where id from step 3. Then run `ls` in the terminal to find the .log file
5) `docker cp <id>:/opt/app/isolate<find real path from step 4>.log ~/isolate.log` to copy the .log file from the container to your host
6) Process the `.log` file to human readable (make sure node version is modern): 
```bash 
node --prof-process isolate.log > isolate.out
```
7) Read your version of `isolate.out`