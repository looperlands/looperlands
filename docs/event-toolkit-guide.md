# LooperLands Event Toolkit

An organizer and player guide | Edition 1 | 8 October 2026

Run a fishing tournament, harvest festival, monster hunt or team challenge with configurable scoring, sign-ups, equipment and prizes. Each competition has its own rules, rounds and leaderboard.

This guide describes the implemented features. Before announcing a scored event, ask an administrator to confirm tracking is enabled on its game servers. Rentals and scheduled announcements also need their respective services enabled. Publishing the website alone does not activate these services.

## 1. Create your first event

Open **Creator Events** or **Admin Events**, then select **Create with a template**. The wizard has three steps: choose a template, set up the event, and review. **Open event editor** creates a local draft; it does not save, publish or start an event. Complete the editor and submit it for review. An approved competition becomes available to players.

| Template | A useful starting point |
| --- | --- |
| Harvest festival | Score planting, harvesting or other successful crop actions. |
| Monster hunt | Give selected enemies different point values. |
| Fishing competition | Choose lakes, fish and how catches count. |
| Active playtime | Reward active seconds, with a daily points cap. |
| Active days | Reward participation on different UTC days. |
| Team competition | Start with sign-ups and balanced team assignment. |

Templates are editable starting points. Review every setting, including automation: new templates initially enable start/end/winner announcements and automatic finalization with a five-minute wait. For a first pilot, turn these off and use no prizes.

The editor separates **Event details**, **Scoring**, **Players & teams**, **Equipment & levels**, **Prizes** and **Automation**. All sections save together. Event details hold the schedule, description and meeting point; write any extra public rules there.

Set future start and end times. The wizard labels dates in your local time; its review also shows UTC. Daily caps and active-day boundaries always use UTC. Recurring events can repeat by day, week or month, with separate rounds, registrations and results. **Duplicate setup** creates a fresh submission without copying players or scores.

<!-- pagebreak -->

## 2. Choose what earns points

Use **Scoring** to choose scoring maps, a player or Looper leaderboard, and one or more weighted rules. Player scoring combines a wallet's Loopers; Looper scoring gives each avatar its own entry. Teams and automatic item prizes require player scoring.

| Activity | What can count |
| --- | --- |
| Tile actions | Successful prepare, plant, water, care/boost or harvest actions, where the map supports them. Filter by action, stage and crop. |
| Enemy kills | All enemies or selected mobs, each with its own weight. |
| Items collected | Tracked loot quantities or successful collection actions. |
| Fish caught | Successful awarded catches, filtered by lake and species. |
| PvP kills | Tracked player kills. |
| Active playtime | Active seconds, rather than all connected time. |
| Active days | One award per qualifying UTC day for each matching active-day rule. |

Targets come from the running game's catalog. An unavailable server can leave options missing; confirm coverage before opening a scored competition. Generic tile scoring only works where the game's action implementation emits tracking data.

Choose **action/catch count** when each success should count once. Choose **quantity** when every produced or awarded item should count. A double fishing catch counts as one successful catch or two fish, depending on the measurement. Failed catches, purchases and ordinary fish loot do not earn fishing points.

Rules add together when they overlap. For example, one point for every fish plus four bonus points for a selected species gives that species five points per fish. Use distinct targets if you want replacement weights.

An empty scoring-map selection allows all tracked maps. A **daily cap** limits the participant's combined points, resetting at midnight UTC; it applies before team totals. A **milestone** marks a personal target. A **community goal** shows collective progress. Zero disables a cap or goal.

Playtime starts from recorded tracking data; earlier hours cannot be reconstructed. Active time uses an inactivity window, so a short idle period after an action can still count. It is not proof of attentive human play. For prize events, activity goals and daily caps are useful alternatives to unlimited time scoring.

<!-- pagebreak -->

## 3. Set up players, teams and equipment

### Participation and teams

Open events count qualifying gameplay automatically. Required sign-ups count only activity after the player's registration and within the round. Team events always require sign-ups.

Configure **2-8 teams** with your own names and colors. Red and blue are starting examples, not a restriction. Balanced assignment puts a new entrant into a smallest team by player count; it does not balance skill or levels. Manual assignment leaves the player awaiting an organizer's decision. Unassigned players do not score for a team.

Assign players or balance the roster before the round starts. Team assignment locks at the start; the round's team definitions and participation setup are preserved once someone signs up. Late joins are optional for supported configurations, but cannot be used with manual assignment. Late entrants receive no earlier points. Withdrawal through the town board is available before the start.

### Shared or team-specific rentals

In **Equipment & levels**, enable event equipment, require sign-ups and select explicit scoring maps. Give **All signed-up players** a shared avatar, weapon or both. This works without teams. Add team-specific loadouts for different appearances or weapons.

A team loadout replaces the shared loadout for that team; specify both pieces there if both are needed. Pick public rentables or assets owned by the organizer. The picker supports filtering by name. Rentals grant temporary access, not NFT ownership.

Players choose assigned rentals from the normal avatar and weapon lists while the round is live. Gear is not forced onto them automatically. A session using an expired private event loan closes so the player can select their own gear. Ordinary rental access continues independently.

### Fair levels

Set an avatar and/or combat-weapon level, or leave either empty to retain normal levels. Overrides apply to signed-up players on the scoring maps during the round, including other gear they choose. Stored XP is preserved and can still increase normally.

Fishing rods keep normal levels. Traits, weapon characteristics and other bonuses are not equalized. Avoid overlapping events with conflicting level rules for the same players and maps.

<!-- pagebreak -->

## 4. Configure prizes

Use **Prizes** to choose each reward's name, recipients and delivery method. Only participants with a qualifying positive score receive awards. Each recurring round has its own awards.

| Recipient rule | Who receives the award |
| --- | --- |
| Finishing positions | Players in a configured rank range, such as first place or the top three. |
| Milestone | Every scoring participant who reaches the configured milestone. |
| Winning team | Scoring contributors to the winning team, rather than every signed-up member. |

### Automatic in-game items

Select **Automatic - in-game items**, a transferable item and the quantity per winner. Use player scoring. The item list comes from the game; it does not transfer NFT ownership or rental rights.

A **funding Looper is optional**. With one selected, prizes transfer existing stock from an owned, non-public Looper. Keep that inventory stocked. Without one, the approved reward quantity is granted directly. Unfunded prize definitions are part of approval; changes on an approved event require an administrator.

Items go to the winner's most recently played eligible owned, non-public Looper. A missing recipient inventory or insufficient funding stock leaves the award pending. Organizer tools show delivery status and support retries. Successful item awards are recorded so retries do not grant them again.

### Manual tree-house, NFT or external prizes

Choose **Manual - track delivery** for a private tree house, NFT or another external reward. Deliver it yourself, then mark that specific award delivered in **Organizer tools**. Recording delivery does not send or assign the prize.

### Tie rules

Equal individual scores use the earliest last scoring timestamp, then the participant ID. Equal team totals use team ID order. These rules are fixed; include them in your public description when they matter to the competition.

Results must be finalized before configured awards are prepared. The end time alone does not guarantee prize delivery: finalization and any scheduled processing still need to run.

<!-- pagebreak -->

## 5. Run and finish the competition

In **Automation**, choose the tasks for each round. The scheduled event service must be enabled by an administrator for these tasks and queued retries to run.

| Switch | Behavior |
| --- | --- |
| Announce the start | Show an in-game banner when the round starts. |
| Announce the end | Tell players scoring has stopped and results are being prepared. |
| Finalize results automatically | Freeze standings after the tracking wait and prepare configured prizes. |
| Announce the winner | Announce the winning player or team after finalization. |

Choose **All online players** or **Only players on the event maps** as the announcement audience. Start/end banners expire if undelivered for five minutes. Winner announcements and pending delivery requests retry; a server restart during an uncertain response can repeat a banner, while successful item awards stay recorded.

### At the end

Scoring stops at the scheduled end, even with automatic finalization off. Allow the **tracking wait** for queued gameplay records to arrive; the minimum is two minutes and new templates use five minutes. Ask an administrator to check the backlog before finalizing. Use a longer wait if servers are behind.

With automatic finalization off, use **Organizer tools** to finalize manually after the wait. When standings are frozen, later activity cannot change them. Do not finalize just because the on-screen timer has reached zero.

Export a CSV for your records and inspect award statuses. Retry pending item deliveries after correcting stock or recipient issues. Send manual prizes separately and record their delivery afterward. Manual finalization attempts configured item delivery immediately. The scheduled service handles ongoing prize retries, queued game updates and winner announcements; Organizer tools also offer a manual prize retry.

### Before opening sign-ups

Confirm the schedule, maps, scoring measurement, rule overlap, UTC cap, team names, assignment, equipment and prizes. Check the tracking-since date and all intended servers. Ask an administrator to confirm tracking, rental access and scheduled processing as needed. Review the player-facing rules, then submit for approval.

Started rounds retain their rules. Use a new submission or **Duplicate setup** for a changed competition rather than promising changes to an already running round.

<!-- pagebreak -->

## 6. Help players take part

### On the website

Go to [LooperLands leaderboards](https://looperlands.io/leaderboards?tab=events) and choose the **Events** tab. Event cards have **View standings** and **Competition rules** or **Rules & sign-up** buttons. On an approved event's page, select the correct round and use **Standings**, **Rules & prizes** and **My playtime**. Eligible organizers also see **Organizer tools**.

For required registration, connect your wallet and sign up before the deadline. Open participation needs no sign-up. Your registration belongs to a particular round, not every future edition of the event.

### In the game

Visit the town notice board on the grass beside the rock near spawn on the main map and use **View events**. Browse **Coming up**, **Live now** or **My events**, review the rules, then confirm sign-up. Team assignment can be immediate or pending, depending on the organizer's setup. **Full event page** opens the website.

During a running round, a compact panel shows a timer, personal score/rank, team totals and the top five. It appears only on linked event maps. If several rounds are active there, select one. With all-map scoring, the panel uses the event's location map; without a scoring or location map, there is no contextual panel. The board remains available between events.

Standings refresh periodically rather than after every action. If points are missing, check the round, map, sign-up/team status, rule target and daily cap, then allow time for activity delivery. Contact the organizer if the score still looks wrong. Do not assume historical hours or idle connected time earn points.

### Three example events

- **Fishing afternoon:** choose one scoring map and lake, score one point per awarded fish, and add four bonus points for a selected rare species. Require sign-up; give the top three a configured reward after finalization.
- **Harvest team challenge:** create Forest, Moon and Sun teams with balanced sign-ups. Score two points per harvested item and cap each player at 100 daily points. Offer a shared loadout or separate team avatars and weapons.
- **Community participation week:** use active days at one point per UTC day, a three-point personal milestone and a collective goal. Keep prizes manual or run without prizes. This rewards returning on different days instead of staying online longest.

Start with a short no-prize pilot and a few players before advertising a large prize competition.

More detail: [game tracking notes](event-tracking.md), [platform configuration reference](https://github.com/balkshamster/looperlands-platform/blob/main/docs/event-toolkit.md) and [rollout plan](https://github.com/balkshamster/looperlands-platform/blob/main/docs/event-toolkit-deploy-plan.md).
