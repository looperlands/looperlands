"""Plan object edits against one revision and publish one atomic TMX replacement."""
import hashlib
import os
import re
import stat
import tempfile
from editentities import fail, set_counter


class Plan:
    def __init__(self, filename, context):
        self.filename = filename
        self.result, self.original, self.groups, self.ids, max_layer, self.map_start, self.map_end = context
        self.patches, self.additions = [], {}
        with open(filename, 'rb') as source:
            source.seek(self.map_start)
            self.opening = source.read(65536).split(b'>', 1)[0] + b'>'
        self.newline = b'\r\n' if b'\r\n' in self.opening else b'\n'
        # The opening tag itself often contains no newline.
        with open(filename, 'rb') as source:
            self.newline = b'\r\n' if b'\r\n' in source.read(16384) else b'\n'
        def counter(name):
            match = re.search(rb'\b' + name.encode() + rb'=[\"\x27](\d+)[\"\x27]', self.opening)
            return int(match[1]) if match else 1
        self.next_object = max([counter('nextobjectid')] + [int(value) + 1 for value in self.ids])
        self.original_next_object = self.next_object
        self.next_layer = max(counter('nextlayerid'), max_layer + 1)

    def insert(self, name, replacement):
        self.additions.setdefault(name, []).append(replacement)

    def finish(self):
        missing = []
        for name, rows in self.additions.items():
            content = (self.newline + b'  ').join(rows)
            group = self.groups.get(name)
            if group:
                with open(self.filename, 'rb') as source:
                    source.seek(group['end'])
                    closing = source.read(2) == b'</'
                if closing:
                    self.patches.append((group['end'], group['end'], b' ' + content + self.newline + b' '))
                else:
                    self.patches.append((group['end'] - 2, group['end'], b'>' + self.newline + b'  ' + content + self.newline + b' </objectgroup>'))
            else:
                opening = (' <objectgroup id="' + str(self.next_layer) + '" name="' + name + '">').encode()
                self.next_layer += 1
                missing.append(opening + self.newline + b'  ' + content + self.newline + b' </objectgroup>' + self.newline)
        if missing:
            self.patches.append((self.map_end, self.map_end, b''.join(missing)))
        if self.additions or self.next_object != self.original_next_object:
            opening = set_counter(set_counter(self.opening, 'nextobjectid', self.next_object), 'nextlayerid', self.next_layer)
            self.patches.append((self.map_start, self.map_start + len(self.opening), opening))
        descriptor, temporary = tempfile.mkstemp(prefix='.mapmaker-batch-', dir=os.path.dirname(self.filename))
        try:
            with os.fdopen(descriptor, 'wb') as destination, open(self.filename, 'rb') as source:
                os.fchmod(destination.fileno(), stat.S_IMODE(self.original.st_mode))
                digest = hashlib.sha256()
                def copy_until(end=None):
                    while end is None or source.tell() < end:
                        chunk = source.read(262144 if end is None else min(262144, end - source.tell()))
                        if not chunk:
                            break
                        digest.update(chunk)
                        destination.write(chunk)
                for start, end, replacement in sorted(self.patches):
                    if source.tell() > start:
                        fail('Map changes overlap. Reload the map before saving.', 409)
                    copy_until(start)
                    digest.update(source.read(end - start))
                    destination.write(replacement)
                copy_until()
                destination.flush()
                os.fsync(destination.fileno())
            current = os.stat(self.filename, follow_symlinks=False)
            if digest.hexdigest() != self.result['revision'] or (self.original.st_mtime_ns, self.original.st_size, self.original.st_ino) != (current.st_mtime_ns, current.st_size, current.st_ino):
                fail('The map changed before saving. Keep the draft and reload the map.', 409)
            os.replace(temporary, self.filename)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def edit_batch(module, filename, payload, context):
    if payload.get('revision') != context[0]['revision']:
        fail('This map changed in Tiled or another tab. Reload before saving.', 409)
    operations = payload.get('operations')
    if not isinstance(operations, list) or not 0 < len(operations) <= 500:
        fail('Save between 1 and 500 map changes together.')
    plan, changed = Plan(filename, context), set()
    minimum = payload.get('minimumObjectId', 1)
    if type(minimum) is not int or not 1 <= minimum <= 1000000000:
        fail('Invalid next object ID.')
    plan.next_object = max(plan.next_object, minimum)
    for operation in operations:
        if operation.get('operation') not in ['add', 'update', 'remove']:
            fail('Choose supported map changes.')
        if operation['operation'] != 'add':
            object_id = str(operation.get('objectId'))
            if object_id in changed:
                fail('Each object may be changed once per batch.')
            changed.add(object_id)
        module.edit(filename, {**operation, 'revision': payload['revision']}, *context, plan=plan)
    plan.finish()
