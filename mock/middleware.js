module.exports = (req, res, next) => {
    // Intercepts the response
    let oldSend = res.send;
    res.send = function (data) {
        const paths = [
            "loadItemConsumableMobQuest.php", 
            "looperInventoryDetails.php", 
            "LoadWeapon.php",
            "LoadNFTWeapon.php",
            "Maps/selectLooperLands_Quest2.php",
            "collection_ownership",
        ];

        if (req.path.includes("/nft_ownership") && req.method === "GET") {
            let wallet = req.query.wallet;
            const match = req._parsedOriginalUrl.pathname.match(/\/api\/asset\/nft\/([^\/]+)\/owns/);
            const nft = match[1];
            if (nft) {
                let parsedData = JSON.parse(data);
                let filteredData = parsedData.filter(item => item.nft === nft && item.wallet === wallet);
                data = JSON.stringify(filteredData[0].value);
            }
        } else if (req.path.includes("/nft_data") && req.method === "GET") {
            const match = req._parsedOriginalUrl.pathname.match(/\/api\/asset\/nft\/([^\/]+)/);
            let nft = match[1];
            if (nft) {
                try {
                    let parsedData = JSON.parse(data);
                    let filteredData = parsedData.find(item => item.nft === nft).value;
                    data = JSON.stringify(filteredData || {});  // Send an empty object if not found
                } catch (e) {
                    console.error(e, nft, data);
                }
                
            }
        } else {
            let gets = paths.some(path => req.path.includes("/" + path));
            if (gets && req.method === "GET") {
                try {
                    // Parse the JSON string to an object
                    let parsedData = JSON.parse(data);
                    data = JSON.stringify(parsedData[0].value);
                } catch (error) {
                    console.error("Error parsing JSON:", error, req.path, data, parsedData, req);
                    // Handle the error (optional)
                }
            }
        }


        oldSend.call(this, data);
    };
    next(); // proceed to other middlewares which might call res.send
};