const dao = require('../dao.js');

const main = require('./main.js');

const STATES = {
  IN_PROGRESS: "IN_PROGRESS", // picked up from an NPC
  COMPLETED: "COMPLETED", // completed but not turned in
  FINISHED: "FINISHED" // completed and turned in
}

// Put new quests from other files here
let maps = [main.quests]

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

exports.quests = quests;

exports.handleNPCClick = function (sessionData, npcId) {
  let npcQuests = questsByNPC[npcId];
  if (npcQuests) {
    let npcQuestIds = npcQuests.map(quest => quest.id);
    let avatarQuestIds = sessionData.gameData.quests.map(quest => quest.id);
    for (const questId of npcQuestIds) {
      if (!avatarQuestIds.includes(questId)) {
        dao.setQuestStatus(sessionData.nftId, questId, STATES.IN_PROGRESS);
      }
    }
  }
}