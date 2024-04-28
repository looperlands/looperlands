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