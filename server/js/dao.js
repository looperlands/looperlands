const LOOPWORMS_LOOPERLANDS_BASE_URL = process.env.LOOPWORMS_LOOPERLANDS_BASE_URL;
const API_KEY = process.env.LOOPWORMS_API_KEY;
const axios = require('axios');
const NodeCache = require( "node-cache" );
const daoCache = new NodeCache();

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
    axios.post(url, saveGame, options);
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

    let cached = daoCache.get(`${wallet}_${nft}`);
    //console.log("Cached value for ", wallet, nft, cached);
    if(cached !== undefined) {
      //console.log("Returning cached value for ", wallet, nft);
      return cached;
    }

    let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/AssetValidation.php?WalletID=${wallet}&NFTID=${nft}`;
    //console.log("Asset validation url ", url);
    try {
        const responseData = await axios.get(url);
        // Cache ownership for 30 minutes because that is the L2 delay
        daoCache.set(`${wallet}_${nft}`, responseData.data, 60);
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

exports.saveAvatarMapId = async function(nft, mapId) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveMap.php?NFTID=${nft}&mapId=${mapId}`;
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error("saveAvatarMapId", error);
    return { "error": "Error saving avatar map id" };
  }
}

exports.saveAvatarCheckpointId = async function(nft, checkpointId) {

  //console.log("saveAvatarCheckpointId", nft, checkpointId);
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/SaveCheckpoint.php?NFTID=${nft}&checkpointId=${checkpointId}`;
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error("saveAvatarCheckpoint", error);
    return { "error": "Error saving avatar checkpoint id" };
  }
}

LOOT_EVENTS_QUEUE = []

processLootEventQueue = async function(retry) {
  if (!LOOT_EVENTS_QUEUE?.length) {
    return;
  }

  const options = {
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/saveItemJson.php`;

  try {
    let response = await axios.post(url, LOOT_EVENTS_QUEUE, options);
    LOOT_EVENTS_QUEUE = [];
  } catch (error) {
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      processLootEventQueue(retry);
    }
  }
}

let LOOT_QUEUE_INTERVAL = undefined;

exports.saveLootEvent = async function(avatarId, itemId, amount) {
  if(amount === undefined) {
    amount = 1;
  }

  if (LOOT_QUEUE_INTERVAL === undefined) {
    // save the loot event queue every 30 seconds
    LOOT_QUEUE_INTERVAL = setInterval(processLootEventQueue, 1000 * 30);
  }

  for(let i = 0; i < amount; i++) {

    LOOT_EVENTS_QUEUE.push({avatarId: avatarId, itemId: itemId})
  }
}

exports.getItemCount = async function(avatarId, itemId, retry) {

  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/loadItem.php?NFTID=${avatarId}&itemId=${itemId}`;

  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      return this.getItemCount(avatarId, itemId, retry);
    } else {
      console.error("getItemCount", error);
    }
  }
}

exports.avatarHasItem = async function(avatarId, itemId) {
  let cached = daoCache.get(`${avatarId}_${itemId}`);
  //console.log("Cached value for ", avatarId, itemId, cached);
  if (cached !== undefined) {
    return cached;
  }

  const itemCount = await this.getItemCount(avatarId, itemId);

  let result = itemCount !== undefined && itemCount > 0;
  daoCache.set(`${avatarId}_${itemId}`, result, 30);
  //console.log("avatarHasItem", avatarId, itemId, result)
  return result;
}


MOB_KILL_QUEUE = []
processMobKillEventQueue = async function(retry) {
  if (!MOB_KILL_QUEUE?.length) {
    return;
  }

  const options = {
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/saveMobJson.php`;

  try {
    let response = await axios.post(url, MOB_KILL_QUEUE, options);
    MOB_KILL_QUEUE = [];
  } catch (error) {
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      processMobKillEventQueue(retry);
    }
  }
}

let MOB_KILL_QUEUE_INTERVAL = undefined;

exports.saveMobKillEvent = async function(avatarId, mobId) {
  if (MOB_KILL_QUEUE_INTERVAL === undefined) {
    // save the loot event queue every 30 seconds
    MOB_KILL_QUEUE_INTERVAL = setInterval(processMobKillEventQueue, 1000 * 30);
  }

  MOB_KILL_QUEUE.push({avatarId: avatarId, mobId: mobId});
}

exports.loadAvatarGameData = async function(avatarId, retry) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/loadItemMobQuest.php?NFTID=${avatarId}`;

  try {
    const response = await axios.get(url, options);

    let responseData = response.data[0];

    let mobKills, items = {}, quests = {};


    if (responseData.mobJson) {
      mobKills = responseData.mobJson.reduce((avatarMobKills, mobKills) => {
        const mobId = mobKills.mobId;
        if (mobId) {
          avatarMobKills[mobId] = mobKills.iCount;
        }
        return avatarMobKills;
      }, {});
    }

    if (responseData.itemJson) {
      items = responseData.itemJson.reduce((avatarItems, itemCount) => {
        const itemId = itemCount.itemId;
        if (itemId) {
          avatarItems[itemId] = itemCount.iCount;
        }
        return avatarItems;
      }, {});
    }

    if (responseData.questJson) {
      quests = responseData.questJson.reduce((avatarQuests, quest) => {
        const status = quest.status;
        if (status) {
          let questsByStatus = avatarQuests[status];
          if (questsByStatus) {
            questsByStatus.push(quest);
          } else {
            avatarQuests[status] = [quest];
          }
        }
        return avatarQuests;
      }, {});
    }

    const data = {
      mobKills: mobKills,
      items: items,
      quests: quests
    }

    //console.log("loadAvatarGameData", data);

    return data;
  } catch (error) {
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      console.log("Retry " + retry);
      return this.loadAvatarGameData(avatarId, retry);
    } else {
      console.error("loadAvatarGameData", error);
    }
  }
}

exports.setQuestStatus = async function(avatarId, questId, status, retry) {
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  }

  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/setQuestStatus.php?questId=${questId}&avatarID=${avatarId}&status=${status}`;

  try {
    const response = await axios.get(url, options);
    return response;
  } catch (error) {
    console.error("setQuestStatus", error);
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      return this.setQuestStatus(avatarId, questId, status, retry);
    } else {
      console.error("setQuestStatus", error);
    }
  }
}


exports.updateExperience = updateExperience;
exports.saveCharacterData = saveCharacterData;
exports.getCharacterData = getCharacterData;
exports.saveWeapon = saveWeapon;
exports.loadWeapon = loadWeapon;
exports.loadExperience = loadExperience;
