const axios = require('axios');
const alchemy = require('alchemy-sdk');

const ALCHEMY_API_KEY = process.env['ALCHEMY_API_KEY'];

const config = {
    apiKey: ALCHEMY_API_KEY,
    network: alchemy.Network.ETH_MAINNET,
};

const alchemyLib = new alchemy.Alchemy(config);

const NodeCache = require("node-cache");
const cache = new NodeCache();

getEnsAlchemy = async function (walletId) {
    try {
        const ensContractAddress = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";
        const nfts = await alchemyLib.nft.getNftsForOwner(walletId, {
            contractAddresses: [ensContractAddress],
        });
        //console.log(walletId, nfts);
        // use the first ENS
        let name = nfts["ownedNfts"][0]["title"];
        return name;
    } catch (e) {
        //console.log("Error getting ENS with alchemy", e);
        return "";
    }
}

getDotTaikoName = async function (walletId) {
    try {
        const endpoint = "https://api.dottaiko.me/api/resolveAddress/" + walletId;
        const ens = await axios.get(endpoint);

        return ens.data.data ?? "";
    } catch (e) {
        return "";
    }
}

getEns = async function (walletId) {
    let cached = cache.get(walletId);
    if (cached !== undefined) {
        return cached;
    }
    const shortEthAddressName = walletId.replace("0x", "").substring(0, 6);
    let name = shortEthAddressName;
    try {
        // first, try the loopring API
        let ensLookup = await axios.get(`https://api3.loopring.io/api/wallet/v3/resolveName?owner=${walletId}`);
        name = ensLookup.data.data;
        if (name === "") {
            // try alchemy next
            name = await getEnsAlchemy(walletId);
        }

        if (name === "") {
            // try dotTaiko-name
            name = await getDotTaikoName(walletId);
        }

        if (name === "") {
            name = shortEthAddressName;
        }
        // display the sub domain
        name = name.split(".")[0];
    } catch (e) {
        //console.error("Error while looking up ENS name", e);
    }
    cache.set(walletId, name, 60 * 60 * 24);
    return name;
}

exports.getEns = getEns;