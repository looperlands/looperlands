const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const API_KEY = process.env.LOOPWORMS_API_KEY;
const axios = require('axios');
const { response } = require('express');

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
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      return updateExperience(walletId, nftId, xp, retry);
    } else {
      console.error("Error updating avatar experience", walletId, nftId, xp, responseData.data);
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
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data, `${LOOPWORMS_LOOPERLANDS_BASE_URL}/Load.php?NFTID=${nft}&WalletID=${wallet}`);

    let parsedSaveData;
    try {
      if (responseData[1] !== '') {
        parsedSaveData = JSON.parse(responseData.data[1]);
      } else {
        return;
      }
    } catch (error) {
      if (retry === undefined) {
        retry = MAX_RETRY_COUNT;
      }
      retry -= 1;
      if (retry > 0) {
        return getCharacterData(wallet, nft, retry);
      } else {
        //console.error("Error parsing save data ", error, responseData.data);
        return
      }
    }
    return parsedSaveData;
  } catch (error) {
    return;
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
      let weapon = JSON.parse(responseData.data[0]);
      if (weapon.startsWith("NFT_")) {
        let weaponNFT = weapon.replace("NFT_", "0x");
        let ownsWeapon = await this.walletHasNFT(wallet, weaponNFT);
        if (ownsWeapon === true) {
          return weapon;
        } else {
          return 'sword1';
        }
      } else {
        return weapon;
      }
    } catch (e) {
      return 'sword1';
    }

  } catch (error) {
    console.error(error);
    return { "error": "Error loading weapon" };
  }
}

exports.walletHasNFT = async function (wallet, nft, retry) {
    let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${wallet}&NFTID=${nft}`;
    try {
        const responseData = await axios.get(url);
        return responseData.data;
    } catch (error) {
      console.error("Error while validating ownership", error, wallet, nft);
      if (retry === undefined) {
        retry = MAX_RETRY_COUNT;
      }
      retry -= 1;
      if (retry > 0) {
        return this.walletHasNFT(wallet, nft, retry);
      } else {
        throw error;
      }
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
    //console.log("ResponseData from Loopworms: ", responseData.status, responseData.text, responseData.data);
    return responseData.data;
  } catch (error) {
    console.error("updatePVPStats error", error);
    return { "error": "Error saving PVP stats" };
  }
};


exports.saveNFTWeaponTrait = async function(wallet, nft) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveWeaponTrait.php?WalletID=${wallet}&NFTID=${nft}`;
  try {
    const response = await axios.get(url, options);
    const updatedTrait = response.data;
    return updatedTrait;
  } catch(error) {
    console.error("saveNFTWeaponTrait error", error);
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
    const response = await axios.get(url, options);
    //console.log("ResponseData from Loopworms: ", response.status, response.text, response.data);
    const updatedExperience = parseInt(response.data.experience);
    return updatedExperience;
  } catch (error) {
    console.error("SaveNFTWeaponExperience Error", error);
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
    console.error("loadNFTWeapon", error);
    return { "error": "Error loading weapon" };
  }
}

exports.updateExperience = updateExperience;
exports.saveCharacterData = saveCharacterData;
exports.getCharacterData = getCharacterData;
exports.saveWeapon = saveWeapon;
exports.loadWeapon = loadWeapon;
exports.loadExperience = loadExperience;