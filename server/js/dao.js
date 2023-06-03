const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const API_KEY = process.env.LOOPWORMS_API_KEY;
const axios = require('axios');

const MAX_RETRY_COUNT = 5;

updateExperience = async function (walletId, nftId, xp, retry) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    },
  };
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveExperience.php?WalletID=${walletId}&NFTID=${nftId}&Experience=${xp}`;
  const responseData = await axios.get(url, options);
  const updatedXp = parseInt(responseData.data);
  if (Number.isNaN(updatedXp)) {
    console.error("Error updating experience", walletId, nftId, xp, responseData.data);
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      updateExperience(walletId, nftId, xp, retry);
    }
  }
  return updatedXp;
}

loadExperience = async function (walletId, nftId) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    },
  };
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/LoadExperience.php?WalletID=${walletId}&NFTID=${nftId}`;
  const responseData = await axios.get(url, options);
  const xp = parseInt(responseData.data);
  return xp;
}

getCharacterData = async function (wallet, nft, retry) {
  const options = {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY
    },
  };
  try {
    const responseData = await axios.get(`${LOOPWORMS_LOOPERLANDS_BASE_URL}/Load.php?NFTID=${nft}&WalletID=${wallet}`, options);
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);

    let parsedSaveData;
    try {
      if (responseData[1] !== '') {
        parsedSaveData = JSON.parse(responseData.data[1]);
      }
    } catch (error) {
      console.error("Error parsing save data ", error, responseData.data);
      if (retry === undefined) {
        retry = MAX_RETRY_COUNT;
      }
      retry -= 1;
      if (retry > 0) {
        getCharacterData(wallet, nft, retry);
      }
    }
    return parsedSaveData;
  } catch (error) {
    console.error(error);
    return { "error": "Error loading character data" };
  }

}

saveCharacterData = async function (wallet, nft, saveGame) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/Save.php?NFTID=${nft}&WalletID=${wallet}`
    const responseData = await axios.post(url, saveGame, options);
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
    return responseData.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error saving character data" };
  }
}

saveWeapon = async function (wallet, nft, weaponName) {

  const options = {
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveWeapon.php?NFTID=${nft}&WalletID=${wallet}`
    const responseData = await axios.post(url, weaponName, options);
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
    return responseData.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error saving weapon data" };
  }
}


loadWeapon = async function (wallet, nft) {
  const options = {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY
    },
  };
  try {
    const responseData = await axios.get(`${LOOPWORMS_LOOPERLANDS_BASE_URL}/LoadWeapon.php?NFTID=${nft}&WalletID=${wallet}`, options);
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
    try {
      return JSON.parse(responseData.data[0]);
    } catch (e) {
      return 'sword1';
    }

  } catch (error) {
    console.error(error);
    return { "error": "Error loading weapon" };
  }
}


exports.updateExperience = updateExperience;
exports.saveCharacterData = saveCharacterData;
exports.getCharacterData = getCharacterData;
exports.saveWeapon = saveWeapon;
exports.loadWeapon = loadWeapon;
exports.loadExperience = loadExperience;