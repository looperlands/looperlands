export class SpriteSheetPainter {
    constructor(load = async image => {
        const response=await fetch(image);
        if(!response.ok)throw new Error('Sprite sheet could not load: '+image);
        return createImageBitmap(await response.blob());
    }) {this.load=load;this.images=new Map();this.bytes=0;}
    draw(ctx,sprite,time,x,y,scale) {
        const key=sprite.image;
        let entry=this.images.get(key);
        if(!entry) {
            entry={};this.images.set(key,entry);
            this.load(key).then(image=>{
                entry.image=image;this.bytes+=image.width*image.height*4;
                // Keep decoded artwork bounded across map transitions.
                for(const [id,old] of this.images) {
                    if(this.bytes<=32*1024*1024)break;
                    if(id===key || !old.image)continue;
                    this.bytes-=old.image.width*old.image.height*4;old.image.close?.();this.images.delete(id);
                }
            }).catch(error=>{entry.error=error;console.warn('Custom effect:',error.message);});
            return false;
        }
        if(!entry.image)return false;
        this.images.delete(key);this.images.set(key,entry);
        const frame=Math.min(sprite.frames-1,Math.floor(Math.max(0,time)*sprite.fps/1000));
        const width=sprite.frameWidth,height=sprite.frameHeight;
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(entry.image,(frame%sprite.columns)*width,Math.floor(frame/sprite.columns)*height,width,height,
            Math.round(x-width*scale/2),Math.round(y-height*scale),Math.round(width*scale),Math.round(height*scale));
        return true;
    }
}
