const assets = require('./localassetbuilder');
function install(app,toolbox) {
    const respond=callback=>(req,res)=>{try {res.json(callback(req));} catch(error){res.status(error.status||500).json({error:error.message});}};
    app.get('/local/api/assets',respond(()=>assets.catalog(toolbox.root)));
    app.get('/local/api/assets/:id',respond(req=>assets.readAsset(toolbox.root,req.params.id)));
    app.post('/local/api/assets',respond(req=>{
        if(toolbox.closed) throw Object.assign(new Error('The toolbox is shutting down.'),{status:503});
        if(toolbox.job?.status==='running') throw Object.assign(new Error('Wait for the build to finish before saving assets.'),{status:409});
        return assets.saveAsset(toolbox.root,req.body);
    }));

}
module.exports={install};
