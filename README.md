## Loopworm Quest
Steps to run locally
1) ./config_manager.py configs/dev_config.json && docker build . -t blah && docker run -t -i -p 8000:8000 -t blah
Make sure to not commit dev changes

NFT Image scales: https://imgur.com/a/2WQ9ZOt

## Docker
Build and run the server
```bash
docker build -f Dockerfile.server . -t server && docker run -p 8000:8000 -t server
```
Build and run the client
```bash
docker build -f Dockerfile.client . -t client && docker run -p 8080:8080 -t client
```

# Create session
1) ```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: <api-key-here>" -d '{"walletId": "0xd26053b502ce7865106c421d22532ba5d5567783", "nftId" : "0xc762bf80c40453b66f5eb91a99a5a84731c3cc83e1bcadaa9c62e2e59e19e4f6"}' http://127.0.0.1:8000/session
```
2) Navigate to http://127.0.0.1:8000/?sessionId=<sessionIdFromStep1>


Kill all
```bash
docker kill $(docker ps -q)
```

LoopQuest [updated & with Socket.IO]
============

![alt tag](https://raw.github.com/nenuadrian/LoopQuest/master/screens/1.png)

Changes
============
  * Updated backend and frontend to use Socket.IO server and Client
  * Main changes were made to ws.js and gameclient.js.
  * Updated dependencies such as requirejs and jQuery to their latest versions
  * Fixed build script
  * Created a mini-dispatcher on the server side that provides the IP and Port in the configs as the ones for the game server.
  * Added a demo to http://LoopQuest.codevolution.com
  * A few minor edits to server side handling

TODO
============
  * Quest system and more awesome features
 


This is my take on Mozilla's amazing multiplayer open source game.

I've yet to find any other game that's so well done from graphics, implementation and features point of view (did I mention open source, multiplayer and browser based?).

![alt tag](https://raw.github.com/nenuadrian/LoopQuest/master/screens/2.png)

I've wanted to use the game for a while and found many of its dependencies to be deprecated and even obsolete.

I've just taken the time to understand the code and thank you guys for making it so well structured.

![alt tag](https://raw.github.com/nenuadrian/LoopQuest/master/screens/3.png)

This now works on the latest Socket.IO. Everything should work just as in the original developers intended.

Enjoy this amazing open source browser based role playing multiplayer 2D game!

And a big thank you to the original developers is in order! THANK YOU!

HOW TO RUN?
============

```
npm install
node server/js/main.js
```

Then go inside the Client folder and open index.html.

You might want to host a webserver and open index.html in that (e.g. 127.0.0.1/index.html).

Also read the original README files you'll find inside the Client and Server folders to learn the basics of configuring (it's preconfigured right now).


Original README
============
LoopQuest is a HTML5/JavaScript multiplayer game experiment.


Documentation
-------------

Documentation is located in client and server directories.


License
-------

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.


Credits
-------
Created by [Little Workshop](http://www.littleworkshop.fr):

* Franck Lecollinet - [@whatthefranck](http://twitter.com/whatthefranck)
* Guillaume Lecollinet - [@glecollinet](http://twitter.com/glecollinet)
