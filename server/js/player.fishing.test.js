const fs=require('fs'),vm=require('vm');
global.Types={};const Types=require('../../shared/js/gametypes');
test('logging in with a rod loads the special-item level and trait model',()=>{
    let methods;const load=jest.fn(),construct=jest.fn();class Rod {constructor(wallet,id){construct(wallet,id);}loadItemData(){load();}}
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'),'utf8'),{module:{exports:{}},process:{env:{}},console,Character:{extend:value=>{methods=value;return function(){};}},require:name=>{
        if(name==='../../shared/js/gametypes')return Types;
        if(name==='./nftspecialitem.js')return {NFTSpecialItem:Rod};
        if(name==='./looperlandsplatformclient.js')return {LooperLandsPlatformClient:function(){}};
        return {};
    }});
    const player={...methods,walletId:'local-wallet'},rod=Object.values(Types.Entities).find(kind=>typeof kind==='number'&&Types.isFishingRod(kind));
    player.equipWeapon(rod);expect(player.weapon).toBe(rod);expect(player.getNFTWeapon()).toBeInstanceOf(Rod);expect(construct).toHaveBeenCalledWith('local-wallet',Types.getKindAsString(rod));expect(load).toHaveBeenCalledTimes(1);
});
