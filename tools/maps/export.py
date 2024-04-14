#!/usr/bin/python2
import commands
import sys
import os
from threading import Thread

files = os.listdir('tmx/')
map_files = []
for file in files:
    if file.endswith('.tmx'):
        map_files.append(file)

def export_map(tmx_file):
    SRC_FILE = 'tmx'+'/'+tmx_file
    map_id = tmx_file.replace(".tmx","")
    print(tmx_file  + " is being exported", map_id)

    TEMP_FILE = SRC_FILE+'.json'

    mode = sys.argv[1] if len(sys.argv) > 1 else 'client'
    if mode == 'client':
        DEST_FILE = '../../client/maps/world_client_' + map_id # This will save two files (See exportmap.js)
    else:
        DEST_FILE = '../../server/maps/world_server_' + map_id + '.json'

    print("./tmx2json.py '+SRC_FILE+' '+TEMP_FILE")
    # Convert the Tiled TMX file to a temporary JSON file
    print commands.getoutput('./tmx2json.py '+SRC_FILE+' '+TEMP_FILE)

    # Map exporting
    print('./exportmap.js '+TEMP_FILE+' '+DEST_FILE+' '+mode)
    print commands.getoutput('./exportmap.js '+TEMP_FILE+' '+DEST_FILE+' '+mode)

    # Remove temporary JSON file
    print commands.getoutput('rm '+TEMP_FILE)

    # Send a Growl notification when the export process is complete
    print("Map export complete")

for tmx_file in map_files:
    if sys.argv[2] == tmx_file:
        export_map(tmx_file)
