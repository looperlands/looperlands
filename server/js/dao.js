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
  console.log("Updated XP: ", xp, updatedXp, walletId, nftId);
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
      } else {
        return;
      }
    } catch (error) {
      console.error("Error parsing save data ", error, responseData.data);
      if (retry === undefined) {
        retry = MAX_RETRY_COUNT;
      }
      retry -= 1;
      if (retry > 0) {
        getCharacterData(wallet, nft, retry);
      } else {
        return { "error": "Error loading character data" }
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

exports.walletHasNFT = async function (wallet, nft) {
    let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${wallet}&NFTID=${nft}`;
    try {
        const responseData = await axios.get(url);
        return responseData.data;
    } catch (error) {
      console.error("Error while validating ownership", error, wallet, nft);
      throw error;
    }
};

exports.updatePVPStats = async function (wallet, nft, killIncrement, deathIncrement) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SavePvP.php?NFTID=${nft}&WalletID=${wallet}&PvPKills=${killIncrement}&PvPDeaths=${deathIncrement}`
    const responseData = await axios.get(url, options);
    console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
    return responseData.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error saving PVP stats" };
  }
};


exports.setNFTWeaponTrait = async function(wallet, nft) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SetWeaponTrait.php?WalletID=${wallet}&NFTID=${nft}`;
  try {
    const response = axios.get(url, options);
    const updatedTrait = response.data.trait;
    return updatedTrait;
  } catch(error) {
    console.error(error);
    return { "error": "Error saving weapon trait" };
  }
}

exports.saveNFTWeaponExperience = async function(wallet, nft, experience) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveWeaponExperience.php?WalletID=${wallet}&NFTID=${nft}&Experience=${experience}`;
  try {
    const response = axios.get(url, options);
    const updatedExperience = parseInt(response.data);
    return updatedExperience;
  } catch (error) {
    console.error(error);
    return { "error": "Error saving weapon experience" };
  }
}

exports.loadNFTWeapon = async function (wallet, nft) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/LoadNFTWeapon.php?WalletID=${wallet}&NFTID=${nft}`;
  try {
    const response = await axios.get(url, options);
    return response.data;
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