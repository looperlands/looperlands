# Safari mob-kill audio comparison

The client uses Howler's decoded Web Audio buffers for short sound effects on Safari. If Web Audio or Howler is unavailable, or an effect fails to load, it uses the existing HTML audio path. Music keeps its existing loading and playback behavior.

A manual Safari retest confirmed that Web Audio works. The optional comparison probe can record visible frame timings during real kills for further diagnosis; short `playSound()` calls alone do not measure delayed frame stalls.

Add `&profileKills=1` to a game URL that already contains `?sessionId=...`. The optional panel appears after the game starts. Run these comparisons in the same scene, with Sound enabled in game settings:

1. Keep Safari visible and kill a few mobs using **Normal**. On Safari with Web Audio available, this uses decoded effects.
2. Select **Effects off**, wait for any pending sample to finish, and repeat. This bypasses sound effects without changing the saved Sound setting.
3. Select **HTML audio**, allow the legacy assets to load, and repeat. This uses the previous effect playback path.

Each sample records the maximum frame interval during the preceding 500 ms and following 2 seconds, the death callback duration, sound-call durations, and the maximum time in updates, rendering dispatch, and action-batch handling. Only visible mob despawns are sampled; XP notifications alone are not counted as deaths. Overlapping kills share frame intervals, so space kills apart when possible.

Samples are marked invalid if the page becomes hidden, the mode changes during the sample, or visible frames are missing. Timing remains in the browser. Use `window.__killAudioProbe.report()` in Web Inspector for structured results, and `window.__killAudioProbe.stop()` to remove the panel and restore the original callbacks. Reloading also removes temporary mode changes.

If HTML audio repeatedly stalls while Normal and Effects off remain smooth, the audio path is implicated. If Effects off still stalls, collect the stage timings to continue investigating the rest of the death/rendering path. A lower sound-call duration alone does not prove that asynchronous media work stopped affecting later frames.
