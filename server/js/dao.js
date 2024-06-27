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
const MAX_RETRY_COUNT = 1;

const DEBUG = false;
const printResponseJSON = function (url, response) {
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

// Process a single transaction
const saveLootEvent = async function (nftId, itemId, amount = 1) {          // Default amount to 1 if undefined
  LOOT_EVENTS_QUEUE.push({ nftId: nftId, item: String(itemId), amount })

  if (LOOT_QUEUE_INTERVAL === undefined) {
    LOOT_QUEUE_INTERVAL = setInterval(processLootEventQueue, 1000 * 30);    // Set LootEventQueue to process every 30 seconds
  }

}

// Process multiple transactions at once
const saveMultiLootEvent = function (transactions) {
  const newEvents = transactions.map(transaction => {
    const { nftId, itemId, quantity = 1 } = transaction;
    return { nftId, item: String(itemId), amount: quantity };
  });

  LOOT_EVENTS_QUEUE.push(...newEvents);

  if (LOOT_QUEUE_INTERVAL === undefined) {
    LOOT_QUEUE_INTERVAL = setInterval(processLootEventQueue, 1000 * 30);  // Set LootEventQueue to process every 30 seconds
  }
}


const getItemCount = async function (avatarId, itemId, retry) {
  try {
    const response = await platformClient.getInventoryItem(avatarId, String(itemId));
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
  try {
    let response = await platformClient.storeKills(MOB_KILL_QUEUE);
    printResponseJSON('storeKills', response);
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
  MOB_KILL_QUEUE.push({ nftId: avatarId, mob: mobId, amount: 1 });
}

const loadAvatarGameData = async function (avatarId, retry) {
  try {
    const response = await platformClient.getGameData(avatarId);
    printResponseJSON('getGameData', response);
    let responseData = response;

    let mobKills = responseData.kills;
    let items = responseData.items.reduce((avatarItems, itemCount) => {
      const itemId = itemCount.item;
      if (itemId) {
        avatarItems[itemId] = itemCount.quantity;
      }
      return avatarItems;
    }, {});

    let quests = responseData.quests.reduce((avatarQuests, quest) => {
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

    return {
      mobKills: mobKills,
      quests: quests,
      items: items,
    };
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
  try {
    const response = await platformClient.setQuestsStatus(avatarId, questId, status);
    printResponseJSON('setQuestStatus', response);
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
  this.saveLootEvent(nft, item, qty);
  await processLootEventQueue();
}

const getBots = async function (walletId) {
  let botsResponse = await platformClient.getCompanions(walletId);
  printResponseJSON('getCompanions', botsResponse);
  return botsResponse;
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
      "dynamicNFTData": dynamicNFTData
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
  return await getItemCount(nftId, itemId);
}

// Process a Group of Transactions or a Single Transaction
const updateResourceBalance = async function (nftId_or_transactionData, itemId = Types.Entities.GOLD, quantity = 1) {
  if (Array.isArray(nftId_or_transactionData)) {
    // Group >> updateResourceBalance(transactionData) >> pass an array where each index contains {nftId, itemId, quantity}
    const transactionData = nftId_or_transactionData;
    saveMultiLootEvent(transactionData);
  } else {
    // Single >> updateResourceBalance(nftId, itemId, quantity) >> pass nftId, itemId (defaults to GOLD), quantity (defaults to 1)
    const nftId = nftId_or_transactionData;
    saveLootEvent(nftId, itemId, quantity);
  }
  await processLootEventQueue();
}

// Transfer a Resource from one account to another (default: SEND 1 GOLD)
const transferResourceFromTo = async function (from, to, amount = 1, resource = Types.Entities.GOLD) {
  if (amount <= 0) return false;

  const fromBalance = await getResourceBalance(from, resource); // CHECK BALANCE OF ACCOUNT SENDING 
  if (fromBalance >= amount) {
    const transactionData = [
      { nftId: from, itemId: resource, quantity: -amount },     // ACCOUNT SENDING
      { nftId: to, itemId: resource, quantity: amount },        // ACCOUNT RECEIVING
    ];
    saveMultiLootEvent(transactionData);
    await processLootEventQueue();
    return true; // TRANSFER SUCCESSFUL
  } else {
    console.log(`[TRANSFER FAIL] ${from} ${resource} balance [${fromBalance}] is less than transfer requested [${amount}] to ${to}`);
    return false; // TRANSFER FAIL
  }
}

const completePartnerTask = async function (walletId, taskId) {
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

const getPartnerTask = async function (walletId, taskId) {
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

const getInventory = async function (walletId, nftId) {
  let rcvInventory = await platformClient.getInventory(walletId, nftId)
  printResponseJSON('getInventory', rcvInventory);
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
  saveMultiLootEvent,
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
