![banner](../images/banner.png)

### Now Playing album-art background

In **Comfy Settings → Now Playing**, enable **Album Art Background** (off by default).
Blur, brightness, saturation, and section card darkening are adjustable.
Defaults are 32 px blur, 65% brightness, 110% saturation, and 45% card darkening.
Automatic contrast protection and the short fade can be disabled independently.
While artwork is visible, primary text is white and secondary text is 80%-opaque
white. Contrast protection can further limit brightness to keep that text readable.
Disabling artwork or falling back to the normal background restores the theme's text colors.

The cover comes directly from player metadata. After 500 ms without a different
artwork request, Comfy renders a 512×512 texture once. Resizing only scales/crops
that texture; there is no live blur filter or playback polling. Identical artwork
is reused, hidden panels defer work, and disabling releases the feature's resources.
Missing or failed artwork restores the normal background. Native local-file covers
(`spotify:localfileimage:`) also fall back quietly because they cannot be loaded
through the feature's CORS image request. Artist, Credits, On Tour,
Merch, and Queue retain their outlines, shape, images and controls with darkened
fills. Related Music Videos gets a matching rounded tile around its carousel.

### 🎨 Color Schemes

#### Collection

<details><summary>Catppuccin</summary>
<details><summary>🌻 Latte</summary>

![png](../images/color-schemes/catppuccin/latte.png)

</details>
<details><summary>🍨 Frappé</summary>

![png](../images/color-schemes/catppuccin/frappe.png)

</details>
<details><summary>🌺 Macchiato</summary>

![png](../images/color-schemes/catppuccin/macchiato.png)

</details>
<details><summary>🌿 Mocha</summary>

![png](../images/color-schemes/catppuccin/mocha.png)

</details></details>

<details><summary>Rosé Pine</summary>
<details><summary>Original</summary>

![png](../images/color-schemes/rose-pine/original.png)

</details>
<details><summary>Moon</summary>

![png](../images/color-schemes/rose-pine/moon.png)

</details>
<details><summary>Dawn</summary>

![png](../images/color-schemes/rose-pine/dawn.png)

</details></details>

<details><summary>Mono</summary>
<details><summary>Original</summary>

![png](../images/color-schemes/mono/mono.png)

</details>
<details><summary>Forest</summary>

![png](../images/color-schemes/mono/forest.png)

</details>
<details><summary>Neon</summary>

![png](../images/color-schemes/mono/neon.png)

</details>
<details><summary>Sakura</summary>

![png](../images/color-schemes/mono/sakura.png)

</details>
<details><summary>Sunset</summary>

![png](../images/color-schemes/mono/sunset.png)

</details>
<details><summary>Vaporwave</summary>

![png](../images/color-schemes/mono/vaporwave.png)

</details></details>

#### Individual

<details><summary>Comfy</summary>

![png](../images/color-schemes/comfy.png)

</details>
<details><summary>Spotify</summary>

![png](../images/color-schemes/spotify.png)

</details>
<details><summary>Nord</summary>

![png](../images/color-schemes/nord.png)

</details>
<details><summary>Everforest</summary>

![png](../images/color-schemes/everforest.png)

</details>
<details><summary>Kanagawa</summary>

![png](../images/color-schemes/kanagawa.png)

</details>
<details><summary>Houjicha</summary>

![png](../images/color-schemes/houjicha.png)

</details>
<details><summary>Kitty</summary>

![png](../images/color-schemes/kitty.png)

</details>
<details><summary>Lunar</summary>

![png](../images/color-schemes/lunar.png)

</details>
<details><summary>Deep</summary>

![png](../images/color-schemes/deep.png)

</details>
<details><summary>Velvet</summary>

![png](../images/color-schemes/velvet.png)

</details>
<details><summary>Yami</summary>

![png](../images/color-schemes/yami.png)

</details>
<details><summary>Hikari</summary>

![png](../images/color-schemes/hikari.png)

</details>

### 📑 Pages

<details><summary>Album</summary>

![png](../images/pages/album.png)

</details>

<details><summary>Artist</summary>

![png](../images/pages/artist.png)

</details>

<details><summary>Browse</summary>

![png](../images/pages/browse.png)

</details>

<details><summary>Discography</summary>

![png](../images/pages/discography.png)

</details>

<details><summary>Home</summary>

![png](../images/pages/home.png)

</details>

<details><summary>Lyrics Plus</summary>

![png](../images/pages/lyrics-plus.png)

</details>

<details><summary>Marketplace</summary>

![png](../images/pages/marketplace.png)

</details>

<details><summary>New Releases</summary>

![png](../images/pages/new-releases.png)

</details>

<details><summary>Playlist</summary>

![png](../images/pages/playlist.png)

</details>

<details><summary>Podcasts</summary>

![png](../images/pages/podcasts.png)

</details>

<details><summary>Profile</summary>

![png](../images/pages/profile.png)

</details>

<details><summary>Radio</summary>

![png](../images/pages/radio.png)

</details>

<details><summary>Search</summary>

![png](../images/pages/search.png)

</details>

<details><summary>Search Results</summary>

![png](../images/pages/search-results.png)

</details>

### 📳 Panels

<details><summary>Friends</summary>

![png](../images/panels/friends.png)

</details>

<details><summary>Library</summary>

![png](../images/panels/library.png)

</details>

<details><summary>Library Expanded</summary>

![png](../images/panels/library-expanded.png)

</details>

<details><summary>Library Closed</summary>

![png](../images/panels/library-closed.png)

</details>

<details><summary>Library Compact</summary>

![png](../images/panels/library-compact.png)

</details>

<details><summary>Now Playing View</summary>

![png](../images/panels/npv.png)

</details>

<details><summary>Queue</summary>

![png](../images/panels/queue.png)

</details>

### ⚙️ Settings

<details><summary>Apple Music Gradient</summary>

![png](../images/settings/am-blur.png)
![png](../images/settings/am-blur.png)

</details>

<details><summary>Application Title</summary>

![png](../images/settings/application-title.png)

</details>

<details><summary>Blur</summary>

![png](../images/settings/blur.png)

</details>

<details><summary>Button Radius</summary>

![png](../images/settings/button-radius.png)

</details>

<details><summary>Custom Image</summary>

![png](../images/settings/custom-image.png)

</details>

<details><summary>Flatten Colors</summary>

![png](../images/settings/flatten-colors.png)

</details>

<details><summary>Horizontal Page Links</summary>

![png](../images/settings/horizontal-pagelinks.png)

</details>

<details><summary>Oblong Cover Art</summary>

![png](../images/settings/oblong-cover-art.png)

</details>

<details><summary>Topbar in Titlebar</summary>

![png](../images/settings/topbar-in-titlebar.png)

</details>
