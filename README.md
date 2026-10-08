## LooperLands

## Event toolkit documentation

- [Organizer and player guide](docs/event-toolkit-guide.md): templates, scoring, teams, rentals, prizes and announcements.
- [Shareable PDF](docs/event-toolkit-guide.pdf).
- [Game tracking and catalog reference](docs/event-tracking.md).

To rebuild the PDF, install the optional documentation dependency `reportlab` and run `python3 tools/docs/build_event_toolkit_guide.py`. The output is written to `output/pdf/looperlands-event-toolkit-guide.pdf`; copy the reviewed PDF to `docs/event-toolkit-guide.pdf` when updating the guide.

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

# Deployment reboot notices

The `deploy` GitHub Actions workflow announces the reboot to every running
game-server Docker Compose container in the production project on the configured SSH
host(s), waits 60 seconds, then restarts the `looperlands` service. Each container
receives the announcement on all its maps through its local `/announce` endpoint,
using its own `LOOPWORMS_API_KEY`. No additional GitHub secret is needed.

To explain a deployment, open **Actions → deploy → Run workflow**, select `main`,
and enter `reboot_reason`, for example `Fixing combat lag and improving chat.`
The announcement always includes the restart countdown and asks players to
reconnect afterwards. `reboot_notice_seconds` lets you change the warning period
from 1 to 600 seconds. Reasons are rendered as plain text.

For automatic deployments on pushes to `main`, set the repository Actions variable
`GAME_SERVER_REBOOT_REASON` to customize the reason. Without a custom reason,
players see `We are deploying a game update.` Manual reasons override the variable;
blank manual reasons use the variable or the default. Push deployments always use
the 60-second warning period.

Announcements run only after the image has built and pushed successfully. If any
container rejects the announcement, or no running game-server container is found,
the workflow fails before restarting. Deployments are serialized so a later push
does not cancel a reboot that players have already been warned about.
The notice runs after the existing chat-storage checks and image pull, while
the deployment lock is held. The existing checks for persistent chat storage
also run after the restart. The SSH user uses the existing Docker permissions;
no extra sudo permissions are required. Containers must include Node.js with
`fetch` support (the production image uses Node.js 20).

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