<table>
  <tr>
    <td>
      <img align="right" src="./images/preview.png" alt="Preview" width="50%">
      <div align="center">
        <img align="center" src="https://i.imgur.com/gWx75QA.png" alt="Logo" width="70" height="90">
        <h3 align="center">Comfy Spicetify</h3>
        <p align="center">Stay comfy while listening to music</p>
        <a href="Comfy/README.md">Preview images</a>
      </div>
      <hr>
      <h4>✅ Current support / tested versions</h4>
        <li>🔥 Spicetify: <code><a href="https://github.com/spicetify/cli/releases/tag/v2.44.0">2.44.0</a></code></li>
        <li>🟢 Spotify: <code>1.2.99.317</code> on macOS</li>
        <li>Also tested: Spotify <code>1.2.98.301.gfcaeba72</code></li>
      <hr>
    </td>
  </tr>
</table>

Current support targets the macOS versions above. The broader navigation and settings checks ran on 1.2.98; 1.2.99 received runtime, layout, settings and sidebar checks plus user testing. Windows and Linux installation paths are provided below, but this update was not tested on those platforms. See [the compatibility report](COMPATIBILITY.md) for test coverage and known upstream errors.

### 📥 Manual Installation

---

This fork is installed manually so its local CSS and custom color schemes are not replaced by upstream downloads.

1. Clone or download this repository.
2. Copy the repository's inner `Comfy` folder to the Spicetify themes directory. Locations vary by installation:

| Platform | Theme folder |
| --- | --- |
| Windows | `%APPDATA%\spicetify\Themes\Comfy` |
| macOS | `~/.spicetify/Themes/Comfy` or `~/.config/spicetify/Themes/Comfy` |
| Linux | `~/.config/spicetify/Themes/Comfy` |

The installed folder should directly contain `color.ini`, `user.css`, and `theme.js`.
For an existing Comfy installation, `spicetify path -s folder` prints the actual active theme folder. Back up that folder before replacing it. Do not copy `node_modules` from a development checkout.

3. Apply the theme:

```powershell
spicetify config current_theme Comfy color_scheme <scheme>
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
spicetify apply
```

For example:

```powershell
spicetify config current_theme Comfy color_scheme blanky
spicetify apply
```

Every available scheme is listed in [`Comfy/color.ini`](Comfy/color.ini); preview images (not exhaustive) are available [here](Comfy/README.md).

Change schemes later with:

```sh
spicetify config color_scheme <scheme>
spicetify apply
```

### 🖌️ Customization

---

- `color.ini` controls color schemes.
- `user.css` contains the bundled theme styling and local font override.
- `theme.js` controls theme settings and behavior.

### 🔤 Fonts — install separately

The original theme fetched fonts automatically. This fork uses locally installed fonts instead: font files are not bundled or automatically downloaded. Download and install these fonts on your computer, then fully quit and reopen Spotify:

| Font | Download | Used for |
| --- | --- | --- |
| Nunito | [Google Fonts](https://fonts.google.com/specimen/Nunito) | Main Latin text |
| Zen Kaku Gothic Antique — Medium (500) | [Google Fonts](https://fonts.google.com/specimen/Zen+Kaku+Gothic+Antique) | Japanese text; the font stack requests `Zen Kaku Gothic Antique Medium` |
| SOV_monomon (โมโนมน) | [f0nt.com](https://www.f0nt.com/release/sov_monomon/) | Thai text |

On macOS, open the downloaded font files in Font Book and install them. If a font is missing, Spotify falls back to the next available font, so the theme still works but the typography will differ. The default stack is defined in `Comfy/local.css`; the Custom Font setting can override it.

### Development

Use Node.js 22.13 or newer and pnpm 11.19.0. From the repository root:

```sh
pnpm --dir Comfy install --frozen-lockfile --ignore-scripts
pnpm --dir Comfy build
pnpm --dir Comfy check
```

Edit `Comfy/app.scss` and its `assets` partials for styling, or `Comfy/local.css` for the local font override. The build regenerates both `app.css` and the installed `user.css`. Commit both outputs. CI checks runtime regressions, JavaScript syntax, and generated CSS freshness without modifying the repository.

See [the compatibility report](COMPATIBILITY.md) for verified behavior, remaining upstream errors, and platform limits. Runtime JavaScript and CSS remain bundled locally; artwork and optional image/font URLs can still use the network.
