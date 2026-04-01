// client/apps/m88ninvaders/js/m88ninvaders.js
// Adapter loaded by the LooperLands minigame loader (via MODULE_INIT).
// Handles entry fee before start and score-based payout on game over.

export function init() {
  const GOLD_ID = "21300041";   // LooperLands Gold resource id
  const ENTRY_FEE = 10;         // tweak to taste

  // UI
  const statusEl = document.getElementById('mg-status');
  const feeEl = document.getElementById('entry-fee');
  const goldEl = document.getElementById('current-gold');
  const startBtn = document.getElementById('startBtn');

  if (feeEl) feeEl.textContent = ENTRY_FEE;

  // Session
  const sessionId = new URLSearchParams(window.location.search).get('sessionId');

  // Start gate exposed to the game code
  let startApproved = false;
  window.M88NInvadersCanStart = () => startApproved;

  // --- Show player's current gold on the overlay
  async function refreshGold() {
    if (!sessionId || !goldEl) return;
    try {
      const { data } = await axios.get(`/session/${sessionId}/inventory`);
      const amt = Number(data?.[GOLD_ID] ?? 0);
      goldEl.textContent = new Intl.NumberFormat().format(amt);
    } catch {
      goldEl.textContent = '—';
    }
  }
  // Initial readout (if the span exists)
  refreshGold();

  // --- Guard: if we somehow have no session, make it obvious
  if (!sessionId && statusEl) {
    statusEl.textContent = 'Missing session. Please reopen the minigame from LooperLands.';
  }

  // --- Pay-to-play
  startBtn?.addEventListener('click', async () => {
    try {
      if (statusEl) statusEl.textContent = 'Checking gold & charging entry fee...';
      startBtn.disabled = true;

      const { data } = await axios.post(`/apps/m88ninvaders/start`, {
        sessionId,
        entryFee: ENTRY_FEE
      });

      if (data?.ok) {
        startApproved = true;
        if (statusEl) statusEl.textContent = `Paid ${ENTRY_FEE} gold. Good luck!`;
        refreshGold(); // reflect the deduction
        // Notify the game it can start
        window.dispatchEvent(new CustomEvent('m88ninvaders:start-approved'));
      } else {
        startBtn.disabled = false;
        if (statusEl) statusEl.textContent = data?.message || 'Payment failed.';
        refreshGold(); // still refresh, in case balance changed elsewhere
      }
    } catch {
      startBtn.disabled = false;
      if (statusEl) statusEl.textContent = 'Server error. Please try again.';
    }
  });

  // --- Payout on game over
  window.addEventListener('m88ninvaders:gameover', async (ev) => {
    const payload = ev.detail || {};
    try {
      if (statusEl) statusEl.textContent = 'Calculating payout...';
      const { data } = await axios.post(`/apps/m88ninvaders/finish`, {
        sessionId,
        score: payload.score,
        coins: payload.coins || 0,
        level: payload.level || 1
      });
      if (statusEl) statusEl.textContent = data?.ok
        ? `You earned ${data.payout} gold!`
        : (data?.message || 'No payout.');
      refreshGold(); // reflect the reward
    } catch {
      if (statusEl) statusEl.textContent = 'Payout error.';
    }
  });

  // --- Block accidental Enter-starts until fee is paid
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !startApproved) {
      e.preventDefault();
      if (statusEl) statusEl.textContent = 'Pay the entry fee to start.';
    }
  });
}
