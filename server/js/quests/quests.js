const dao = require('../dao.js');
const Formulas = require('../formulas.js');

const main = require('./main.js');
const oa = require('./oa.js');
const cobsfarm = require('./cobsfarm.js');

const STATES = {
  IN_PROGRESS: "IN_PROGRESS", // picked up from an NPC
  COMPLETED: "COMPLETED", // completed but not turned in
  FINISHED: "FINISHED" // completed and turned in
}

// Put new quests from other files here
let maps = [main.quests, oa.quests, cobsfarm.quests]

function findDuplicateValues(arr) {
  const frequencyMap = {};
  const duplicates = [];

  for (const item of arr) {
    if (!frequencyMap[item]) {
      frequencyMap[item] = 1;
    } else {
      if (frequencyMap[item] === 1) {
        duplicates.push(item);
      }
      frequencyMap[item]++;
    }
  }

  return duplicates;
}

const quests = maps.flat();
let ids = quests.map(quest => quest.id);
let duplicateIds = findDuplicateValues(ids);

if (duplicateIds.length !== 0) {
  console.error("Duplicate quest IDs found so exiting: ", duplicateIds)
  process.exit(1);
}

for (const quest of quests) {
  if (quest.id.length > 100) {
    console.error("Quest ID is too long: ", quest);
    process.exit(1);
  }
  let target = quest.target;
  if (Types.isMob(target) && quest.eventType !== "KILL_MOB") {
    console.error("Quest target is a mob but event type is not KILL_MOB: ", quest);
    process.exit(1);
  }

  if (Types.isItem(target) && quest.eventType !== "LOOT_ITEM") {
    console.error("Quest target is an item but event type is not LOOT_ITEM: ", quest);
    process.exit(1);
  }
}

const questsByNPC = quests.reduce((acc, quest) => {
  if (acc[quest.npc]) {
    acc[quest.npc].push(quest);
  } else {
    acc[quest.npc] = [quest];
  }
  return acc;
}, {});

const questsByID = quests.reduce((acc, quest) => {
  acc[quest.id] = quest;
  return acc;
}, {});

exports.handleNPCClick = function (cache, sessionId, npcId) {
  let npcQuests = questsByNPC[npcId];
  let sessionData = cache.get(sessionId);
  let msgText = "";
  if (npcQuests) {
    let npcQuestIds = npcQuests.map(quest => quest.id);

    for (const questID of npcQuestIds) {
      msgText = handoutQuest(questID, sessionData);
      if(msgText) {
        break;
      }
    }

    cache.set(sessionId, sessionData);
  }
  return msgText;
}

exports.newQuest = function (cache, sessionId, questID) {
    let sessionData = cache.get(sessionId);
    let msgText = handoutQuest(questID, sessionData);
    cache.set(sessionId, sessionData);

    return msgText;
}

exports.completeQuest = function (cache, sessionId, questID) {
  let sessionData = cache.get(sessionId);
  completeQuest(questID, sessionData);
  cache.set(sessionId, sessionData);

  let quest = questsByID[questID];
  return quest.endText ?? null;
}

function handoutQuest(questID, sessionData) {
  let newQuest = questsByID[questID];

  if(_.isEmpty(newQuest)) {
    return "";
  }

  if (newQuest.requiredQuest && !avatarHasCompletedQuest(newQuest.requiredQuest, sessionData.gameData.quests)) {
      return "";
  }

  if (newQuest.requiredLevel && Formulas.level(sessionData.xp) < newQuest.requiredLevel) {
      return "";
  }

  if (avatarHasQuest(questID, sessionData.gameData.quests)) {
    return "";
  }

  startQuest(sessionData, questID);

  return newQuest.startText;
}

function avatarHasQuest(questId, avatarQuests) {
  if(_.isEmpty(avatarQuests)) {
    return false;
  }

  for (const [status, quests] of Object.entries(avatarQuests)) {
    for (const quest of quests) {
      if(quest.questID === questId) {
        return true;
      }
    }
  }

  return false;
}

function avatarHasCompletedQuest(questId, avatarQuests) {
  let completed = avatarQuests[STATES.COMPLETED];
  if (completed !== undefined) {
    for (const quest of completed) {
      if(quest.questID === questId) {
        return true;
      }
    }
  }

  return false;
}

function startQuest(sessionData, questID) {
  dao.setQuestStatus(sessionData.nftId, questID, STATES.IN_PROGRESS);
  let inProgressQuests = sessionData.gameData.quests[STATES.IN_PROGRESS];
  let questInCacheFormat = {questID: questID, status: STATES.IN_PROGRESS};
  if (!inProgressQuests) {
    sessionData.gameData.quests[STATES.IN_PROGRESS] = [questInCacheFormat];
  } else {
    sessionData.gameData.quests[STATES.IN_PROGRESS].push(questInCacheFormat);
  }
}

function completeQuest(questID, sessionData) {
  if(_.isEmpty(sessionData?.gameData?.quests)) {
    return;
  }

  if(!avatarHasQuest(questID, sessionData.gameData.quests ?? {})) {
    return;
  }

  dao.setQuestStatus(sessionData.nftId, questID, STATES.COMPLETED);
  let completedQuests = sessionData.gameData.quests[STATES.COMPLETED];
  let questInCacheFormat = {questID: questID, status: STATES.COMPLETED};
  if (!completedQuests) {
    sessionData.gameData.quests[STATES.COMPLETED] = [questInCacheFormat];
  } else {
    sessionData.gameData.quests[STATES.COMPLETED].push(questInCacheFormat);
  }

  sessionData.gameData.quests[STATES.IN_PROGRESS] = sessionData.gameData.quests[STATES.IN_PROGRESS].filter(q => q.id !== questID);
}

exports.questsByID = questsByID;
exports.STATES = STATES;