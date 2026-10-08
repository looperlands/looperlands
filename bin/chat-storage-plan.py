#!/usr/bin/env python3
"""Validate the Compose rollout and print only service/volume metadata."""
import copy
import json
import sys

CHAT_DIRECTORY = '/opt/app/data/chat'
SERVICES = ('gameserver', 'gameserver2')


def storage_plan(current, proposed):
    old = copy.deepcopy(current)
    new = copy.deepcopy(proposed)
    plan = []
    for service in SERVICES:
        before = old['services'][service]
        after = new['services'][service]
        mounts = [volume for volume in after.get('volumes', []) if volume.get('target') == CHAT_DIRECTORY]
        if len(mounts) != 1 or mounts[0].get('type') != 'volume' or mounts[0].get('read_only', False):
            raise ValueError('Each game service needs one writable named chat volume')
        alias = mounts[0]['source']
        definition = new['volumes'][alias]
        if definition.get('driver', 'local') != 'local' or definition.get('driver_opts') or definition.get('external'):
            raise ValueError('Chat migration requires ordinary local volumes')
        name = definition['name']
        if not name or any(character.isspace() for character in name + alias):
            raise ValueError('Invalid volume name')
        for config in (before, after):
            volumes = config.get('volumes', [])
            volumes = [volume for volume in volumes if volume.get('target') != CHAT_DIRECTORY]
            if volumes:
                config['volumes'] = volumes
            else:
                config.pop('volumes', None)
        for config in (old, new):
            config.get('volumes', {}).pop(alias, None)
            if not config.get('volumes'):
                config.pop('volumes', None)
        plan.append((service, alias, name))
    if len({entry[2] for entry in plan}) != len(plan):
        raise ValueError('Game services must not share a chat volume')
    if old != new:
        raise ValueError('Production Compose differs beyond the chat mounts; deployment stopped before downtime')
    return plan


if __name__ == '__main__':
    try:
        with open(sys.argv[1], encoding='utf-8') as source:
            current = json.load(source)
        with open(sys.argv[2], encoding='utf-8') as source:
            proposed = json.load(source)
        for entry in storage_plan(current, proposed):
            print('\t'.join(entry))
    except (KeyError, ValueError, IndexError, OSError):
        # Rendered Compose may contain credentials; never include its contents in logs.
        sys.exit('Chat storage preflight failed: invalid or incompatible Compose configuration')
