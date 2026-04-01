// server/apps/m88ninvaders/index.js
const express = require('express');
const router = express.Router();

// If your codebase exposes helpers like these, import them.
// Adjust paths/names to match how LuckyFUNKZ does it in your repo:
const { getSessionInventory, addResourceToSession, removeResourceFromSession } =
  require('../../lib/resources'); // <-- change if your project uses a different path

const GOLD_ID = "21300041";

// Simple score → payout curve you can tune
function payoutForScore(score) {
  if (score < 100)   return 0;
  if (score < 300)   return 5;
  if (score < 600)   return 12;
  if (score < 1000)  return 25;
  if (score < 1600)  return 40;
  if (score < 2400)  return 60;
  return 100;
}

// POST /apps/m88ninvaders/start  { sessionId, entryFee }
router.post('/start', async (req, res) => {
  try {
    const { sessionId, entryFee = 10 } = req.body || {};
    if (!sessionId) return res.json({ ok: false, message: 'Missing sessionId' });

    const inv = await getSessionInventory(sessionId);
    const gold = Number(inv[GOLD_ID] || 0);

    if (gold < entryFee) {
      return res.json({ ok: false, message: 'Not enough gold' });
    }

    await removeResourceFromSession(sessionId, GOLD_ID, entryFee);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[m88ninvaders/start]', e);
    return res.json({ ok: false, message: 'Server error' });
  }
});

// POST /apps/m88ninvaders/finish  { sessionId, score, coins, level }
router.post('/finish', async (req, res) => {
  try {
    const { sessionId, score = 0, coins = 0, level = 1 } = req.body || {};
    if (!sessionId) return res.json({ ok: false, message: 'Missing sessionId' });

    let payout = payoutForScore(Number(score));
    // tiny bonuses for coins/level if you want:
    payout += Math.floor(Number(level) * 1.5);
    payout += Math.min(5, Math.floor(Number(coins) / 10));

    if (payout > 0) {
      await addResourceToSession(sessionId, GOLD_ID, payout);
    }
    return res.json({ ok: true, payout });
  } catch (e) {
    console.error('[m88ninvaders/finish]', e);
    return res.json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
