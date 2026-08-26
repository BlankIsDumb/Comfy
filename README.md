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
      <h4>✅ Tested with</h4>
        <li>🔥 Spicetify: <code><a href="https://github.com/spicetify/cli/releases/tag/v2.44.0">2.44.0</a></code></li>
        <li>🟢 Spotify: <code>1.2.81</code></li>
      <hr>
    </td>
  </tr>
</table>

### 📥 Manual Installation

---

This fork is installed manually so its local CSS and custom color schemes are not replaced by upstream downloads.

1. Clone or download this repository.
2. Copy the repository's inner `Comfy` folder to the Spicetify themes directory:

| Platform | Theme folder |
| --- | --- |
| Windows | `%APPDATA%\spicetify\Themes\Comfy` |
| macOS | `~/.config/spicetify/Themes/Comfy` |
| Linux | `~/.config/spicetify/Themes/Comfy` |

The installed folder should directly contain `color.ini`, `user.css`, and `theme.js`.

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
