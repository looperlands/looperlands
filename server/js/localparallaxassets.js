const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {validatePng} = require('./localassetbuilder');
const Environment = require('../../client/js/sceneenvironment');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
function file(root, image) {
    if (!Environment.validImage(image)) fail('Choose a local parallax PNG image.');
    const target=path.resolve(root,'client'+image), base=path.resolve(root);
    for(let current=target;current!==base;current=path.dirname(current)) {
        if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink()) fail('Layer image paths must not contain symbolic links.');
    }
    return target;
}
function dimensions(buffer) {
    if(buffer.length<24||!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('Layer artwork must be a PNG.');
    return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
}
function catalog(root) {
    const directory=path.dirname(file(root,'/img/parallax/catalog.png'));
    if(!fs.existsSync(directory))return [];
    return fs.readdirSync(directory).filter(name=>Environment.validImage('/img/parallax/'+name)).sort().map(name=>{
        const image='/img/parallax/'+name, buffer=fs.readFileSync(file(root,image));
        return {image,name:name.replace(/\.png$/,'').replaceAll('-',' '),...dimensions(buffer)};
    });
}
function validateLayers(root, entries) {
    for(const row of entries)for(const layer of row.parallax?.layers||[]) {
        const target=file(root,layer.image);
        if(!fs.existsSync(target)||!fs.statSync(target).isFile())fail('Missing layer image: '+layer.image);
    }
}
function save(root,input) {
    if(!input||Object.keys(input).some(key=>!['name','image'].includes(key))||typeof input.name!=='string'||input.name.length>120)fail('Choose a name and PNG for this layer image.');
    const png=validatePng(input.image,{width:1,height:1,animations:{}},1);
    const slug=input.name.toLowerCase().replace(/\.png$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'layer';
    const image='/img/parallax/custom-'+slug+'-'+crypto.createHash('sha256').update(png.buffer).digest('hex').slice(0,16)+'.png';
    const target=file(root,image);fs.mkdirSync(path.dirname(target),{recursive:true});
    // Content-addressed artwork never overwrites an image used by another map.
    if(!fs.existsSync(target)) {
        const temporary=target+'.'+crypto.randomUUID()+'.tmp';
        try{fs.writeFileSync(temporary,png.buffer,{flag:'wx'});fs.renameSync(temporary,target);}finally{fs.rmSync(temporary,{force:true});}
    }
    return {image,name:input.name,width:png.width,height:png.height};
}
function install(app,toolbox) {
    app.get('/local/api/parallax-images',(req,res)=>{try{res.json({images:catalog(toolbox.root)});}catch(error){res.status(error.status||500).json({error:error.message});}});
    app.post('/local/api/parallax-images',(req,res)=>{try{
        if(toolbox.closed)fail('The toolbox is shutting down.',503);
        if(toolbox.job?.status==='running')fail('Wait for the build to finish before uploading artwork.',409);
        res.json(save(toolbox.root,req.body));
    }catch(error){res.status(error.status||500).json({error:error.message});}});
    app.use('/img/parallax',require('express').static(path.join(toolbox.root,'client/img/parallax')));
}
module.exports={catalog,save,validateLayers,install};
