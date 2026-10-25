const fs = require('fs');
const vm = require('vm');

test('client scene lookup preserves authored overlap priority even when IDs are numeric', () => {
    let definition;
    const context = vm.createContext({Class:{extend:value=>value},define:(_,factory)=>{definition=factory();}});
    vm.runInContext(fs.readFileSync(require.resolve('./lib/underscore.min.js'),'utf8'),context);
    vm.runInContext(fs.readFileSync(require.resolve('./map'),'utf8'),context);
    const broad={id:1,contains:()=>true},clearing={id:99,contains:()=>true};
    const map=Object.assign(Object.create(definition),{scenes:{1:broad,99:clearing},sceneOrder:[clearing,broad]});
    expect(map.getCurrentScene({x:2,y:2})).toBe(clearing);
    map.sceneOrder=[broad,clearing];expect(map.getCurrentScene({x:2,y:2})).toBe(broad);
    map.sceneOrder=[];expect(map.getCurrentScene({})).toBeUndefined();
});
