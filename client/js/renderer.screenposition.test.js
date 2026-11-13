const fs=require('fs'),vm=require('vm');
test('projects world positions through camera, render scale, CSS scaling and canvas offset',()=>{
    let Renderer;
    const sandbox={define:(_deps,factory)=>{Renderer=factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'),'utf8'),sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./renderer'),'utf8'),sandbox);
    const renderer=Object.assign(Object.create(Renderer.prototype),{
        scale:3,camera:{x:48,y:16},canvas:{width:960,height:480,getBoundingClientRect:()=>({left:100,top:50,width:480,height:240})}
    });
    expect(renderer.getScreenPosition(80,64)).toEqual({x:148,y:122});
    expect(renderer.getScreenPosition(48,16)).toEqual({x:100,y:50});
});
