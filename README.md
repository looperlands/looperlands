## LooperLands

# Local development
Install some dependencies.
```bash
sudo apt-get install jq
sudo apt-get install docker-compose
```

Build a map
```bash
./build_maps.sh main.tmx
```

The following script will build the client and server and run them locally, so you do not have to run the above steps.
```bash
./run-local.sh
```
To kill it, press Ctrl+C.

To get a new session run:
```bash
./local-session.sh
```
This will print out a URL and open up the URL in your browser

## Using docker-compose watch
Docker compose watch automatically will rebuild the gameserver when you make local changes.
In one terminal run:
```bash
docker-compose -f docker-compose-local.yml watch
```
In another, run the following to view logs:
```bash
docker-compose -f docker-compose-local.yml logs -f
```



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

# Announcement
The gameserver accepts announcements per map. Not including `maps` will send to all maps. Not including `timeToShow` seconds will display the announcement until the user clicks exit. 
```
 curl -X POST http://localhost:8000/announce      -H "Content-Type: application/json"      -d '{"message": "Server maintenance will start at 8 PM.", "maps" : ["taikotown"], "timeToShow": 5}' -H "x-api-key: placeholder"
```

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