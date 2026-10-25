"""Read every Toolbox object collection during one TMX scan. Saves retain their editors."""
import json
import sys
from editentities import scan, fail


class Objects:
    def __init__(self):
        self.rows = {'doors': [], 'lighting': [], 'encounters': [], 'fishing': [], 'zones': []}
        self.next_object = 1
        self.groups, self.current, self.prop, self.collection = set(), None, None, None

    def start(self, tag, attrs, stack):
        group = stack[-1][1] if stack else None
        if tag == 'map':
            self.next_object = max(self.next_object, int(attrs.get('nextobjectid', 1)))
        if tag == 'object':
            self.next_object = max(self.next_object, int(attrs.get('id', 0)) + 1)
        if len(stack) == 1 and tag == 'objectgroup' and attrs.get('name') in ['lights', 'shadows', 'chests', 'roaming', 'chestareas', 'fishing', 'checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards']:
            name = attrs['name']
            if name in ['fishing', 'checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards'] and any(float(attrs.get(key, 0)) for key in ['offsetx', 'offsety', 'x', 'y']):
                fail('Reset offsets on gameplay object layers in Tiled before editing.')
            if name in self.groups:
                fail('Merge duplicate ' + name + ' object layers in Tiled first.')
            self.groups.add(name)
        if len(stack) == 2 and tag == 'object' and stack[-1][0] == 'objectgroup':
            if group == 'doors':
                self.collection = 'doors'
                self.current = {'id': attrs.get('id'), 'name': attrs.get('name', ''),
                                'type': attrs.get('type', attrs.get('class', 'door')) or 'door',
                                'x': float(attrs.get('x', 0)), 'y': float(attrs.get('y', 0)), 'properties': {}}
            elif group in ['lights', 'shadows', 'chests', 'roaming', 'chestareas', 'fishing', 'checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards']:
                self.collection = 'zones' if group in ['checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards'] else 'fishing' if group == 'fishing' else 'lighting' if group in ['lights', 'shadows'] else 'encounters'
                kinds = {'lights': 'light', 'shadows': 'shadow', 'chests': 'chest', 'roaming': 'encounter', 'chestareas': 'reward', 'fishing':'fishing','checkpoints':'checkpoint','triggers':'trigger','pvpzones':'pvp','music':'music','eventBoards':'eventboard'}
                self.current = {'id': attrs['id'], 'kind': kinds[group], 'name': attrs.get('name', ''),
                                'shape': 'unsupported' if 'gid' in attrs else 'rectangle', 'properties': {},
                                'rotation': float(attrs.get('rotation', 0)),
                                **{key: float(attrs.get(key, 0)) for key in ['x', 'y', 'width', 'height']}}
                if self.collection == 'zones':
                    self.current['objectType'] = (attrs.get('type') or attrs.get('class', ''))
                if self.collection == 'encounters':
                    self.current['mob'] = attrs.get('type', attrs.get('class', ''))
        if self.current is None:
            return
        if self.collection != 'doors':
            if tag == 'ellipse':
                self.current['shape'] = 'ellipse'
            elif tag == 'polygon':
                self.current.update(shape='polygon', points=attrs.get('points', ''))
            elif tag == 'point':
                self.current['shape'] = 'point' if self.collection == 'encounters' else 'unsupported'
            elif tag in ['polyline', 'text']:
                self.current['shape'] = 'unsupported'
        if tag == 'property' and (self.collection != 'doors' or stack[-1][0] == 'properties'):
            self.prop = {'name': attrs.get('name', ''), 'value': attrs.get('value'), 'text': ''}

    def end(self, tag):
        if tag == 'property' and self.prop is not None:
            self.current['properties'][self.prop['name']] = self.prop['value'] if self.prop['value'] is not None else self.prop['text']
            self.prop = None
        if tag == 'object' and self.current is not None:
            self.rows[self.collection].append(self.current)
            self.current, self.collection = None, None

    def text(self, value):
        self.prop['text'] += value


if __name__ == '__main__':
    try:
        objects = Objects()
        entities = scan(sys.argv[1], objects)[4]
        common = {key: entities[key] for key in ['revision', 'dimensions']}
        print(json.dumps({'entities': entities, 'doors': {**common, 'doors': objects.rows['doors']},
                          'lighting': {**common, 'objects': objects.rows['lighting']},
                          'encounters': {**common, 'objects': objects.rows['encounters']},
                          'fishing': {**common, 'objects': objects.rows['fishing']},
                          'zones': {**common, 'objects': objects.rows['zones'], 'nextObjectId': objects.next_object}}))
    except Exception as error:
        print(json.dumps({'error': str(error), 'status': getattr(error, 'status', 400)}))
        sys.exit(1)
