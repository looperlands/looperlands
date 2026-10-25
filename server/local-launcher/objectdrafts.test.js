const Drafts = require('./objectdrafts');
test('multiple additions and edits remain independent until one save', () => {
    const source = [{id:'7',x:1,y:1},{id:'8',x:2,y:2}], draft = new Drafts(source);
    const a = draft.add({x:3,y:3}), b = draft.add({x:4,y:4});
    draft.set({...draft.rows[0],x:5});draft.remove('8');
    expect(draft.count).toBe(4);expect(a.id).not.toBe(b.id);
    expect(source).toEqual([{id:'7',x:1,y:1},{id:'8',x:2,y:2}]);
    const changes=draft.changes();expect(changes.map(row=>row.operation)).toEqual(['add','add','update','remove']);
    changes[0].object.x=999;expect(draft.rows.find(row=>row.id===a.id).x).toBe(3);
});
test('removing an unsaved addition cancels it; reverting a saved object removes its pending edit', () => {
    const draft = new Drafts([{id:'7',x:1}]), row = draft.add({x:2});draft.remove(row.id);
    draft.set({id:'7',x:3});draft.set({id:'7',x:1});
    expect(draft.count).toBe(0);expect(draft.changes()).toEqual([]);
});
