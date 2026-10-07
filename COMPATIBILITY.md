# Spotify 1.2.98 compatibility

## Optional Now Playing artwork background (October 6, 2026)

Verified on Windows with Spotify 1.2.99.317 and the tuyu scheme. The feature is
disabled by default; it uses player `image_large_url`, then `image_xlarge_url`,
`image_url`, or `image_small_url`, normalizing Spotify image URIs without an
extra extension, album API request, or invented image-size URL.

The current cover supplied a 640×640 source. A visual low-blur comparison showed
less aliasing at a 512×512 working size than 128×128. Warm preliminary draw/readback
trials were about 3–5 ms at 256 and 9–12 ms at 512; the first trial had a large
initialization cost. Actual feature renders including contrast protection sampled
about 16–20 ms. These are local observations, not a general CPU/GPU guarantee.
Each retained 512×512 pixel buffer is 1 MiB before browser/compositor overhead;
at most two feature canvases are retained during the 300 ms fade.

Live checks covered metadata artwork, actual song changes, rapid skip requests,
window resizing (same canvas, no new render), panel collapse/reopen, settings
edits, disable restoration, and enabled startup after reload. Spotify sometimes
delivered rapidly requested skips several seconds apart; the 500 ms debounce
coalesces artwork events arriving within that interval, not all user requests
regardless of when Spotify delivers them. Card darkening changed the fill without
rerendering the texture. Existing card border/outline/radius values were preserved.
Real-canvas probes checked zero brightness, grayscale, and contrast treatment of
white/black covers with light/dark text.

Artwork-backed typography now uses white primary text and 80%-opaque white metadata,
scoped to Encore text/title/subtitle markers and text-only buttons. Icon controls,
saved-state colors and section borders retain their original palette. Contrast
processing uses the composited secondary white foreground instead of INI colors.
Real-canvas white, black and red probes exceeded 4.5:1 for that foreground.

Native `spotify:localfileimage:` covers produced CORS scheme errors in the Windows
console. They are now skipped before creating an image loader, using the ordinary
theme fallback. The check is independent of filesystem path syntax; Windows and
macOS URI fixtures cover cleanup, cancellation and recovery to usable artwork.
Actual macOS playback has not been tested. No native-file helper was introduced.

All 22 Node tests pass. Deterministic lifecycle tests additionally cover tightly
spaced events, stale image completions, missing/failed/timed-out artwork, hidden
documents, reduced motion, and disable/re-enable cleanup. Existing banner fixtures
were updated to supply mutation records and scoped DOM queries; production banner
behavior was not changed. Test discovery now also works with Node 20 on Windows.

The CSS intentionally targets the inspected `.NowPlayingView` structure and the
Artist/Credits/Queue semantic classes, Tour item structure, Spotify shop links,
and the Related Music Videos carousel shell. All six share the card-darkening
setting; the carousel receives its own rounded tile without changing its scrolling.
Spotify's alternate Now Playing experiments,
macOS/Linux, and every light scheme have not been live-tested. Contrast sampling
protects the background but is not an accessibility audit of all Spotify controls.
Existing homeConfig startup and native titlebar resolver warnings remain outside
this feature; a Spotify startup error recovered after reload during verification.

## Earlier compatibility baseline

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
