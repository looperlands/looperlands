const fs=require('fs'),vm=require('vm');
global.Types={};const Types=require('../../shared/js/gametypes'),Checkpoint=require('./checkpoint'),Utils=require('./utils');
afterEach(()=>jest.restoreAllMocks());
test('legacy checkpoints skip blocked spawn tiles and report empty areas instead of spawning into walls',()=>{
    jest.spyOn(Utils,'randomInt').mockReturnValue(0);const checkpoint=new Checkpoint(1,2,3,2,1,(x,y)=>x===3&&y===3);expect(checkpoint.getRandomPosition()).toEqual({x:3,y:3});expect(checkpoint.contains(2,3)).toBe(true);expect(checkpoint.contains(4,3)).toBe(false);expect(()=>new Checkpoint(2,2,3,1,1,()=>false).getRandomPosition()).toThrow(/no walkable spawn/);
});
test('fractional legacy bounds select only whole tiles inside the checkpoint', () => {
    const random = jest.spyOn(Utils, 'randomInt');
    const checkpoint = new Checkpoint(8, 2.25, 3.75, 2.25, 1.5);
    const positions = [];
    for (let index = 0; index < 4; index++) {
        random.mockReturnValue(index);
        const position = checkpoint.getRandomPosition();
        expect(checkpoint.contains(position.x, position.y)).toBe(true);
        positions.push(position);
    }
    expect(positions).toEqual([{x: 3, y: 4}, {x: 4, y: 4}, {x: 3, y: 5}, {x: 4, y: 5}]);
    expect(random).toHaveBeenLastCalledWith(0, 3);
    expect(() => new Checkpoint(9, 2.1, 3, 0.2, 1).getRandomPosition()).toThrow(/no spawn tiles/);
});
test('a checkpoint visit is accepted only while the living player is inside its bounds',()=>{
    const source=fs.readFileSync(require.resolve('./player'),'utf8'),start=source.indexOf('        else if (action === Types.Messages.CHECK)'),end=source.indexOf(' else if (action === Types.Messages.TRIGGER)',start);
    const block=source.slice(start,end).replace(/^\s*else if/,'if');const checkpoint=new Checkpoint(7,4,5,2,2),save=jest.fn(),player={x:1,y:1,isDead:false,nftId:'local',mapId:'one',server:{map:{getCheckpoint:()=>checkpoint}}};
    const receive=()=>vm.runInNewContext(block,{action:Types.Messages.CHECK,Types,message:[Types.Messages.CHECK,7],self:player,dao:{saveAvatarMapAndCheckpoint:save}});
    receive();expect(save).not.toHaveBeenCalled();Object.assign(player,{x:4,y:5,isDead:true});receive();expect(save).not.toHaveBeenCalled();player.isDead=false;receive();expect(save).toHaveBeenCalledWith('local','one',7);expect(player.lastCheckpoint).toBe(checkpoint);
});
