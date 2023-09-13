const siwe = require('siwe');
const NodeCache = require( "node-cache" );

const cache = new NodeCache();

let SIGNING_ENABLED = process.env.SIGNING_ENABLED === "true";

exports.generateNonce = async (req, res) => {
    const body = req.body;
    const apiKey = req.headers['x-api-key'];

    let walletId = body.walletId;

    if (apiKey !== process.env.LOOPWORMS_API_KEY) {
        res.status(401).json({
            status: false,
            "error" : "invalid api key",
            user: null
        });
        return;
    }

    let nonce = siwe.generateNonce();

    let cachedNonces = cache.get("cachedNonces");
    if (cachedNonces === undefined) {
        cachedNonces = {};
    }

    cachedNonces[walletId] = nonce;

    cache.set("cachedNonces", cachedNonces);

    res.status(200).json({
        nonce: nonce
    });
}

exports.validateSignature = async (walletId, message, signature) => {

    if (!SIGNING_ENABLED) {
        return true;
    }

    let nonces = cache.get("cachedNonces");
    if (nonces === undefined) {
        console.log("Undefined nonce cache");
        return false;
    }

    let nonce = nonces[walletId];
    console.log("Nonce, message, signature", nonce, message, signature);
    if (nonce === undefined) {
        console.log("Undefined nonce from walletId");
        return false;
    }

    if (signature === undefined) {
        console.log("Undefined signature");
        return false;
    }

    if (message === undefined) {
        console.log("Undefined message");
        return false;
    }

    const siweMessage = new siwe.SiweMessage(message)
    const fields = await siweMessage.verify({signature})
    let valid = fields.data.nonce === nonce;
    console.log("Valid", valid, fields.data.nonce, nonce);
    return valid;
};