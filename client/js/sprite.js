
define(['jquery', 'animation', 'sprites'], function($, Animation, sprites) {

    var Sprite = Class.extend({
        init: function(name, scale, renderWorker, tokenHash, assetType, nftId) {
        	this.name = name;
        	this.scale = scale;
        	this.isLoaded = false;
        	this.offsetX = 0;
        	this.offsetY = 0;
			this.renderWorker = renderWorker;

			if (tokenHash !== undefined && assetType !== undefined) {
				if (assetType === "armor") {
					assetType = "looper";
				}
				this.filepath = `https://looperlands.sfo3.digitaloceanspaces.com/assets/${assetType}/1/${tokenHash}.png`;
				console.log("Loading dynamic nft", tokenHash, assetType, this.filepath);
				let template;
				switch(assetType) {
					case "looper":
						template = sprites["clotharmor"];
						break;
					case "weapon":
						template = sprites["redsword"];
						break;
					default:
						console.log("undefined json for" + assetType);
				}
				this.dynamicNFT = true;
				this.loadJSON(template, nftId.replace("0x", "NFT_"));
			} else {
				if (window.location.href.indexOf("127.0.0.1") > -1) {
					this.baseImageURL = 'img/';
				}
				else {
					this.baseImageURL = 'https://cdn.jsdelivr.net/gh/balkshamster/looperlands@main/client/img/';
				}
				this.loadJSON(sprites[name]);
			}
        },
        
        loadJSON: function(data, id) {
			if (id === undefined) {
				this.id = data.id;
			} else {
				this.id = id;
			}
			if (this.filepath === undefined) {
				this.filepath = this.baseImageURL + this.scale + "/" + this.id + ".png";
			}
    		this.animationData = data.animations;
    		this.width = data.width;
    		this.height = data.height;
    		this.offsetX = (data.offset_x !== undefined) ? data.offset_x : -16;
            this.offsetY = (data.offset_y !== undefined) ? data.offset_y : -16;

			if(data.projectiles) {
				this.projectiles = data.projectiles;
			}

    		this.load();
    	},

        load: function() {
			let self = this;

			if (!self.id.startsWith("NFT_")) {
				this.image = new Image();
				this.image.src = this.filepath;
				this.image.crossOrigin = "Anonymous";
				this.image.onload = function() {
					self.sendToWorker();
					self.isLoaded = true;
				};
			} else {
				this.isLoaded = true;
				self.sendToWorker();
			}
        },

		sendToWorker: function() {
			let self = this;
			let src;
			if (!this.dynamicNFT && window.location.href.indexOf("127.0.0.1") > -1) {
				src = "http://127.0.0.1:8000/" + this.filepath;
			} else {
				src = this.filepath;
			}

			self.renderWorker.postMessage({
				"type": "loadSprite",
				"id": self.id,
				"spriteName": self.name,
				"src": src,
				"animationData": self.animationData,
				"width": self.width,
				"height": self.height,
				"offsetX": self.offsetX,
				"offsetY": self.offsetY
			});
		},

        createAnimations: function() {
            var animations = {};
        
    	    for(var name in this.animationData) {
    	        var a = this.animationData[name];
    	        animations[name] = new Animation(name, a.length, a.row, this.width, this.height);
    	    }
	    
    	    return animations;
    	},
	
    	createHurtSprite: function() {
    	    var canvas = document.createElement('canvas'),
    	        ctx = canvas.getContext('2d', { willReadFrequently: true }),
    	        width = this.image.width,
    		    height = this.image.height,
    	        spriteData, data;
    
    	    canvas.width = width;
    	    canvas.height = height;
    	    ctx.drawImage(this.image, 0, 0, width, height);
    	    
    	    try {
        	    spriteData = ctx.getImageData(0, 0, width, height);

        	    data = spriteData.data;

        	    for(var i=0; i < data.length; i += 4) {
        	        data[i] = 255;
        	        data[i+1] = data[i+2] = 75;
        	    }
        	    spriteData.data = data;

        	    ctx.putImageData(spriteData, 0, 0);

        	    this.whiteSprite = { 
                    image: canvas,
            	    isLoaded: true,
            	    offsetX: this.offsetX,
            	    offsetY: this.offsetY,
            	    width: this.width,
            	    height: this.height
            	};
    	    } catch(e) {
    	        console.error("Error getting image data for sprite : "+this.name);
    	    }
        },
	
    	getHurtSprite: function() {
    	    return this.whiteSprite;
    	},
	
    	createSilhouette: function() {
    	    var canvas = document.createElement('canvas'),
    	        ctx = canvas.getContext('2d', { willReadFrequently: true }),
    	        width = this.image.width,
    		    height = this.image.height,
    	        spriteData, finalData, data;
	    
    	    canvas.width = width;
    	    canvas.height = height;
    	    ctx.drawImage(this.image, 0, 0, width, height);
    	    data = ctx.getImageData(0, 0, width, height).data;
    	    finalData = ctx.getImageData(0, 0, width, height);
    	    fdata = finalData.data;
	    
    	    var getIndex = function(x, y) {
    	        return ((width * (y-1)) + x - 1) * 4;
    	    };
	    
    	    var getPosition = function(i) {
    	        var x, y;
	        
    	        i = (i / 4) + 1;
    	        x = i % width;
    	        y = ((i - x) / width) + 1;
	        
    	        return { x: x, y: y };
    	    };
	    
    	    var hasAdjacentPixel = function(i) {
    	        var pos = getPosition(i);
	        
    	        if(pos.x < width && !isBlankPixel(getIndex(pos.x + 1, pos.y))) {
    	            return true;
    	        }
    	        if(pos.x > 1 && !isBlankPixel(getIndex(pos.x - 1, pos.y))) {
        	        return true;
    	        }
    	        if(pos.y < height && !isBlankPixel(getIndex(pos.x, pos.y + 1))) {
        	        return true;
    	        }
    	        if(pos.y > 1 && !isBlankPixel(getIndex(pos.x, pos.y - 1))) {
        	        return true;
    	        }
    	        return false;
    	    };
	    
    	    var isBlankPixel = function(i) {
    	        if(i < 0 || i >= data.length) {
    	            return true;
    	        }
    	        return data[i] === 0 && data[i+1] === 0 && data[i+2] === 0 && data[i+3] === 0;
    	    };
	    
    	    for(var i=0; i < data.length; i += 4) {
    	        if(isBlankPixel(i) && hasAdjacentPixel(i)) {
    	            fdata[i] = fdata[i+1] = 255;
    	            fdata[i+2] = 150;
    	            fdata[i+3] = 150;
    	        }
    	    }

    	    finalData.data = fdata;
    	    ctx.putImageData(finalData, 0, 0);
	    
    	    this.silhouetteSprite = {
				id: this.name + "_hl",
				name: this.name + "_silhouette",
                image: canvas,
        	    isLoaded: true,
        	    offsetX: this.offsetX,
        	    offsetY: this.offsetY,
        	    width: this.width,
        	    height: this.height,
        	};

			this.renderWorker.postMessage({
				"type": "loadSprite",
				"id": this.silhouetteSprite.id,
				"spriteName": this.name + "_silhouette",
				"src": canvas.toDataURL(),
				"animationData": self.animationData,
				"width": self.width,
				"height": self.height,
				"offsetX": self.offsetX,
				"offsetY": self.offsetY
			});
    	},

		getUrlByScale: function(scale){
			return this.baseImageURL + scale + "/" + this.id + ".png";
		}
    });

    return Sprite;
});