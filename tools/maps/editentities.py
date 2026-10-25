"""Patch Toolbox point placements while preserving all other TMX bytes."""
import base64
import hashlib
import json
import os
import re
import stat
import struct
import sys
import tempfile
import xml.etree.ElementTree as ET
import zlib
from xml.parsers import expat


def fail(message, status=400):
    error = ValueError(message)
    error.status = status
    raise error


def scan(filename, observer=None):
    original = os.stat(filename, follow_symlinks=False)
    if not stat.S_ISREG(original.st_mode) or original.st_size > 512 * 1024 * 1024:
        fail('Use a regular Tiled source smaller than 512 MB.')
    parser = expat.ParserCreate()
    stack, attributes, ids, kinds, legacy = [], {}, set(), {}, []
    group_start, group_end, map_end, map_start = None, None, None, None
    max_object, max_layer, tile_id, first_gid = 0, 0, None, 0
    entity_data, entity_index, encoded, encoding, compression = False, 0, [], None, None
    digest = hashlib.sha256()

    def start(tag, attrs):
        nonlocal group_start, map_start, max_object, max_layer, tile_id, first_gid
        nonlocal entity_data, entity_index, encoded, encoding, compression
        if observer is not None and tag not in ['tile', 'data']:
            observer.start(tag, attrs, stack)
        if not stack and tag == 'map':
            attributes.update(attrs)
            map_start = parser.CurrentByteIndex
        if len(stack) == 1 and tag == 'objectgroup' and attrs.get('name') == 'mapmaker-entities':
            if group_start is not None:
                fail('Use one mapmaker-entities object layer. Merge duplicate layers in Tiled.')
            group_start = parser.CurrentByteIndex
        if tag == 'object':
            obj_id = attrs.get('id')
            if obj_id is None or obj_id in ids:
                fail('Repair missing or duplicate object IDs in Tiled before editing placements.')
            ids.add(obj_id)
            max_object = max(max_object, int(obj_id))
        if tag in ['layer', 'objectgroup', 'group', 'imagelayer']:
            max_layer = max(max_layer, int(attrs.get('id', '0')))
        if len(stack) == 1 and tag == 'tileset':
            first_gid = int(attrs.get('firstgid', '0')) if attrs.get('name') == 'Mobs' else 0
        if tag == 'tile' and first_gid and stack[-1][0] == 'tileset':
            tile_id = first_gid + int(attrs.get('id', '0'))
        if tag == 'property' and tile_id is not None and attrs.get('name') == 'type':
            kinds[tile_id] = attrs.get('value', '')
        if tag == 'data' and len(stack) == 2 and stack[-1] == ('layer', 'entities'):
            entity_data, entity_index, encoded = True, 0, []
            encoding, compression = attrs.get('encoding'), attrs.get('compression')
        if entity_data and tag == 'tile':
            gid = int(attrs.get('gid', '0'))
            if gid:
                legacy.append((entity_index, gid))
            entity_index += 1
        stack.append((tag, attrs.get('name')))

    def end(tag):
        nonlocal group_end, map_end, tile_id, first_gid, entity_data
        if observer is not None and tag not in ['tile', 'data']:
            observer.end(tag)
        stack.pop()
        if len(stack) == 1 and tag == 'objectgroup' and group_start is not None and group_end is None:
            group_end = parser.CurrentByteIndex
        if tag == 'tileset':
            first_gid = 0
        if tag == 'tile' and first_gid:
            tile_id = None
        if entity_data and tag == 'data':
            text = ''.join(encoded)
            if encoding == 'csv':
                gids = [int(v.strip()) for v in text.split(',') if v.strip()]
            elif encoding == 'base64':
                packed = base64.b64decode(text)
                limit = int(attributes['width']) * int(attributes['height']) * 4
                if compression in ['zlib', 'gzip']:
                    decoder = zlib.decompressobj(31 if compression == 'gzip' else 15)
                    packed = decoder.decompress(packed, limit + 1)
                elif compression:
                    fail('Save the entities layer as CSV in Tiled before placing entities.')
                if len(packed) > limit or len(packed) % 4:
                    fail('The entities layer has invalid dimensions.')
                gids = struct.unpack('<' + 'I' * (len(packed) // 4), packed)
            elif encoding is None:
                gids = []
            else:
                fail('Save the entities layer as CSV in Tiled before placing entities.')
            legacy.extend((index, gid) for index, gid in enumerate(gids) if gid)
            entity_data = False
        if not stack and tag == 'map':
            map_end = parser.CurrentByteIndex

    def text(value):
        if observer is not None and observer.prop is not None:
            observer.text(value)
        if entity_data and encoding:
            encoded.append(value)

    parser.StartElementHandler, parser.EndElementHandler = start, end
    parser.CharacterDataHandler = text
    parser.StartDoctypeDeclHandler = lambda *args: fail('Tiled sources with DTD declarations are not supported.')
    parser.ExternalEntityRefHandler = lambda *args: fail('External XML entities are not supported.')
    with open(filename, 'rb') as source:
        while True:
            chunk = source.read(262144)
            digest.update(chunk)
            parser.Parse(chunk, not chunk)
            if not chunk:
                break
        if map_start is None:
            fail('Use a finite Tiled map with valid dimensions.')
        source.seek(0)
        opening = source.read(map_start + 16384)
        opening_end = opening.find(b'>', map_start) + 1
        if opening_end < 1:
            fail('The map opening element is too large.')
        opening = opening[:opening_end]
        root = ET.Element('map', attributes)
        root.set('nextobjectid', str(max(int(root.get('nextobjectid', '1')), max_object + 1)))
        root.set('nextlayerid', str(max(int(root.get('nextlayerid', '1')), max_layer + 1)))
        dimensions = {key: int(root.get(key, '0')) for key in ['width', 'height', 'tilewidth', 'tileheight']}
        if any(v < 1 for v in dimensions.values()) or dimensions['width'] * dimensions['height'] > 2000000 or root.get('infinite', '0') != '0':
            fail('Use a finite Tiled map with valid dimensions and at most 2 million tiles.')
        group, placements = None, []
        if group_start is not None:
            if group_end is None or group_end - group_start > 2 * 1024 * 1024:
                fail('The mapmaker-entities layer is too large to edit in the Toolbox.')
            source.seek(group_end)
            closing = source.read(32)
            if closing.startswith(b'</objectgroup'):
                group_end += closing.index(b'>') + 1
            source.seek(group_start)
            fragment = source.read(group_end - group_start)
            group = ET.fromstring(fragment, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
            root.append(group)
            if any(float(group.get(k, '0')) != 0 for k in ['offsetx', 'offsety', 'x', 'y']):
                fail('Remove offsets from mapmaker-entities in Tiled before placing entities.')
            for obj in group.findall('object'):
                if obj.get('gid') or any(obj.find(k) is not None for k in ['polygon', 'polyline', 'ellipse', 'text']):
                    fail('Use point objects in mapmaker-entities.')
                placements.append({'id': obj.get('id'), 'kind': obj.get('name', ''),
                                   'x': int(float(obj.get('x', '0')) // dimensions['tilewidth']),
                                   'y': int(float(obj.get('y', '0')) // dimensions['tileheight'])})
    current = os.stat(filename, follow_symlinks=False)
    if (original.st_mtime_ns, original.st_size, original.st_ino) != (current.st_mtime_ns, current.st_size, current.st_ino):
        fail('The map changed while reading. Refresh the map and try again.', 409)
    result = {'revision': digest.hexdigest(), 'dimensions': dimensions, 'placements': placements,
              'legacy': [{'x': i % dimensions['width'], 'y': i // dimensions['width'], 'kind': kinds.get(gid, '')} for i, gid in legacy]}
    return opening, root, group, (group_start, group_end, map_end, opening_end), result, original


def copy_bytes(source, destination, digest, amount=None):
    while amount is None or amount > 0:
        chunk = source.read(262144 if amount is None else min(262144, amount))
        if not chunk:
            break
        destination.write(chunk)
        digest.update(chunk)
        if amount is not None:
            amount -= len(chunk)


def set_counter(opening, key, value):
    pattern = rb'\b' + key.encode() + rb'\s*=\s*([\"\x27])[^\"\x27]*\1'
    replacement = (key + '="' + str(value) + '"').encode()
    if re.search(pattern, opening):
        return re.sub(pattern, replacement, opening)
    return opening[:-1] + b' ' + replacement + b'>'


def edit(filename, payload):
    raw, root, group, offsets, result, original = scan(filename)
    if payload.get('revision') != result['revision']:
        fail('This map changed in another tab or in Tiled. Refresh the map before saving.', 409)
    operations = payload.get('operations', [payload])
    if not isinstance(operations, list) or not 0 < len(operations) <= 500:
        fail('Save between 1 and 500 placement changes together.')
    next_object = max([int(root.get('nextobjectid', '1'))] + [int(obj.get('id')) + 1 for obj in root.iter('object')])
    next_layer = max([int(root.get('nextlayerid', '1'))] + [int(obj.get('id', '0')) + 1 for obj in root if obj.tag in ['layer', 'objectgroup', 'group', 'imagelayer']])
    if group is None:
        group = ET.Element('objectgroup', {'id': str(next_layer), 'name': 'mapmaker-entities'})
        next_layer += 1
    changed, handled = set(), set()
    for change in operations:
        operation, position = change.get('operation'), change.get('position', {})
        if operation not in ['add', 'move', 'remove']:
            fail('Choose a supported placement action.')
        target = None
        if operation != 'add':
            target_id = str(change.get('id'))
            if target_id in handled:
                fail('Each placement may be changed once per batch.')
            handled.add(target_id)
            target = next((obj for obj in group.findall('object') if obj.get('id') == target_id), None)
            if target is None:
                fail('This Toolbox placement no longer exists. Refresh the map.', 404)
        if operation != 'remove':
            x, y, d = position.get('x'), position.get('y'), result['dimensions']
            if payload.get('dimensions') != {key: d[key] for key in ['width', 'height']}:
                fail('Map dimensions changed. Build the map before placing entities.', 409)
            if type(x) is not int or type(y) is not int or not (0 < x < d['width'] and 0 < y < d['height']):
                fail('Choose a playable tile inside the map, after the first row and column.')
        if operation == 'add':
            target = ET.SubElement(group, 'object', {'id': str(next_object), 'name': change['kind']})
            ET.SubElement(target, 'point')
            next_object += 1
        if operation == 'remove':
            group.remove(target)
        else:
            target.set('x', str(x * result['dimensions']['tilewidth']))
            target.set('y', str(y * result['dimensions']['tileheight']))
            changed.add(target.get('id'))
    # Validate final occupancy so two moves may swap places in one transaction.
    occupied = [(p['x'], p['y']) for p in result['legacy']]
    positions = [(obj.get('id'), int(float(obj.get('x', '0')) // result['dimensions']['tilewidth']),
                  int(float(obj.get('y', '0')) // result['dimensions']['tileheight'])) for obj in group.findall('object')]
    occupied.extend((x, y) for _, x, y in positions)
    for object_id, x, y in positions:
        if object_id in changed and occupied.count((x, y)) > 1:
            fail('This tile already contains an entity. Choose an empty tile.')
    ET.indent(group, space=' ', level=1)
    replacement = ET.tostring(group, encoding='utf-8')
    with open(filename, 'rb') as source:
        newline = b'\r\n' if b'\r\n' in source.read(16384) else b'\n'
    replacement = replacement.replace(b'\n', newline)
    start, end, map_end, opening_end = offsets
    if start is None:
        start = end = map_end
        replacement = b' ' + replacement + newline
    opening = set_counter(set_counter(raw[:opening_end], 'nextobjectid', next_object), 'nextlayerid', next_layer)
    descriptor, temporary = tempfile.mkstemp(prefix='.mapmaker-entity-', dir=os.path.dirname(filename))
    digest = hashlib.sha256()
    try:
        with os.fdopen(descriptor, 'wb') as destination:
            os.fchmod(destination.fileno(), stat.S_IMODE(original.st_mode))
            try:
                os.fchown(destination.fileno(), original.st_uid, original.st_gid)
            except (AttributeError, PermissionError):
                pass
            destination.write(opening)
            digest.update(opening)
            with open(filename, 'rb') as source:
                source.seek(opening_end)
                copy_bytes(source, destination, digest, start - opening_end)
                destination.write(replacement)
                digest.update(replacement)
                source.seek(end)
                copy_bytes(source, destination, digest)
            destination.flush()
            os.fsync(destination.fileno())
        current = os.stat(filename, follow_symlinks=False)
        if (original.st_mtime_ns, original.st_size, original.st_ino) != (current.st_mtime_ns, current.st_size, current.st_ino):
            fail('The map changed before saving. Refresh the map and try again.', 409)
        os.replace(temporary, filename)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    result['revision'] = digest.hexdigest()
    result['placements'] = [{'id': obj.get('id'), 'kind': obj.get('name', ''),
                             'x': int(float(obj.get('x', '0')) // result['dimensions']['tilewidth']),
                             'y': int(float(obj.get('y', '0')) // result['dimensions']['tileheight'])}
                            for obj in group.findall('object')]
    return result


if __name__ == '__main__':
    try:
        payload = json.load(sys.stdin)
        result = edit(sys.argv[1], payload) if payload.get('operation') or payload.get('operations') is not None else scan(sys.argv[1])[4]
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({'error': str(error), 'status': getattr(error, 'status', 400)}))
        sys.exit(1)
