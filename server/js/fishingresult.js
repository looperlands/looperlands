// A successful result consumes the server-selected catch exactly once.
async function completeFishingCatch(player, success, bullseye, {lakes, messages, discord, names}) {
    const fish = player.pendingFish;
    player.pendingFish = null;
    if (success !== true || !fish || !lakes[fish.lakeName]?.fish?.[fish.name]) return null;

    const quantity = fish.double ? 2 : 1;
    const experience = (bullseye === true ? Math.round(fish.exp * 1.5) : fish.exp) * quantity;
    await player.playerEventBroker.lootEvent({kind: fish.name}, quantity);
    const activity = {target: String(fish.name), quantity, lake: fish.lakeName, rarity: lakes[fish.lakeName].fish[fish.name]};
    player.server.server.activity?.record(player, 'fishing', activity);
    player.incrementNFTSpecialItemExperience(experience);
    player.handleExperience(experience);
    player.server.pushToPlayer(player, new messages.Kill(fish.name, experience));
    discord.sendMessage(`🐟 **${player.name}** caught *${names.getName(fish.name)}!*${quantity === 1 ? '' : ' **[x2]**'} (Lake Level ${fish.lakeLvl})`);
    return activity;
}
module.exports = {completeFishingCatch};
