const fs=require('fs'),vm=require('vm');
let Painter;
vm.runInNewContext(fs.readFileSync(__dirname+'/spritesheetpainter.mjs','utf8').replace('export class','class')+'\nPainter=SpriteSheetPainter;', {Map,Math,console,get Painter(){return Painter;},set Painter(value){Painter=value;}});
const sprite={image:'/img/map-fx/custom-'+ 'a'.repeat(32)+'.png',frameWidth:32,frameHeight:48,columns:4,frames:6,fps:10};
test('custom frames crop in row order with a bottom-center origin and crisp scaling',async()=>{
    const image={width:128,height:96},load=jest.fn(async()=>image),painter=new Painter(load),ctx={drawImage:jest.fn()};
    expect(painter.draw(ctx,sprite,450,100,100,2)).toBe(false);await Promise.resolve();
    expect(painter.draw(ctx,sprite,450,100,100,2)).toBe(true);
    expect(ctx.drawImage).toHaveBeenCalledWith(image,0,48,32,48,68,4,64,96);expect(ctx.imageSmoothingEnabled).toBe(false);
    painter.draw(ctx,sprite,9999,100,100,2);expect(ctx.drawImage.mock.calls.at(-1)[1]).toBe(32);expect(load).toHaveBeenCalledTimes(1);
});
test('failed sheet loads do not throw during gameplay or fetch again every frame',async()=>{
    const warn=jest.spyOn(console,'warn').mockImplementation(()=>{}),load=jest.fn(async()=>{throw new Error('missing');}),painter=new Painter(load),ctx={drawImage:jest.fn()};
    try{painter.draw(ctx,sprite,0,0,0,1);await Promise.resolve();await Promise.resolve();expect(painter.draw(ctx,sprite,0,0,0,1)).toBe(false);expect(ctx.drawImage).not.toHaveBeenCalled();expect(load).toHaveBeenCalledTimes(1);}finally{warn.mockRestore();}
});
