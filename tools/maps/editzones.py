"""Edit checkpoints and gameplay zones without rewriting unrelated TMX bytes."""
import hashlib
import json
import os
import re
import stat
import sys
import tempfile
import xml.etree.ElementTree as ET
from xml.parsers import expat


def fail(message, status=400):
    error = ValueError(message)
    error.status = status
    raise error


def scan(filename):
    original = os.stat(filename, follow_symlinks=False)
    if not stat.S_ISREG(original.st_mode):
        fail('Use a regular Tiled source file.')
    parser = expat.ParserCreate()
    stack, objects, groups = [], [], {}
    current, prop, map_end, map_start = None, None, None, None
    dimensions, ids = {}, set()
    max_layer = 0
    next_object = 1
    digest = hashlib.sha256()

    def start(tag, attrs):
        nonlocal current, prop, map_start, max_layer, next_object
        if tag == 'map':
            dimensions.update({k: int(attrs.get(k, 16)) for k in ['width', 'height', 'tilewidth', 'tileheight']})
            map_start = parser.CurrentByteIndex
            next_object = int(attrs.get('nextobjectid', 1))
        if tag == 'object':
            if attrs.get('id') in ids or not str(attrs.get('id', '')).isdigit():
                fail('Each map object needs a unique numeric ID. Repair IDs in Tiled first.')
            ids.add(attrs['id'])
        if tag in ['objectgroup', 'layer', 'group', 'imagelayer']:
            max_layer = max(max_layer, int(attrs.get('id', 0)))
        if len(stack) == 1 and tag == 'objectgroup' and attrs.get('name') in ['checkpoints', 'triggers', 'pvpzones', 'music', 'eventBoards']:
            name = attrs['name']
            if any(float(attrs.get(key, 0)) for key in ['offsetx', 'offsety', 'x', 'y']):
                fail('Reset offsets on gameplay object layers in Tiled before editing.')
            if name in groups:
                fail('Merge duplicate ' + name + ' object layers in Tiled first.')
            groups[name] = {'start': parser.CurrentByteIndex, 'end': None}
        if len(stack) == 2 and stack[-1][0] == 'objectgroup' and stack[-1][1] in groups and tag == 'object':
            current = {'id': attrs['id'], 'kind': {'checkpoints':'checkpoint','triggers':'trigger','pvpzones':'pvp','music':'music','eventBoards':'eventboard'}[stack[-1][1]],
                       'name': attrs.get('name', ''), 'objectType': (attrs.get('type') or attrs.get('class', '')), 'shape': 'rectangle', 'properties': {},
                       'start': parser.CurrentByteIndex, 'rotation': float(attrs.get('rotation', 0)),
                       **{k: float(attrs.get(k, 0)) for k in ['x', 'y', 'width', 'height']}}
            if 'gid' in attrs:
                current['shape'] = 'unsupported'
        if current is not None:
            if tag == 'point':
                current['shape'] = 'point'
            if tag == 'ellipse':
                current['shape'] = 'ellipse'
            if tag == 'polygon':
                current.update(shape='polygon', points=attrs.get('points', ''))
            if tag in ['polyline', 'text']:
                current['shape'] = 'unsupported'
            if tag == 'property':
                prop = {'name': attrs.get('name', ''), 'value': attrs.get('value'), 'text': ''}
        stack.append((tag, attrs.get('name')))

    def end(tag):
        nonlocal current, prop, map_end
        if tag == 'property' and prop is not None:
            current['properties'][prop['name']] = prop['value'] if prop['value'] is not None else prop['text']
            prop = None
        if tag == 'object' and current is not None:
            current['end'] = parser.CurrentByteIndex
            objects.append(current)
            current = None
        if len(stack) == 2 and tag == 'objectgroup' and stack[-1][1] in groups:
            groups[stack[-1][1]]['end'] = parser.CurrentByteIndex
        if tag == 'map':
            map_end = parser.CurrentByteIndex
        stack.pop()

    def text(value):
        if prop is not None:
            prop['text'] += value

    parser.StartElementHandler, parser.EndElementHandler, parser.CharacterDataHandler = start, end, text
    parser.StartDoctypeDeclHandler = lambda *args: fail('Tiled sources with DTD declarations are not supported.')
    parser.ExternalEntityRefHandler = lambda *args: fail('External XML entities are not supported.')
    with open(filename, 'rb') as source:
        while True:
            chunk = source.read(262144)
            digest.update(chunk)
            parser.Parse(chunk, not chunk)
            if not chunk:
                break
        for row in objects:
            source.seek(row['end'])
            closing = source.read(32)
            if re.match(rb'</object(?=[\s>])', closing):
                row['end'] += closing.index(b'>') + 1
    return {'objects': objects, 'dimensions': dimensions, 'revision': digest.hexdigest(), 'nextObjectId': max([next_object]+[int(i)+1 for i in ids])}, original, groups, ids, max_layer, map_start, map_end


def edit(filename, payload, result, original, groups, ids, max_layer, map_start, map_end, plan=None):
    if payload.get('revision') != result['revision']:
        fail('This map changed in another tab or in Tiled. Reload checkpoints and gameplay zones before saving.', 409)
    data, operation = payload.get('object', {}), payload['operation']
    existing = next((r for r in result['objects'] if r['id'] == str(payload.get('objectId'))), None)
    if operation != 'add' and existing is None:
        fail('This zone object no longer exists. Reload checkpoints and gameplay zones.', 404)
    with open(filename, 'rb') as source:
        source.seek(map_start)
        header = source.read(65536)
        map_open = header.split(b'>', 1)[0] + b'>'
        newline = '\r\n' if b'\r\n' in header else '\n'
        if map_open.endswith(b'/>'):
            fail('Add a map layer in Tiled before placing checkpoints and gameplay zones in this empty source.')
        if existing:
            source.seek(existing['start'])
            fragment = source.read(existing['end'] - existing['start'])
            if len(fragment) > 262144:
                fail('This object is too large to edit in the Toolbox.')
            element = ET.fromstring(fragment, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
        else:
            next_id = re.search(rb'\bnextobjectid="(\d+)"', map_open)
            object_id = max(max([int(i) for i in ids] + [0]) + 1, int(next_id[1]) if next_id else 1)
            if plan is not None:
                object_id = plan.next_object
                plan.next_object += 1
            element = ET.Element('object', id=str(object_id))
    patches = []
    if operation == 'remove':
        patches.append((existing['start'], existing['end'], b''))
    else:
        for key in ['name', 'x', 'y', 'width', 'height']:
            element.set(key, str(data[key]))
        properties = element.find('properties')
        if properties is None and data['properties']:
            properties = ET.Element('properties')
            element.insert(0, properties)
        for name, value in data['properties'].items():
            # The server sends only editable properties; unknown source properties survive.
            matches = [p for p in properties if p.tag == 'property' and p.get('name') == name] if properties is not None else []
            if value is None:
                for p in matches:
                    properties.remove(p)
                continue
            prop = matches[0] if matches else ET.SubElement(properties, 'property')
            for duplicate in matches[1:]:
                properties.remove(duplicate)
            prop.attrib.clear()
            prop.set('name', name)
            prop.set('value', str(value))
            prop.text = None
        ET.indent(element, space=' ', level=2)
        replacement = ET.tostring(element, encoding='utf-8').replace(b'\n', newline.encode())
        if existing:
            patches.append((existing['start'], existing['end'], replacement))
        else:
            group_name = {'checkpoint':'checkpoints','trigger':'triggers','pvp':'pvpzones','music':'music','eventboard':'eventBoards'}[data['kind']]
            if plan is not None:
                plan.insert(group_name, replacement)
            else:
                group = groups.get(group_name)
                if group:
                    with open(filename, 'rb') as source:
                        source.seek(group['end'])
                        is_closing = source.read(2) == b'</'
                    if is_closing:
                        patches.append((group['end'], group['end'], b' ' + replacement + newline.encode() + b' '))
                    else:
                        # Expand a self-closing object layer without altering its attributes.
                        patches.append((group['end'] - 2, group['end'], b'>' + newline.encode() + b'  ' + replacement + newline.encode() + b' </objectgroup>'))
                else:
                    next_layer = re.search(rb'\bnextlayerid="(\d+)"', map_open)
                    layer_id = max(max_layer + 1, int(next_layer[1]) if next_layer else 1)
                    opening = (' <objectgroup id="' + str(layer_id) + '" name="' + group_name + '">' + newline + '  ').encode()
                    patches.append((map_end, map_end, opening + replacement + (newline + ' </objectgroup>' + newline).encode()))
                updated_open = map_open
                for key, value in [('nextobjectid', int(element.get('id')) + 1), ('nextlayerid', max_layer + 1 if group else layer_id + 1)]:
                    expression = rb'\b' + key.encode() + rb'="(\d+)"'
                    match = re.search(expression, updated_open)
                    value = max(value, int(match[1]) if match else 0)
                    if match:
                        updated_open = re.sub(expression, (key + '="' + str(value) + '"').encode(), updated_open)
                    else:
                        updated_open = updated_open[:-1] + (' ' + key + '="' + str(value) + '">').encode()
                patches.append((map_start, map_start + len(map_open), updated_open))
    if plan is not None:
        plan.patches.extend(patches)
        return
    descriptor, temporary = tempfile.mkstemp(prefix='.mapmaker-zones-', dir=os.path.dirname(filename))
    try:
        with os.fdopen(descriptor, 'wb') as destination, open(filename, 'rb') as source:
            os.fchmod(destination.fileno(), stat.S_IMODE(original.st_mode))
            digest = hashlib.sha256()
            def copy_until(end=None):
                while end is None or source.tell() < end:
                    chunk = source.read(262144 if end is None else min(262144, end - source.tell()))
                    if not chunk:
                        break
                    digest.update(chunk)
                    destination.write(chunk)
            for start, end, replacement in sorted(patches):
                copy_until(start)
                digest.update(source.read(end - start))
                destination.write(replacement)
            copy_until()
            destination.flush()
            os.fsync(destination.fileno())
        current = os.stat(filename, follow_symlinks=False)
        if digest.hexdigest() != result['revision'] or (original.st_mtime_ns, original.st_size, original.st_ino) != (current.st_mtime_ns, current.st_size, current.st_ino):
            fail('The map changed before saving. Reload checkpoints and gameplay zones and try again.', 409)
        os.replace(temporary, filename)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    filename, payload = sys.argv[1], json.load(sys.stdin)
    result, original, groups, ids, max_layer, map_start, map_end = scan(filename)
    if payload.get('operations') is not None:
        sys.dont_write_bytecode = True
        from batchobjects import edit_batch
        edit_batch(sys.modules[__name__], filename, payload, (result, original, groups, ids, max_layer, map_start, map_end))
        result = scan(filename)[0]
    elif payload.get('operation'):
        edit(filename, payload, result, original, groups, ids, max_layer, map_start, map_end)
        result = scan(filename)[0]
    for row in result['objects']:
        row.pop('start', None)
        row.pop('end', None)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'error': str(error), 'status': getattr(error, 'status', 400)}))
        sys.exit(1)
