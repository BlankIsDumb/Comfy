const fs = require('node:fs');
const path = require('node:path');
const sass = require('../Comfy/node_modules/sass');

const theme = path.resolve(__dirname, '../Comfy');
const css = sass.compile(path.join(theme, 'app.scss'), { style: 'expanded', charset: false }).css + '\n';
const outputs = {
  'app.css': css,
  'user.css': fs.readFileSync(path.join(theme, 'local.css'), 'utf8').trimEnd() + '\n\n' + css
};
for (const [file, content] of Object.entries(outputs)) {
  const target = path.join(theme, file);
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== content) {
      throw new Error(`${file} is stale. Run pnpm --dir Comfy build.`);
    }
  } else {
    fs.writeFileSync(target, content);
  }
}
console.log(process.argv.includes('--check') ? 'Both generated stylesheets are current.' : 'Built app.css and user.css with local fonts.');
