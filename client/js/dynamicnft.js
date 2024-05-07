async function loadDynamicNFT(spriteName, sessionId, callback) {
    const nftId = spriteName.replace("NFT_", "0x");
    const url = `/session/${sessionId}/dynamicnft/${nftId}/nftid`;
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            Types.addDynamicNFT(response.data);
            callback(spriteName, response.data);
        } else {
            console.error(response);
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadDynamicNFTByKind(kindId, sessionId, callback) {
    const url = `/session/${sessionId}/dynamicnft/${kindId}/kindid`;
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            Types.addDynamicNFT(response.data);
            callback(response.data);
        } else {
            console.error(response);
        }
    } catch (e) {
        console.error(e);
    }
}

function loadProjectileSprites(dynamicNFTData, game) {
    const projectileRanges = ["short", "medium", "long"];
    for (const range of projectileRanges) {
        const projectile = `projectile_${range}`;
        const projectileSpriteName = dynamicNFTData.nftId.replace("0x", `NFT_${range}`);
        const projectileSprite = game.loadSprite(
            projectileSpriteName,
            dynamicNFTData.tokenHash,
            projectile,
            dynamicNFTData.nftId
        );
        game.sprites[projectileSpriteName] = projectileSprite;
    }
}