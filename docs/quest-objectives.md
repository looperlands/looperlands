# Configurable objectives in the existing quest engine

New quests can declare an `objectives` array rather than a single event/target. Each objective has a stable `id`, a player-facing `label`, an `eventType`, a `target` and optional `amount`. Existing single-objective quest definitions retain their current behavior.

Supported objective events:

- `NPC_TALKED`: numeric NPC kind, optionally a registered `npcKey` to identify one placed actor.
- `AREA_ENTERED`: existing scene/area name or ID, emitted by the server area event broker.
- `KILL_MOB`: mob kind, optionally an `{x, y, width, height}` area. Only actual combat events while the quest/objective is active count; previous lifetime kills do not.
- `LOOT_ITEM`: normal inventory/resource kind. The broker supplies the converted collectable kind and quantity; collection is counted from acceptance of the active objective.
- `DELIVER_ITEM`: normal resource/item kind and amount, with `recipient: {npc, npcKey?}` or `recipient: {area}`. The target NPC interaction or place entry confirms a hand-in only with enough real inventory.

Objectives are ordered by default. Earlier events do not pre-complete later steps. Set `ordered: false` for independent non-delivery objectives. A delivery must be the final ordered objective; this keeps hand-in and the existing completion-time item debit together. Quests with `needToReturn`/`returnToNpc` retain their existing reporting step: items are deducted at that final completion, and stock is rechecked then.

Example configuration:

```js
{
  id: 'FRIEND_SUPPLIES', name: 'Supplies for a Friend', npc: 40,
  startText: 'Ask your friend what to bring.', endText: 'Thank you for coming.',
  objectives: [
    {id: 'ask', label: 'Talk to your friend', eventType: 'NPC_TALKED', target: 41, npcKey: 'friend'},
    {id: 'visit', label: 'Visit the forest', eventType: 'AREA_ENTERED', target: 'Forest'},
    {id: 'collect', label: 'Collect three supplies', eventType: 'LOOT_ITEM', target: 5, amount: 3},
    {id: 'bring', label: 'Bring the supplies to your friend', eventType: 'DELIVER_ITEM', target: 5, amount: 3, recipient: {npc: 41, npcKey: 'friend'}}
  ]
}
```

The existing PlayerQuestEventConsumer owns progression and completion. The existing broker serializes asynchronous events per avatar. Objective facts use a namespaced `quest-progress:` key in the backend's existing saved-choice storage and survive reconnects; they are not inventory and are not player story decisions. Actual items stay in ordinary resource balances. No new story tracker, virtual satchel, world inspection endpoint or passage mechanism is introduced. The normal quest-log endpoint includes objective labels/counts.

Completion-time item debits, status writes and rewards retain the legacy engine's separate backend calls. They are not one backend transaction; full transactional/idempotent hand-ins require a platform API change. Tests verify the engine's normal duplicate-completion guard and progress-write failure/retry, rather than claiming a new transaction guarantee.
