const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../Comfy/theme.js'), 'utf8');

// Execute the production runtime. React's settings rendering is stubbed; these
// tests exercise lifecycle, API failures and artwork races, not Spotify markup.
async function fixture(config = {}) {
  const nodes = new Map();
  const observers = [];
  const images = [];
  const warnings = [];
  const style = () => ({ values: {}, setProperty(k, v) { this.values[k] = v; }, getPropertyValue(k) { return this.values[k] || ''; } });
  const element = () => ({
    style: style(), children: [], className: '', parentElement: null,
    classList: { values: new Set(), add(v) { this.values.add(v); }, contains(v) { return this.values.has(v); }, toggle(v, on) { on ? this.values.add(v) : this.values.delete(v); }, remove(v) { this.values.delete(v); } },
    append(e) { this.appendChild(e); },
    appendChild(e) { e.parentElement = this; this.children.push(e); },
    getBoundingClientRect() { return { width: 300 }; }
  });
  const root = element(); root.classList.add('spotify__os--is-macos');
  const main = element();
  for (const selector of ['.Root__top-container', '.Root__main-view', '.Root__main-view .before-scroll-node', ':root .global-nav']) nodes.set(selector, element());
  const history = { location: { pathname: '/collection/tracks' }, listen(fn) { this.listener = fn; } };
  const player = { data: {}, addEventListener(type, fn) { this.listener = fn; } };
  const store = new Map([['comfy:config', JSON.stringify(config)]]);
  const context = vm.createContext({
    console: { debug() {}, log() {}, warn(...args) { warnings.push(args); } },
    setTimeout, clearTimeout, Date, URL,
    document: { documentElement: root, createElement: element, querySelector: s => nodes.get(s) || null, querySelectorAll: s => nodes.get(s) || [], getElementById: id => id === 'main' ? main : null },
    localStorage: { getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) },
    getComputedStyle: e => ({ getPropertyValue: k => e.style.getPropertyValue(k), backgroundImage: e.backgroundImage || 'none' }),
    ResizeObserver: class { observe() {} },
    MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
    Image: class { constructor() { images.push(this); } },
    Spicetify: {
      React: { memo: f => f, createElement: () => ({}) },
      ReactDOM: { render() {}, unmountComponentAtNode() {} },
      Config: {}, Platform: { History: history, version: '1.2.98.301' }, Player: player,
      Topbar: { Button: class {} }, CosmosAsync: { post() { throw new Error('Unexpected native request'); } }
    }
  });
  context.window = context; context.outerWidth = context.innerWidth = 1000; context.addEventListener = () => {};
  // Expose private functions only inside this isolated test VM.
  const injected = source.replace(/\n\}\)\(\);\s*$/, '\n globalThis.testAPI = {waitForDeps, readDependency, updateBanner, updateTitlebar, normalizeImage, frame, mountBanner};\n})();');
  await vm.runInContext(injected, context);
  await new Promise(resolve => setImmediate(resolve));
  return { context, api: context.testAPI, nodes, observers, images, warnings, root, main, history, player, element, store };
}

test('nested APIs may be missing and arrive after startup', async () => {
  const f = await fixture();
  let received;
  const pending = f.api.waitForDeps('Spicetify.Platform.Delayed.value', value => { received = value; }, false, 'querySelector', 500);
  f.context.Spicetify.Platform.Delayed = { value: { ready: true } };
  assert.equal(await pending, true);
  assert.equal(received.ready, true);
});

test('missing dependency times out and rejected feature callbacks settle safely', async () => {
  const f = await fixture();
  assert.equal(await f.api.waitForDeps('Spicetify.Missing.child', null, false, 'querySelector', 0), false);
  assert.equal(await f.api.waitForDeps('Spicetify.Player', async () => { throw new Error('unavailable'); }), false);
  assert.equal(f.warnings.length, 2);
});

test('empty selector lists do not satisfy DOM dependencies', async () => {
  const f = await fixture();
  assert.equal(await f.api.waitForDeps('.not-mounted', null, true, 'querySelectorAll', 0), false);
});

test('empty player data is safe and clears artwork', async () => {
  const f = await fixture({ 'Banner-Enabled': true });
  await f.api.updateBanner();
  assert.equal(f.root.style.getPropertyValue('--image-url'), 'none');
  assert.equal(f.main.classList.contains('Banner-Enabled'), true);
  assert.equal(f.images.length, 0);
});

test('banner is reattached when Spotify replaces the scroll container', async () => {
  const f = await fixture();
  const replacement = f.element();
  f.nodes.set('.Root__main-view .before-scroll-node', replacement);
  f.observers.forEach(fn => fn());
  assert.equal(f.api.frame.parentElement, replacement);
  f.observers.forEach(fn => fn());
  assert.equal(replacement.children.length, 1);
});

test('missing playlist metadata falls back to normalized current artwork', async () => {
  const f = await fixture({ 'Prefer-Existing-Image': true });
  f.history.location.pathname = '/playlist/example';
  f.context.Spicetify.Platform.PlaylistAPI = { async getMetadata() { throw new Error('offline'); } };
  f.player.data = { item: { metadata: { image_xlarge_url: 'spotify:image:abc123' } } };
  await f.api.updateBanner();
  const image = f.images.at(-1);
  assert.equal(image.src, 'https://i.scdn.co/image/abc123');
  image.onload();
  assert.equal(f.root.style.getPropertyValue('--image-url'), 'url("https://i.scdn.co/image/abc123")');
});

test('older image loads cannot overwrite a newer track', async () => {
  const f = await fixture();
  f.player.data = { track: { metadata: { image_xlarge_url: 'https://example.com/old.jpg' } } };
  await f.api.updateBanner(); const old = f.images.at(-1);
  f.player.data.track.metadata.image_xlarge_url = 'https://example.com/new.jpg';
  await f.api.updateBanner(); const latest = f.images.at(-1);
  latest.onload(); old.onload(); old.onerror();
  assert.equal(f.root.style.getPropertyValue('--image-url'), 'url("https://example.com/new.jpg")');
});

test('slow metadata cannot replace the image for a newer route', async () => {
  const f = await fixture({ 'Prefer-Existing-Image': true });
  let resolve;
  f.history.location.pathname = '/playlist/old';
  f.context.Spicetify.Platform.PlaylistAPI = { getMetadata: () => new Promise(r => { resolve = r; }) };
  const pending = f.api.updateBanner();
  await new Promise(r => setImmediate(r));
  f.history.location.pathname = '/';
  f.player.data = { item: { metadata: { image_xlarge_url: 'https://example.com/current.jpg' } } };
  await f.api.updateBanner();
  resolve({ images: [{ url: 'https://example.com/old.jpg' }] });
  await pending;
  assert.equal(f.images.length, 1);
  assert.equal(f.images[0].src, 'https://example.com/current.jpg');
  assert.equal(f.main.classList.contains('Banner-Enabled'), false);
});

test('macOS titlebar updates CSS without calling the removed native endpoint', async () => {
  const f = await fixture();
  await f.api.updateTitlebar('80', '64');
  assert.equal(f.root.style.getPropertyValue('--comfy-topbar-height'), '80px');
  await f.api.updateTitlebar('-4', '64');
  assert.equal(f.root.style.getPropertyValue('--comfy-topbar-height'), '80px');
  await f.api.updateTitlebar('', '64');
  assert.equal(f.root.style.getPropertyValue('--comfy-topbar-height'), '');
});

test('album artwork arriving after navigation replaces the fallback without an observer loop', async () => {
  const f = await fixture({ 'Prefer-Existing-Image': true });
  f.history.location.pathname = '/album/example';
  await f.api.updateBanner();
  f.nodes.set('.Root__main-view .main-entityHeader-image', {}); // The wrapper shares the image class.
  f.nodes.set('.Root__main-view img.main-entityHeader-image, .Root__main-view .main-entityHeader-image img', { src: 'https://example.com/album.jpg' });
  f.observers.forEach(fn => fn());
  await new Promise(r => setImmediate(r));
  assert.equal(f.images.at(-1).src, 'https://example.com/album.jpg');
  const count = f.images.length;
  f.observers.forEach(fn => fn());
  await new Promise(r => setImmediate(r));
  assert.equal(f.images.length, count);
});

test('gradient mode retains the playlist banner supplied by metadata', async () => {
  const f = await fixture({ 'Apple-Music-Gradient-Snippet': true, 'AM-Gradient-Include-Existing-Snippet': true });
  f.history.location.pathname = '/playlist/example';
  f.context.Spicetify.Platform.PlaylistAPI = { async getMetadata() { return { images: [{url:'cover'}, {}, {}, {url:'https://example.com/banner.jpg'}] }; } };
  await f.api.updateBanner();
  assert.equal(f.images.at(-1).src, 'https://example.com/banner.jpg');
});

test('artist gradient uses the native scroll-slot background when legacy header classes are absent', async () => {
  const f = await fixture({ 'Apple-Music-Gradient-Snippet': true, 'AM-Gradient-Include-Existing-Snippet': true });
  f.history.location.pathname = '/artist/example';
  f.nodes.set('.Root__main-view .main-entityHeader-background, .Root__main-view .before-scroll-node > :not(.comfy-banner-frame), .Root__main-view .before-scroll-node > :not(.comfy-banner-frame) [style]', [
    { backgroundImage: 'none' }, { backgroundImage: 'url("https://example.com/artist.jpg")' }
  ]);
  await f.api.updateBanner();
  assert.equal(f.images.at(-1).src, 'https://example.com/artist.jpg');
});
