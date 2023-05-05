#!/bin/bash
cd tools/maps
./export.py server && ./export.py client
cd ../..
docker build . -t blah && docker run -e LOOPWORMS_API_KEY=$LOOPWORMS_API_KEY -t -i -p 8000:8000 -t blah