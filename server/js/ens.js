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

// Full resolved name, or null when no name is available. Keep wallet fallbacks separate.
const getEnsName = async function (walletId) {
    const key = walletId.toLowerCase();
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let name = '';
    try {
        const response = await axios.get(`https://api3.loopring.io/api/wallet/v3/resolveName?owner=${walletId}`);
        name = typeof response.data.data === 'string' ? response.data.data.trim() : '';
    } catch (e) {
        // A failed provider should still allow the secondary resolver.
    }
    if (!name) name = await getDotTaikoName(walletId);
    name = typeof name === 'string' ? name.trim() : '';
    const resolved = name && !/^0x[a-f0-9]{40}$/i.test(name) ? name : null;
    cache.set(key, resolved, 60 * 60 * 24);
    return resolved;
};

// Existing gameplay names retain their compact format.
const getEns = async function (walletId) {
    const name = await getEnsName(walletId);
    return name ? name.split('.')[0] : walletId.replace('0x', '').substring(0, 6);
};

exports.getEns = getEns;
exports.getEnsName = getEnsName;
