# Safari music playback

Background music is now loaded when its area or server music selection is requested, including on Safari and mobile. It no longer waits for every sound effect and music asset to load. Area changes switch tracks on one looping audio element; leaving an area still fades out. Map streams reuse a separate element so the two music settings remain independent. Long songs stream without a full Web Audio download and decode.

The player handles both rejected `play()` promises and synchronous playback errors. It retries the requested track directly on a click, tap (`touchend`), or key press, and when a paused page becomes visible or the media becomes ready. A pending attempt is reused rather than duplicated. Disabling playback cancels retry intent, so a late promise or readiness event cannot restart a stopped track.

This follows [WebKit's autoplay guidance](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/): handle the playback promise and reuse the media element because autoplay permission applies per element. Browser autoplay preferences still apply; if an initial attempt is blocked, interact with the game to start the requested music.

Stream polling starts when the map is ready. Empty responses and disabling Stream Music stop the stream and allow enabled area music to return. Starting a stream suspends area music while keeping sound effects available. Map changes stop the previous poll and stream; outdated responses cannot replace the current track. Slow requests do not overlap and have a 10-second timeout.

## Manual Safari checks

1. Enable Game Music and enter a music area. If needed, click, tap, or press a movement key; music should start without leaving and re-entering the area.
2. Move between music areas, then leave and return. Verify the expected track, looping, and fade-out without an old timer muting a new track.
3. Disable and enable Game Music. Disabled music must stay stopped through movement and clicks; enabling resumes the current area.
4. In a map with Stream Music, confirm the stream starts after interaction, repeats without restarting on each poll, and changes to a new configured track.
5. Disable and enable Stream Music. It should stop and restart immediately; Game Music and sound-effect preferences should remain intact.
6. Change maps while a stream request is pending. The old song must not restart. Switch away from Safari and return; paused requested music should recover on return or the next interaction.

Automated tests cover blocked playback, pending and stale attempts, element reuse, readiness, visibility, settings, stream polling, and navigation cleanup. They do not replace an audible retest in native Safari.
