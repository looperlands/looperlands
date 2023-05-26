const LOOPWORMS_LOOPQUEST_BASE_URL = process.env.LOOPWORMS_LOOPQUEST_BASE_URL;
const axios = require('axios');

updateExperience = function(walletId, nftId, xp) {

    let url = `${LOOPWORMS_LOOPQUEST_BASE_URL}/SaveExperience.php?WalletID=${walletId}&NFTID=${nftId}&Experience=${xp}`;
    console.log(`Adding ${xp} xp to ${walletId}, ${nftId}`);
}

exports.updateExperience = updateExperience;