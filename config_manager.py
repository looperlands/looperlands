#!/usr/bin/python3
import json
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('central_config', help='Path to central config JSON file')
args = parser.parse_args()

# Read in source JSON from disk
with open(args.central_config, 'r') as f:
    source = json.load(f)

# Read in target1 JSON from disk
with open('configs/config_build.json', 'r') as f:
    target1 = json.load(f)

# Read in target2 JSON from disk
with open('server/config.json', 'r') as f:
    target2 = json.load(f)

# Update Target JSON 1
for key in source:
    if key in target1:
        target1[key] = source[key]

# Update Target JSON 2
for key in source:
    if key in target2:
        target2[key] = source[key]

# Write updated Target JSON 1 to disk
with open('configs/config_build.json', 'w') as f:
    print(target1)
    json.dump(target1, f, indent=4)

# Write updated Target JSON 2 to disk
with open('server/config.json', 'w') as f:
    print(target2)
    json.dump(target2, f, indent=4)