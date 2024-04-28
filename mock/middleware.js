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
            "nft_ownership",
            "collection_ownership"
        ];
        let gets = paths.some(path => req.path.includes("/" + path));
        if (gets && req.method === "GET") {
            try {
                // Parse the JSON string to an object
                let parsedData = JSON.parse(data);
                data = JSON.stringify(parsedData[0].value);
            } catch (error) {
                console.error("Error parsing JSON:", error, req.path, data, parsedData);
                // Handle the error (optional)
            }
        }
        oldSend.call(this, data);
    };
    next(); // proceed to other middlewares which might call res.send
};