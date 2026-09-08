# Spotify 1.2.98 compatibility

Verified on macOS with Spotify **1.2.98.301.gfcaeba72** and Spicetify **2.44.0** on September 7, 2026. This does not establish compatibility with every Spotify experiment or with Windows/Linux.

On September 8, Spotify updated to **1.2.99.317** and replaced its patched files. The same theme was reapplied successfully with `spicetify backup apply`. Its JavaScript and CSS match the working copy byte for byte. The runtime reports version 1.2.99.317 with Comfy initialized; the artist page, main layout and bounded settings dialog render. Temporary appearance test flags were restored and verified after reload. User testing identified the sidebar rounding issue fixed below, and publication was approved after that fix. The full live checklist below was performed on 1.2.98; it was not repeated in full on 1.2.99.

## Changes

- Library row hover/selection backgrounds now use Comfy's shared `--border-radius` instead of Spotify's independent row radius. Verified on 1.2.99: sampled rows resolve to the theme's 8px radius.

- Reattach the banner when Spotify replaces its scroll container. Give the decorative background a nonzero height and fade ordinary artwork into the tracklist.
- Read album covers from the actual image rather than its identically named wrapper. Read native artist backgrounds from the current scroll slot. Recheck artwork when headers load after navigation.
- Remove the pinned artist GraphQL query and the album Web API request. Keep playlist artwork support, normalize Spotify image URIs, and prevent stale metadata/image completions from replacing newer artwork. Missing player data and failed image requests leave an empty background safely.
- Keep the Comfy settings dialog within the viewport, align its close button, restore scrolling, and clean up its state when the modal is removed. Render the reset confirmation as a React component. Avoid unresolved Promise text in input placeholders.
- Wait safely for nested Spicetify dependencies, bound individual feature waits, and report rejected callbacks. Invalid saved settings fall back to defaults.
- Update titlebar CSS before any native request. Skip the unavailable native titlebar resolver on macOS; native window chrome remains controlled by Spotify.
- Replace obsolete node-sass tooling with pinned Dart Sass. Build both stylesheets from the same source, retaining the local font preamble and existing color schemes.

## Verification

The Node test suite executes the production runtime in a VM with mocked Spotify APIs and DOM nodes. Its 12 checks cover delayed/missing APIs, callback rejection, dependency timeout, empty DOM lists/player data, banner remounting, failed playlist metadata, image URI normalization, stale image/metadata races, late album artwork, native artist backgrounds, playlist gradient artwork, and the macOS titlebar path. These mocks do not replace live layout checks.

Live checks covered Home, playlists, Liked Songs, albums, artists, navigation, album artwork preference, gradient toggle and restoration, library collapse/restore and divider resizing, queue and Now Playing panels, settings filtering/open/close/reopen, and reset confirmation with Cancel. Playback and library contents were not changed by testing. The installed files were refreshed through Spicetify after a backup.

JavaScript syntax, all runtime tests, generated stylesheet freshness, and `git diff --check` passed. The original SCSS was also compiled and compared with the original CSS before introducing compatibility rules, to verify that regeneration retained its styling. Settings and color schemes were retained; tested appearance toggles were restored.

## Separate errors and limits

- Spicetify's optional `homeConfig.js` helper was observed accessing `Platform.History.location` before History existed. The theme does not modify that helper; the error did not recur on every reload.
- The separately installed `metadata.js` extension reported a missing `Spicetify.Platform.Session.accessToken`. Updating that extension is outside this theme change.
- Spotify's remote configuration endpoint returned 404 / `provider:transport resolve error`. A temporary network interruption also produced failed artwork requests. These are not suppressed by Comfy.
- Some React/accessibility warnings remain in Spotify/Spicetify UI. This update does not claim an entirely clean third-party console.
- The empty-player path and offline metadata fallback were tested with mocks. Podcast, local-file, and third-party lyrics pages were not exhaustively tested. Windows/Linux native titlebar behavior was not exercised.

After future Spotify updates, repeat the live navigation/settings checks and inspect Comfy-prefixed console warnings before changing the tested-version claim.
