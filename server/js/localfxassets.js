const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {validatePng} = require('./localassetbuilder');
const Config = require('../../shared/js/placedfxconfig');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
function file(root, image) {
    if (!Config.validImage(image)) fail('Choose an uploaded local effect PNG.');
    const target=path.resolve(root,'client'+image), base=path.resolve(root);
    for(let current=target;current!==base;current=path.dirname(current)) {
        if(fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('Effect image paths must not contain symbolic links.');
    }
    return target;
}
function validateSprites(root, rows) {
    for(const row of rows) if(row.sprite) {
        Config.validateSprite(row.sprite);
        const target=file(root,row.sprite.image);
        if(!fs.existsSync(target) || !fs.statSync(target).isFile()) fail('Missing effect sprite sheet: '+row.sprite.image);
        const png=fs.readFileSync(target), s=row.sprite;
        const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
        if(width!==s.columns*s.frameWidth || height!==Math.ceil(s.frames/s.columns)*s.frameHeight) fail('Frame settings must match the complete sprite sheet grid.');
    }
}
function save(root,input) {
    if(!input || Object.keys(input).some(key=>key!=='image')) fail('Upload a PNG sprite sheet.');
    const png=validatePng(input.image,{width:1,height:1,animations:{}},1);
    const image='/img/map-fx/custom-'+crypto.createHash('sha256').update(png.buffer).digest('hex').slice(0,32)+'.png';
    const target=file(root,image);fs.mkdirSync(path.dirname(target),{recursive:true});
    if(!fs.existsSync(target)) {
        const temporary=target+'.'+crypto.randomUUID()+'.tmp';
        try {fs.writeFileSync(temporary,png.buffer,{flag:'wx'});fs.renameSync(temporary,target);} finally {fs.rmSync(temporary,{force:true});}
    }
    return {image,width:png.width,height:png.height};
}
function install(app,toolbox) {
    app.post('/local/api/fx-sheets',(req,res)=>{try {
        if(toolbox.closed)fail('The toolbox is shutting down.',503);
        if(toolbox.job?.status==='running')fail('Wait for the build to finish before uploading artwork.',409);
        res.json(save(toolbox.root,req.body));
    }catch(error){res.status(error.status||400).json({error:error.message});}});
    app.use('/img/map-fx',require('express').static(path.join(toolbox.root,'client/img/map-fx')));
}
module.exports={save,validateSprites,install};
