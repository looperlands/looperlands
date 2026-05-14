#!/usr/bin/env node

const express = require("express");
const dbFactory = require("./db.js");

const db = dbFactory();
const app = express();
const farmPlots = new Map();
const itemBalances = new Map();
const assetInfoStore = new Map();
const equippedStore = new Map();

const DEFAULT_WALLET = "0x1e8ab2cc09be581530bb9f3ac94353f6f7412239";
const DEFAULT_NFT = "0x82cc76a59d06847148704f158b2ba51b5854c5ee3b2e9314fc36c093a919530a";
const LOCAL_WALLET = process.env.LOCAL_WALLET || DEFAULT_WALLET;
const LOCAL_NFT = process.env.LOCAL_NFT || DEFAULT_NFT;
const LOCAL_ALLOW_ALL_OWNERSHIP = process.env.LOCAL_ALLOW_ALL_OWNERSHIP !== "0";
const DEFAULT_TRAIT = process.env.LOCAL_TRAIT || "rogue";

const DEFAULT_MODIFIERS = {
    meleeDamageDealt: 1,
    meleeDamageTaken: 1,
    moveSpeed: 1,
    rangedDamageDealt: 1,
    hpRegen: 1,
    maxHp: 1,
    hate: 1,
    attackRate: 1,
    stealth: 1,
    xp: 1,
    fishing: 1
};

const DEFAULT_CLASSES = {
    fighter: {description: "Local fighter", modifiers: {...DEFAULT_MODIFIERS, meleeDamageDealt: 1.1}},
    ranger: {description: "Local ranger", modifiers: {...DEFAULT_MODIFIERS, rangedDamageDealt: 1.1}},
    tank: {description: "Local tank", modifiers: {...DEFAULT_MODIFIERS, meleeDamageTaken: 0.9, maxHp: 1.2}},
    rogue: {description: "Local rogue", modifiers: {...DEFAULT_MODIFIERS, moveSpeed: 1.1}}
};

const DEFAULT_ITEM_BALANCES = {
    "78003900": 50,
    "78004100": 1,
    "78004200": 1,
    "21300040": 100
};

app.use(express.json({limit: "4mb"}));

function normalize(value) {
    return String(value || "").toLowerCase();
}

function matches(a, b) {
    return normalize(a) === normalize(b);
}

function rows(name) {
    return Array.isArray(db[name]) ? db[name] : [];
}

function findRow(name, predicate) {
    return rows(name).find(predicate);
}

function findValue(name, predicate, fallback) {
    const row = findRow(name, predicate);
    return row && row.value !== undefined ? row.value : fallback;
}

function parseMaybeJson(value, fallback) {
    if (typeof value !== "string") {
        return value ?? fallback;
    }

    try {
        return JSON.parse(value);
    } catch (_error) {
        return fallback;
    }
}

function localWalletOwns(wallet, nft) {
    if (LOCAL_ALLOW_ALL_OWNERSHIP && matches(wallet, LOCAL_WALLET)) {
        return true;
    }

    return rows("nft_ownership").some((row) => {
        return matches(row.wallet, wallet) && matches(row.nft, nft) && row.value === true;
    }) || (matches(wallet, LOCAL_WALLET) && matches(nft, LOCAL_NFT));
}

function localWalletOwnsCollection(wallet, collection) {
    if (LOCAL_ALLOW_ALL_OWNERSHIP && matches(wallet, LOCAL_WALLET)) {
        return true;
    }

    return rows("collection_ownership").some((row) => {
        return matches(row.wallet, wallet) && matches(row.collection, collection) && row.value === true;
    });
}

function genericNft(nftId, assetType = "looper") {
    return {
        id: `local-${nftId}`,
        token: {
            chainId: 1,
            contractAddress: "0x0000000000000000000000000000000000000000",
            tokenId: nftId,
            type: "erc1155",
            tokenHash: nftId,
            l2: "loopring"
        },
        name: "Local NFT",
        assetType,
        collection: "Local Debug",
        options: {shadow: true},
        freeToPlay: false,
        gameData: null
    };
}

function transformGameData(nftId) {
    const value = findValue("loadItemConsumableMobQuest.php", (row) => matches(row.NFTID, nftId), null);
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) {
        return {
            kills: {},
            items: Object.entries(DEFAULT_ITEM_BALANCES).map(([item, quantity]) => ({item, quantity})),
            quests: [],
            choices: []
        };
    }

    const kills = {};
    for (const mob of raw.mobJson || []) {
        kills[mob.mobId] = mob.iCount;
    }

    const items = [];
    for (const item of raw.itemJson || []) {
        items.push({item: String(item.itemId), quantity: item.iCount});
    }
    for (const item of raw.itemConsumableJson || []) {
        items.push({item: String(item.itemConsumableId), quantity: item.iCount});
    }
    for (const [item, quantity] of Object.entries(DEFAULT_ITEM_BALANCES)) {
        if (!items.some((entry) => String(entry.item) === item)) {
            items.push({item, quantity});
        }
    }

    const quests = (raw.questJson || []).map((quest) => ({
        questKey: quest.questID,
        status: quest.status
    }));

    return {kills, items, quests, choices: raw.choiceJson || []};
}

function getAssetInfo(nftId) {
    if (assetInfoStore.has(normalize(nftId))) {
        return assetInfoStore.get(normalize(nftId));
    }

    const value = findValue("LoadNFTWeapon.php", (row) => matches(row.NFTID, nftId), null);
    if (value) {
        return {
            trait: value.trait || DEFAULT_TRAIT,
            xp: value.xp ?? value.experience ?? 0,
            class: value.class ?? value.weaponClass ?? null
        };
    }

    return {trait: DEFAULT_TRAIT, xp: 0, class: null};
}

function getEquipped(nftId) {
    if (equippedStore.has(normalize(nftId))) {
        return equippedStore.get(normalize(nftId));
    }

    const value = findValue("LoadWeapon.php", (row) => matches(row.NFTID, nftId), null);
    if (Array.isArray(value) && value[0]) {
        const parsed = parseMaybeJson(value[0], value[0]);
        return {weapon: parsed};
    }

    return {weapon: "sword1"};
}

function transformInventory(wallet, nftId) {
    const value = findValue("looperInventoryDetails.php", (row) => {
        return matches(row.walletID, wallet) && matches(row.nftId, nftId);
    }, null);
    const raw = Array.isArray(value) ? value[0] : value;

    if (!raw) {
        return {weapons: [], tools: [], companions: [], consumables: []};
    }

    return {
        weapons: (raw.weapons || []).map((item) => ({
            nftId: item.nftId,
            weaponName: item.weaponName,
            xp: item.xp || 0,
            trait: item.trait || item.Trait || "regular"
        })),
        tools: (raw.specialitems || []).filter((item) => item.nftId).map((item) => ({
            nftId: item.nftId,
            specialItemName: item.specialItemName,
            xp: item.xp || 0,
            trait: item.trait || item.Trait || "regular"
        })),
        companions: (raw.bots || []).map((item) => ({
            nftId: item.nftId,
            looperName: item.looperName,
            xp: item.xp || 0
        })),
        consumables: (raw.consumables || []).map((item) => ({
            item: String(item.itemId),
            quantity: item.iCount || 0
        }))
    };
}

function farmPlotKey(mapId, x, y) {
    return `${mapId}.${x}.${y}`;
}

function getItemBalance(nftId, itemId) {
    const key = `${normalize(nftId)}.${itemId}`;
    if (itemBalances.has(key)) {
        return itemBalances.get(key);
    }

    return DEFAULT_ITEM_BALANCES[String(itemId)] || 0;
}

function applyInventoryTransaction(transaction) {
    const nftId = transaction.nftId;
    const itemId = String(transaction.item ?? transaction.itemId);
    const amount = Number(transaction.amount ?? transaction.quantity ?? 0);
    const key = `${normalize(nftId)}.${itemId}`;
    itemBalances.set(key, getItemBalance(nftId, itemId) + amount);
}

app.get("/health", (_req, res) => {
    res.json({status: "ok", service: "local looperlands platform mock"});
});

app.put("/api/gameserver/:hostname", (req, res) => {
    res.json({ok: true, hostname: req.params.hostname, ...req.body});
});

app.post("/api/gameserver/:hostname/offline", (req, res) => {
    res.json({ok: true, hostname: req.params.hostname});
});

app.get("/api/maps/cornsino/spin", (_req, res) => {
    res.json({spin: 0});
});

app.get("/api/asset/nft/:nft/owns", (req, res) => {
    res.json(localWalletOwns(req.query.wallet, req.params.nft));
});

app.get("/api/collection/:collection/owns", (req, res) => {
    res.json(localWalletOwnsCollection(req.query.wallet, req.params.collection));
});

app.get("/api/asset/nft/:nft", (req, res) => {
    const nftId = req.params.nft;
    const value = findValue("nft_data", (row) => matches(row.nft, nftId), null);
    res.json(value || genericNft(nftId));
});

app.get("/api/game/asset/equipped/:nftId", (req, res) => {
    res.json(getEquipped(req.params.nftId));
});

app.post("/api/game/asset/equip", (req, res) => {
    equippedStore.set(normalize(req.body.nftId), {weapon: req.body.equipped || "sword1"});
    res.json({ok: true});
});

app.get("/api/game/asset/info/:nftId", (req, res) => {
    res.json(getAssetInfo(req.params.nftId));
});

app.post("/api/game/asset/trait", (req, res) => {
    const current = getAssetInfo(req.body.nftId);
    const next = {...current, trait: req.body.trait || current.trait || DEFAULT_TRAIT};
    assetInfoStore.set(normalize(req.body.nftId), next);
    res.json(next);
});

app.post("/api/game/asset/xp", (req, res) => {
    const current = getAssetInfo(req.body.nftId);
    const next = {...current, xp: Number(current.xp || 0) + Number(req.body.xp || 0)};
    assetInfoStore.set(normalize(req.body.nftId), next);
    res.json(next);
});

app.post("/api/game/asset/position", (_req, res) => {
    res.json({ok: true});
});

app.post("/api/game/asset/pvp", (_req, res) => {
    res.json({ok: true});
});

app.post("/api/game/asset/kill", (_req, res) => {
    res.json({ok: true});
});

app.get("/api/game/asset/data/:nftId", (req, res) => {
    res.json(transformGameData(req.params.nftId));
});

app.post("/api/game/asset/quest", (_req, res) => {
    res.json({ok: true});
});

app.post("/api/game/asset/choice", (_req, res) => {
    res.json({ok: true});
});

app.get("/api/game/asset/inventory/:nftId/:itemId", (req, res) => {
    res.json({amount: getItemBalance(req.params.nftId, req.params.itemId)});
});

app.post("/api/game/inventory/transactions", (req, res) => {
    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    transactions.forEach(applyInventoryTransaction);
    res.json({ok: true});
});

app.get("/api/game/wallet/inventory/:wallet/:nftId", (req, res) => {
    res.json(transformInventory(req.params.wallet, req.params.nftId));
});

app.get("/api/game/wallet/:wallet/companions", (_req, res) => {
    res.json([]);
});

app.get("/api/game/modifiers/traits", (_req, res) => {
    res.json(DEFAULT_CLASSES);
});

app.get("/api/game/asset/modifiers/:server/:nftId", (_req, res) => {
    res.json(DEFAULT_MODIFIERS);
});

app.get("/api/game/rental/free/:nftId/:wallet", (req, res) => {
    res.json({ok: true, nftId: req.params.nftId, wallet: req.params.wallet});
});

app.get("/api/game/shop/inventory/:shopName", (_req, res) => {
    res.json([]);
});

app.get("/api/game/farming/plots", (req, res) => {
    const mapId = req.query.map;
    res.json(Array.from(farmPlots.values()).filter((plot) => plot.mapId === mapId));
});

app.get("/api/game/farming/plot/:mapId/:x/:y", (req, res) => {
    res.json(farmPlots.get(farmPlotKey(req.params.mapId, req.params.x, req.params.y)) || null);
});

app.put("/api/game/farming/plot", (req, res) => {
    const plot = req.body;
    farmPlots.set(farmPlotKey(plot.mapId, plot.x, plot.y), plot);
    res.json(plot);
});

app.delete("/api/game/farming/plot/:mapId/:x/:y", (req, res) => {
    farmPlots.delete(farmPlotKey(req.params.mapId, req.params.x, req.params.y));
    res.json(true);
});

app.get("/api/maps/:mapId/flow", (req, res) => {
    const value = findValue("mapFlowMain", (row) => matches(row.map, req.params.mapId), null);
    res.json(parseMaybeJson(value, {handlers: []}) || {handlers: []});
});

app.get("/api/maps/:mapId/music", (_req, res) => {
    res.json([]);
});

app.get("/Maps/selectLooperLands_Quest2.php", (req, res) => {
    const value = findValue("mapFlowMain", (row) => matches(row.map, req.query.map), null);
    res.json(parseMaybeJson(value, {handlers: []}) || {handlers: []});
});

app.post("/newBot", (_req, res) => {
    res.status(409).json({error: "Local mock does not spawn external bot sessions"});
});

app.get("/partnerTasks.php", (_req, res) => {
    res.json({taskStatus: "true"});
});

app.get("/partnerTasksRpt.php", (_req, res) => {
    res.json([{taskStatus: "true"}]);
});

app.use((req, res) => {
    console.log(`[mock-platform] ${req.method} ${req.originalUrl} -> local default`);
    res.json({});
});

const host = process.env.HOST || "localhost";
const port = Number(process.env.PORT || process.env.MOCK_PORT || 3000);

app.listen(port, host, () => {
    console.log(`[mock-platform] listening on http://${host}:${port}`);
    console.log(`[mock-platform] wallet=${LOCAL_WALLET} nft=${LOCAL_NFT} allowAllOwnership=${LOCAL_ALLOW_ALL_OWNERSHIP}`);
});
