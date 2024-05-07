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

function loadAssetSprites(dynamicNFTData, game) {
    // Load the main asset sprite
    const spriteName = Types.addDynamicNFT(dynamicNFTData);
    const sprite = game.loadSprite(
        spriteName,
        dynamicNFTData.tokenHash,
        dynamicNFTData.assetType,
        dynamicNFTData.nftId
    );
    game.sprites[spriteName] = sprite;

    // Conditional loading based on asset type
    if (dynamicNFTData.assetType === "fishingrod") {
        const floatSpriteName = `item-${dynamicNFTData.nftId}`.replace("0x", "NFT_");
        const floatSprite = game.loadSprite(
            floatSpriteName,
            dynamicNFTData.tokenHash,
            "float",
            dynamicNFTData.nftId
        );
        game.sprites[floatSpriteName] = floatSprite;
    } else if (dynamicNFTData.assetType === "ranged_weapon") {
        loadProjectileSprites(dynamicNFTData, game);
    }
    return spriteName;
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