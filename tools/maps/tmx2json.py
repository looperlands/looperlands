#!/usr/bin/python3
import sys
from lxml import etree
import json
import shutil
import tempfile
from contextlib import ExitStack


def attributes(el):
    return {key: int(value) if value.isdigit() else value for key, value in el.attrib.items()}

def process(el, tagname):
    # Normalize Tiled CSV layers to the exporter's tile list.
    if el.tag == 'data' and el.get('encoding') == 'csv':
        data = {'tile': [{'gid': int(gid.strip())} for gid in el.text.split(',') if gid.strip()]}
        return {'data': data} if tagname else data
    attrs = attributes(el)
    
    children = list(el)
    
    if len(children) > 1:
        sibs = {}
        for c in children:
            if c.tag not in sibs:
                sibs[c.tag] = []
            sibs[c.tag].append(process(c, False))
        for k in sibs.keys():
            attrs.update({k: sibs[k]})
    else:
        for c in children:
            attrs.update(process(c, True))
    
    if tagname:
        return {el.tag: attrs}
    else:
        return attrs

def convert(source, destination):
    # A large TMX contains millions of tile nodes. Keep one direct map child
    # in memory, spool each tag's values, and preserve the legacy JSON shape
    # (a single child is an object; multiple children are grouped into lists).
    with ExitStack() as files:
        tmx = files.enter_context(open(source, 'rb'))
        groups, root, depth, count = {}, None, 0, 0
        for event, element in etree.iterparse(tmx, events=('start', 'end')):
            if event == 'start':
                depth += 1
                if root is None:
                    root = element
                continue
            if depth == 2:
                if element.tag not in groups:
                    groups[element.tag] = files.enter_context(tempfile.TemporaryFile(mode='w+', encoding='utf-8'))
                bucket = groups[element.tag]
                if bucket.tell():
                    bucket.write(', ')
                bucket.write(json.dumps(process(element, False)))
                count += 1
                root.remove(element)
                element.clear()
            depth -= 1

        dest = files.enter_context(open(destination, 'w', encoding='utf-8'))
        dest.write('{' + json.dumps(root.tag) + ': {')
        fields = [(key, value) for key, value in attributes(root).items() if key not in groups]
        for index, (key, value) in enumerate(fields):
            if index:
                dest.write(', ')
            dest.write(json.dumps(key) + ': ' + json.dumps(value))
        for index, (tag, bucket) in enumerate(groups.items()):
            if fields or index:
                dest.write(', ')
            dest.write(json.dumps(tag) + ': ' + ('[' if count > 1 else ''))
            bucket.seek(0)
            shutil.copyfileobj(bucket, dest)
            if count > 1:
                dest.write(']')
        dest.write('}}')


if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2])
    print("Finished converting TMX to JSON.")
