"""Read Tiled entrances and atomically patch one object without reformatting the map."""
import hashlib
import json
import os
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
    parser = expat.ParserCreate()
    stack, doors, current, prop = [], [], None, None
    dimensions = {}
    digest = hashlib.sha256()
    original = os.stat(filename, follow_symlinks=False)
    if not stat.S_ISREG(original.st_mode):
        fail('The Tiled source must be a regular file.')

    def start(tag, attributes):
        nonlocal current, prop
        if tag == 'map':
            dimensions.update({key: int(attributes.get(key, '16')) for key in ['width', 'height', 'tilewidth', 'tileheight']})
        if tag == 'object' and len(stack) == 2 and stack[-1] == ('objectgroup', 'doors'):
            current = {'id': attributes.get('id'), 'name': attributes.get('name', ''),
                       'type': attributes.get('type', attributes.get('class', 'door')) or 'door',
                       'x': float(attributes.get('x', 0)), 'y': float(attributes.get('y', 0)),
                       'properties': {}, 'start': parser.CurrentByteIndex}
        if tag == 'property' and current is not None and stack[-1][0] == 'properties':
            prop = {'name': attributes.get('name', ''), 'value': attributes.get('value'), 'text': ''}
        stack.append((tag, attributes.get('name')))

    def end(tag):
        nonlocal current, prop
        if tag == 'property' and prop is not None:
            current['properties'][prop['name']] = prop['value'] if prop['value'] is not None else prop['text']
            prop = None
        if tag == 'object' and current is not None:
            current['end'] = parser.CurrentByteIndex
            doors.append(current)
            current = None
        stack.pop()

    def text(value):
        if prop is not None:
            prop['text'] += value

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
        for door in doors:
            source.seek(door['end'])
            closing = source.read(32)
            if closing.startswith(b'</object'):
                door['end'] += closing.index(b'>') + 1
    current_stat = os.stat(filename, follow_symlinks=False)
    if (original.st_mtime_ns, original.st_size, original.st_ino) != (current_stat.st_mtime_ns, current_stat.st_size, current_stat.st_ino):
        fail('The map changed while reading it. Reload entrances and try again.', 409)
    ids = [door['id'] for door in doors]
    if None in ids or len(set(ids)) != len(ids):
        fail('Each entrance needs a unique Tiled object ID. Repair duplicate or missing IDs in Tiled.')
    return {'doors': doors, 'dimensions': dimensions, 'revision': digest.hexdigest()}, original


def copy_bytes(source, destination, digest, amount=None):
    while amount is None or amount > 0:
        chunk = source.read(262144 if amount is None else min(262144, amount))
        if not chunk:
            break
        destination.write(chunk)
        digest.update(chunk)
        if amount is not None:
            amount -= len(chunk)


def edit(filename, payload, result, original):
    if payload.get('revision') != result['revision']:
        fail('This map changed in another tab or in Tiled. Reload entrances before saving.', 409)
    door = next((door for door in result['doors'] if door['id'] == str(payload.get('doorId'))), None)
    if door is None:
        fail('This entrance was not found. Reload entrances.', 404)
    if door['end'] - door['start'] > 262144:
        fail('This entrance object is too large to edit in the Toolbox.')
    with open(filename, 'rb') as source:
        source.seek(door['start'])
        fragment = source.read(door['end'] - door['start'])
        source.seek(max(0, door['start'] - 256))
        prefix = source.read(min(256, door['start'])).split(b'\n')[-1]
    element = ET.fromstring(fragment, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
    properties = element.find('properties')
    if properties is None:
        properties = ET.Element('properties')
        element.insert(0, properties)
    for name, value in payload['changes'].items():
        matches = [child for child in properties if child.tag == 'property' and child.get('name') == name]
        if value is None:
            for child in matches:
                properties.remove(child)
            door['properties'].pop(name, None)
            continue
        prop = matches[0] if matches else ET.SubElement(properties, 'property')
        for duplicate in matches[1:]:
            properties.remove(duplicate)
        prop.attrib.clear()
        prop.set('name', name)
        if name in ['level', 'weapon_level']:
            prop.set('type', 'int')
        prop.set('value', str(value))
        prop.text = None
        door['properties'][name] = str(value)
    ET.indent(element, space=' ', level=len(prefix) if prefix.strip() == b'' else 2)
    replacement = ET.tostring(element, encoding='utf-8', short_empty_elements=True)
    if b'\r\n' in fragment:
        replacement = replacement.replace(b'\n', b'\r\n')
    if replacement == fragment:
        return
    descriptor, temporary = tempfile.mkstemp(prefix='.mapmaker-door-', dir=os.path.dirname(filename))
    try:
        digest = hashlib.sha256()
        with os.fdopen(descriptor, 'wb') as destination, open(filename, 'rb') as source:
            os.fchmod(destination.fileno(), stat.S_IMODE(original.st_mode))
            try:
                os.fchown(destination.fileno(), original.st_uid, original.st_gid)
            except (AttributeError, PermissionError):
                pass
            copy_bytes(source, destination, digest, door['start'])
            destination.write(replacement)
            digest.update(replacement)
            source.seek(door['end'])
            copy_bytes(source, destination, digest)
            destination.flush()
            os.fsync(destination.fileno())
        current = os.stat(filename, follow_symlinks=False)
        if (original.st_mtime_ns, original.st_size, original.st_ino) != (current.st_mtime_ns, current.st_size, current.st_ino):
            fail('The map changed before saving. Reload entrances and try again.', 409)
        os.replace(temporary, filename)
        result['revision'] = digest.hexdigest()
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    filename = sys.argv[1]
    payload = json.load(sys.stdin)
    result, original = scan(filename)
    if payload.get('action') == 'save':
        edit(filename, payload, result, original)
    for door in result['doors']:
        door.pop('start', None)
        door.pop('end', None)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'error': str(error), 'status': getattr(error, 'status', 400)}))
        sys.exit(1)
