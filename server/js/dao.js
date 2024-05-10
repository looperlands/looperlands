const axios = require('axios');
const NodeCache = require("node-cache");
const Collectables = require('./collectables.js');
const platform = require('./looperlandsplatformclient.js');
const daoCache = new NodeCache();

const {
  LOOPWORMS_LOOPERLANDS_BASE_URL,
  LOOPERLANDS_BACKEND_BASE_URL,
  LOOPERLANDS_BACKEND_API_KEY,
  LOOPERLANDS_PLATFORM_BASE_URL,
  LOOPERLANDS_PLATFORM_API_KEY
} = process.env;

const platformClient = new platform.LooperLandsPlatformClient(LOOPERLANDS_PLATFORM_API_KEY, LOOPERLANDS_PLATFORM_BASE_URL);

const API_KEY = process.env.LOOPWORMS_API_KEY;
const MAX_RETRY_COUNT = 5;

const DEBUG = false;
const printResponseJSON = function(url, response) {
  if (DEBUG) {
    console.log(url, JSON.stringify(response.data));
  }
}

const updateExperience = async function (walletId, nftId, xp, retry) {
  const responseData = await platformClient.increaseExperience(nftId, xp);

  printResponseJSON('increaseExperience', responseData);
  const updatedXp = parseInt(responseData.xp);
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

const loadMapFlow = async function (mapId) {
  const options = { headers: { 'X-Api-Key': API_KEY } };
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/Maps/selectLooperLands_Quest2.php?map=${mapId}`;
  try {
    const responseData = await axios.get(url, options);
    printResponseJSON(url, responseData);
    return JSON.parse(responseData.data);
  } catch (error) {
    return undefined;
  }
}

const saveWeapon = async function (wallet, nft, weaponName) {
  try {

    const responseData = await platformClient.equip(wallet, nft, weaponName.replace("NFT_", "0x"));
    printResponseJSON('equip', responseData);

    return responseData;
  } catch (error) {
    console.error(error);
    return { "error": "Error saving weapon data" };
  }
}


const loadWeapon = async function (wallet, nft) {
  try {
    const responseData = await platformClient.getEquipped(nft);
    try {
      let weapon = responseData.weapon;
      printResponseJSON('getEquipped', responseData);
      if (weapon?.startsWith("0x")) {
        // Check if wallet still owns the equipped weapon
        let ownsWeapon = await this.walletHasNFT(wallet, weapon);
        if (ownsWeapon === true) {
          return weapon.replace("0x", "NFT_");
        } else {
          return 'sword1';
        }
      } else {
        return weapon;
      }
    } catch (e) {
      console.error("Get weapon error", e);
      return 'sword1';
    }

  } catch (error) {
    console.error(error);
    return { "error": "Error loading weapon" };
  }
}

const walletHasNFT = async function (wallet, nft, retry) {
  let cached = daoCache.get(`${wallet}_${nft}`);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const isOwner = await platformClient.checkOwnership(nft, wallet);

    // Cache ownership for 1 minute
    daoCache.set(`${wallet}_${nft}`, isOwner, 60);
    return isOwner;
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

const updatePVPStats = async function (wallet, nft, killIncrement, deathIncrement) {
  try {
    const responseData = await platformClient.increasePvPStats(nft, killIncrement, deathIncrement);
    printResponseJSON('increasePvpStats', responseData);
    return responseData;
  } catch (error) {
    console.error("updatePVPStats error", error);
    return { "error": "Error saving PVP stats" };
  }
};

const saveNFTWeaponTrait = async function (wallet, nft) {
  try {
    const response = await platformClient.rollTrait(nft);
    printResponseJSON('rollTrait', response);
    return response.trait;
  } catch (error) {
    console.error("saveNFTWeaponTrait error", error);
    return { "error": "Error saving weapon trait" };
  }
}

const saveNFTWeaponExperience = async function (wallet, nft, xp) {
  try {
    const responseData = await platformClient.increaseExperience(nft, xp);
    printResponseJSON('increaseExperience', responseData);
    return parseInt(responseData.xp);
  } catch (error) {
    console.error("SaveNFTWeaponExperience Error", error);
    return { "error": "Error saving weapon experience" };
  }
}

const saveNFTSpecialItemTrait = async function (wallet, nft) {
  try {
    const response = await platformClient.rollTrait(nft)
    printResponseJSON('rollTrait', response);
    return response.trait;
  } catch (error) {
    console.error("saveNFTSpecialItemTrait error", error);
    return { "error": "Error saving weapon trait" };
  }
}

const saveNFTSpecialItemExperience = async function (wallet, nft, experience) {
  try {
    const responseData = await platformClient.increaseExperience(nft, experience);
    printResponseJSON('increaseExperience', responseData);
    return parseInt(responseData.xp);
  } catch (error) {
    console.error("saveNFTSpecialItemExperience Error", error);
    return { "error": "Error saving special item experience" };
  }
}

const loadNFTWeapon = async function (wallet, nft) {
  try {
    const response = await platformClient.getAssetInfo(nft);
    printResponseJSON('getAssetInfo', response);
    return response;
  } catch (error) {
    console.error("loadNFTWeapon", error);
    return { "error": "Error loading weapon" };
  }
}

const getSpecialItem = async function (wallet, nft) {
  try {
    const response = await platformClient.getAssetInfo(nft);
    printResponseJSON('getAssetInfo', response);
    return response;
  } catch (error) {
    console.error("getSpecialItem", error);
    return { "error": "Error getting special item" };
  }
}

const saveAvatarMapAndCheckpoint = async function (nft, mapId, checkpointId) {
  try {
    const response = await platformClient.updateAssetPosition(nft, mapId, checkpointId);
    printResponseJSON('updateAssetPosition', response);
    return response;
  } catch (error) {
    console.error("saveAvatarMapAndCheckpoint", error);
    return { "error": "Error saving avatar map and checkpoint id" };
  }
}

LOOT_EVENTS_QUEUE = []

const processLootEventQueue = async function (retry) {
  if (!LOOT_EVENTS_QUEUE?.length) { return; }

  try {
    let response = await platformClient.storeInventoryTransaction(LOOT_EVENTS_QUEUE)
    printResponseJSON('storeInventoryTransactions', response);
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

const saveLootEvent = async function (nftId, itemId, amount) {
  if (amount === undefined) { amount = 1; }
  if (LOOT_QUEUE_INTERVAL === undefined) {
    LOOT_QUEUE_INTERVAL = setInterval(processLootEventQueue, 1000 * 30);     // save the loot event queue every 30 seconds
  }
  LOOT_EVENTS_QUEUE.push({ nftId: nftId, item: String(itemId), amount })
}

const getItemCount = async function (avatarId, itemId, retry) {
  try {
    const response = platformClient.getInventoryItem(avatarId, String(itemId));
    printResponseJSON('getInventoryItem', response);
    return response.amount;
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

const avatarHasItem = async function (avatarId, itemId) {
  let cached = daoCache.get(`${avatarId}_${itemId}`);
  if (cached !== undefined) { return cached; }
  const itemCount = await this.getItemCount(avatarId, itemId);
  let result = itemCount !== undefined && itemCount > 0;
  daoCache.set(`${avatarId}_${itemId}`, result, 30);
  return result;
}


MOB_KILL_QUEUE = []
const processMobKillEventQueue = async function (retry) {
  if (!MOB_KILL_QUEUE?.length) { return; }
  const options = { headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' } }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/saveMobJson.php`;
  try {
    let response = await axios.post(url, MOB_KILL_QUEUE, options);
    printResponseJSON(url, response);
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

const saveMobKillEvent = async function (avatarId, mobId) {
  if (MOB_KILL_QUEUE_INTERVAL === undefined) {
    MOB_KILL_QUEUE_INTERVAL = setInterval(processMobKillEventQueue, 1000 * 30); // save the loot event queue every 30 seconds
  }
  MOB_KILL_QUEUE.push({ avatarId: avatarId, mobId: mobId });
}

const loadAvatarGameData = async function (avatarId, retry) {
  const options = { headers: { 'X-Api-Key': API_KEY } }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/loadItemConsumableMobQuest.php?NFTID=${avatarId}`;
  try {
    const response = await axios.get(url, options);
    printResponseJSON(url, response);
    let responseData = response.data[0];
    let mobKills, items = {}, quests = {}, consumables = {};
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

    if (responseData.itemConsumableJson) {
      items = responseData.itemConsumableJson.reduce((avatarItems, itemCount) => {
        const itemId = itemCount.itemConsumableId;
        if (itemId && parseInt(itemCount.iCount) > 0) {
          avatarItems[itemId] = itemCount.iCount;
        }
        return avatarItems;
      }, items);
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

    if (responseData.itemConsumableJson) {
      consumables = responseData.itemConsumableJson.reduce((avatarConsumes, item) => {
        const itemId = item.itemConsumableId;
        if (itemId) {
          avatarConsumes[itemId] = item.iCount;
        }
        return avatarConsumes;
      }, {});
    }

    const data = {
      mobKills: mobKills,
      items: items,
      quests: quests,
      consumables: consumables
    }
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

const setQuestStatus = async function (avatarId, questId, status, retry) {
  const options = { headers: { 'X-Api-Key': API_KEY } }
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/setQuestStatus.php?questId=${questId}&avatarID=${avatarId}&status=${status}`;
  try {
    const response = await axios.get(url, options);
    printResponseJSON(url, response);
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

const saveConsumable = async function (nft, item, qty) {
  if (qty === undefined) { qty = 1; }
  const options = { headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' } }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/saveConsumable2.php`;
  const sData = { avatarId: nft, itemId: item, quantity: qty };
  try {
    let response = await axios.post(url, sData, options);
    printResponseJSON(url, response);
    return response.data;
  } catch (error) {
    console.error("saveConsumable", error);
    return { "error": "Error saving consumable" };
  }
}

const getBots = async function (walletId) {
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/loadBot.php?walletID=${walletId}`;
  let botsResponse = await axios.get(url);
  printResponseJSON(url, botsResponse);
  let bots = botsResponse.data;
  return bots;
}

const newBot = async function (mapId, botNftId, xp, name, walletId, ownerEntityId, x, y, gameServerURL, dynamicNFTData, retry) {
  const options = { headers: { 'X-Api-Key': LOOPERLANDS_BACKEND_API_KEY } }
  const url = `${LOOPERLANDS_BACKEND_BASE_URL}/newBot`;
  try {
    let sessionRequest = {
      "nftId": botNftId,
      "mapId": mapId,
      "xp": xp,
      "name": name,
      "walletId": walletId,
      "owner": ownerEntityId,
      "x": x,
      "y": y,
      "gameServerURL": gameServerURL,
      "dynamicNFTData" : dynamicNFTData
    }
    const response = await axios.post(url, sessionRequest, options);
    printResponseJSON(url, response);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 409) {
      return error?.response?.data;
    }
    if (retry === undefined) {
      retry = MAX_RETRY_COUNT;
    }
    retry -= 1;
    if (retry > 0) {
      return this.newBot(mapId, botNftId, xp, name, walletId, ownerEntityId, x, y, gameServerURL, retry);
    } else {
      console.error("newBot", error);
    }
  }
}

const getShopInventory = async function (shopId) {
  const options = { headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' } }
  const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/shopInventory.php?shopName=${shopId}`;
  const shopResponse = await axios.get(url, options);
  try {
    printResponseJSON(url, shopResponse);
    return shopResponse.data;
  } catch (error) {
    console.log("getShopInventory", error)
    return null;
  }
}

const getResourceBalance = async function (nftId, itemId) {
  const options = { headers: { 'X-Api-Key': API_KEY } };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/loadConsumableItem.php?nftId=${nftId}&itemId=${itemId}`
    const response = await axios.get(url, options);
    printResponseJSON(url, response);
    return response.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error getting resource balance" };
  }
}

const updateResourceBalance = async function (nftId, itemId, quantity) {
  const options = { headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' } };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/saveConsumable2.php`;
    const update = { avatarId: nftId, itemId: itemId, quantity: quantity };
    const response = await axios.post(url, update, options);
    printResponseJSON(url, response);
    return response.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error updating resource balance" };
  }
}

// Default resource to gold when not specified
const transferResourceFromTo = async function (from, to, amount, resource = Types.Entities.GOLD) {
  if (amount <= 0) return false;

  try {
    const fromBalanceStart = await getResourceBalance(from, resource);
    const toBalanceStart = await getResourceBalance(to, resource);

    if (fromBalanceStart >= amount) {
      await updateResourceBalance(from, resource, -amount);
      await updateResourceBalance(to, resource, amount);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
    if (fromBalanceStart && toBalanceStart) {
      const fromBalanceCurrent = await getResourceBalance(from, resource);
      const toBalanceCurrent = await getResourceBalance(to, resource);
      if (fromBalanceStart > fromBalanceCurrent) {
        await updateResourceBalance(from, resource, fromBalanceStart - fromBalanceCurrent);
      }
      if (toBalanceStart > toBalanceCurrent) {
        await updateResourceBalance(to, resource, toBalanceStart - toBalanceCurrent);
      }
    }
    return { "error": "Error transferring resource" };
  }
}

const completePartnerTask = async function(walletId, taskId) {
  const options = { headers: { 'X-Api-Key': API_KEY } };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/partnerTasks.php?walletID=${walletId}&task=${taskId}`
    const response = await axios.get(url, options);
    printResponseJSON(url, response);
    return response.data;
  } catch (error) {
    console.error(error);
    return { "error": "Error completing partner task" };
  }
}

const getPartnerTask = async function(walletId, taskId) {
  const options = { headers: { 'X-Api-Key': API_KEY } };
  try {
    const url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/partnerTasksRpt.php?walletID=${walletId}&task=${taskId}`
    const response = await axios.get(url, options);
    printResponseJSON(url, response);
    return response.data[0];
  } catch (error) {
    console.error(error);
    return { "error": "Error completing partner task" };
  }
}

const getInventory = async function(walletId, nftId) {
  let url = `${LOOPWORMS_LOOPERLANDS_BASE_URL}/looperInventoryDetails.php?walletID=${walletId}&nftId=${nftId}&APIKEY=${API_KEY}`;
  let rcvInventory = await axios.get(url);
  printResponseJSON(url, rcvInventory);
  return rcvInventory;
}

module.exports = {
  updateExperience,
  saveWeapon,
  loadWeapon,
  loadMapFlow,
  walletHasNFT,
  updatePVPStats,
  saveNFTWeaponTrait,
  saveNFTWeaponExperience,
  saveNFTSpecialItemTrait,
  saveNFTSpecialItemExperience,
  loadNFTWeapon,
  getSpecialItem,
  saveAvatarMapAndCheckpoint,
  saveLootEvent,
  getItemCount,
  avatarHasItem,
  saveMobKillEvent,
  loadAvatarGameData,
  setQuestStatus,
  saveConsumable,
  getBots,
  newBot,
  getShopInventory,
  getResourceBalance,
  updateResourceBalance,
  transferResourceFromTo,
  completePartnerTask,
  getPartnerTask,
  getInventory
};
