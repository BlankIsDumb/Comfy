const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../Comfy/theme.js'), 'utf8');
const feature = source.slice(source.indexOf('\tfunction createNowPlayingArtwork()'), source.indexOf('\n\tasync function updateBanner()'));

// Deterministic lifecycle fixture. The production controller runs unchanged;
// rasterization is counted here and checked separately in Spotify's real canvas.
function fixture(initial = {}) {
  const config = { 'NPV-Artwork-Enabled': true, ...initial };
  let clock = 0, timerId = 0, renderCount = 0;
  const timers = new Map(), images = [], observers = [], layers = [];
  const events = () => ({
    listeners: new Map(),
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); },
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); },
    emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
  });
  const element = () => ({
    isConnected: true, children: [], width: 512, height: 512,
    classList: { values: new Set(), add(v) { this.values.add(v); }, remove(v) { this.values.delete(v); } },
    style: { values: {}, setProperty(k, v) { this.values[k] = v; }, removeProperty(k) { delete this.values[k]; } },
    setAttribute() {}, closest() { return null; },
    appendChild(child) { child.parent = this; this.children.push(child); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(e => e !== this); this.parent = null; },
    animate() { return { cancel() { this.cancelled = true; } }; }
  });
  let host = element();
  const shell = { matches: () => true };
  const root = { hidden: false, hasAttribute() { return this.hidden; }, querySelector() { return host; }, querySelectorAll() { return [shell]; } };
  const player = { ...events(), data: { item: { metadata: { image_large_url: 'spotify:image:cover-a' } } } };
  const document = { ...events(), hidden: false, focused: true, hasFocus() { return this.focused; }, querySelector: () => root };
  const window = { ...events(), matchMedia: () => ({ matches: false }) };
  const context = vm.createContext({
    getConfig: key => config[key], Spicetify: { Player: player }, document, window,
    getComputedStyle: () => ({}), console: { warn() {} },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Image: class { constructor() { images.push(this); } removeAttribute() { this.src = ''; } },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; this.targets = []; observers.push(this); }
      observe(target, options) { this.targets.push({ target, options }); }
      disconnect() { this.targets = []; }
    }
  });
  vm.runInContext(feature + `
    renderNowPlayingArtwork = () => makeCanvas();
    globalThis.runtime = createNowPlayingArtwork();`, Object.assign(context, {
    makeCanvas() { renderCount++; const canvas = element(); layers.push(canvas); return canvas; }
  }));
  function advance(ms) {
    const end = clock + ms;
    for (;;) {
      const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); clock = due[1].at; due[1].fn();
    }
    clock = end;
  }
  const f = {
    config, images, observers, layers, timers, document, window, player, root, advance,
    get host() { return host; }, get renders() { return renderCount; },
    configure: () => context.runtime.configure(),
    song(url) { player.data = url ? { item: { metadata: { image_large_url: url } } } : {}; player.emit('songchange'); },
    loaded() { images.at(-1).onload(); },
    remount() { host.isConnected = false; host = element(); observers.at(-1).fn(); },
    setting(key, value) { config[`NPV-Artwork-${key}`] = value; context.runtime.configure(); }
  };
  f.configure();
  return f;
}

test('disabled feature allocates nothing; repeated enabling attaches only one listener', () => {
  const f = fixture({ 'NPV-Artwork-Enabled': false });
  assert.equal(f.timers.size, 0);
  assert.equal(f.observers.length, 0);
  f.setting('Enabled', true); f.configure(); f.configure();
  assert.equal(f.player.listeners.get('songchange').size, 1);
  assert.equal(f.observers.length, 1);
  f.advance(499); assert.equal(f.images.length, 0);
  f.advance(1); f.loaded(); assert.equal(f.renders, 1);
  assert.equal(f.host.children.length, 1);
});

test('rapid skips debounce before loading, and cancelled loads cannot win a race', () => {
  const f = fixture();
  f.advance(300); f.song('https://example.com/b');
  f.advance(300); f.song('https://example.com/c');
  f.advance(499); assert.equal(f.images.length, 0);
  f.advance(1);
  const oldCompletion = f.images[0].onload;
  f.song('https://example.com/d'); f.advance(500); f.loaded(); oldCompletion();
  assert.equal(f.images.length, 2);
  assert.equal(f.images.at(-1).src, 'https://example.com/d');
  assert.equal(f.renders, 1);
  f.advance(400); assert.equal(f.host.children.length, 1);
});

test('same cover, resize and steady playback perform no additional work', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.song('spotify:image:cover-a');
  for (let i = 0; i < 50; i++) { f.window.emit('resize'); f.player.emit('onprogress'); }
  f.advance(60000);
  assert.equal(f.renders, 1);
  assert.equal(f.images.length, 1);
  assert.equal(f.timers.size, 0);
  assert.ok(f.observers[0].targets.every(({ options }) => !options.subtree));
});

test('closing defers work, reopening renders latest cover without a fade', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.root.hidden = true; f.observers[0].fn();
  f.song('spotify:image:closed'); f.advance(5000);
  assert.equal(f.images.length, 1);
  f.root.hidden = false; f.remount(); f.advance(500); f.loaded();
  assert.equal(f.renders, 2);
  assert.equal(f.host.children.length, 1);
  assert.equal(f.layers[0].width, 0);
  assert.equal(f.timers.size, 0);
});

test('hidden document skips intermediate covers and resumes without stale work', () => {
  const f = fixture();
  f.document.hidden = true; f.document.emit('visibilitychange');
  f.song('spotify:image:hidden-a'); f.song('spotify:image:hidden-b'); f.advance(5000);
  assert.equal(f.images.length, 0);
  f.document.hidden = false; f.document.emit('visibilitychange'); f.advance(500); f.loaded();
  assert.equal(f.images[0].src, 'https://i.scdn.co/image/hidden-b');
  assert.equal(f.host.children.length, 1);
});

test('missing artwork, image failure and timeout restore the normal surface', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.song(null);
  assert.equal(f.host.children.length, 0);
  assert.equal(f.host.classList.values.has('comfy-npv-artwork-active'), false);
  f.song('https://example.com/bad'); f.advance(500); f.images.at(-1).onerror();
  assert.equal(f.timers.size, 0);
  f.song('https://example.com/slow'); f.advance(10500);
  assert.equal(f.host.children.length, 0);
  assert.equal(f.timers.size, 0);
});

test('native local covers skip loading on either OS, clear old artwork and cancel stale work', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.song('spotify:image:pending'); f.advance(500);
  const staleCompletion = f.images.at(-1).onload;
  for (const uri of [
    'spotify:localfileimage:C%3A%5CMusic%5Ctrack.mp3',
    'spotify:localfileimage:%2FUsers%2Flistener%2FMusic%2Ftrack.mp3'
  ]) {
    f.song(uri); staleCompletion(); f.advance(60000);
    assert.equal(f.images.length, 2);
    assert.equal(f.renders, 1);
    assert.equal(f.host.children.length, 0);
    assert.equal(f.host.classList.values.has('comfy-npv-artwork-active'), false);
    assert.equal(f.timers.size, 0);
  }
  // Do not exclude a track merely because its track URI is local.
  f.player.data = { item: { uri: 'spotify:local:artist:album:track:120', metadata: { image_url: 'https://example.com/local-cover' } } };
  f.player.emit('songchange'); f.advance(500); f.loaded();
  assert.equal(f.images.at(-1).src, 'https://example.com/local-cover');
  assert.equal(f.renders, 2);
  assert.equal(f.host.children.length, 1);
});

test('card and fade settings do not rerasterize; visual settings debounce and clamp', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.setting('Card-Darkening', 70); f.setting('Fade', false);
  assert.equal(f.host.style.values['--comfy-npv-card-darkening'], '0.7');
  assert.equal(f.images.length, 1);
  f.setting('Blur', 10); f.advance(100); f.setting('Brightness', 90);
  f.advance(100); f.setting('Saturation', 160); f.advance(500); f.loaded();
  assert.equal(f.renders, 2);
  f.setting('Card-Darkening', 999);
  assert.equal(f.host.style.values['--comfy-npv-card-darkening'], '0.95');
  f.setting('Card-Darkening', 'invalid');
  assert.equal(f.host.style.values['--comfy-npv-card-darkening'], '0.45');
});

test('disable cancels every resource, including a fade and an in-flight image', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.song('spotify:image:second'); f.advance(500); f.loaded();
  assert.equal(f.host.children.length, 2);
  f.song('spotify:image:third'); f.advance(500);
  const lateCompletion = f.images.at(-1).onload;
  f.setting('Enabled', false); lateCompletion(); f.advance(60000);
  assert.equal(f.host.children.length, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.player.listeners.get('songchange').size, 0);
  assert.equal(f.document.listeners.get('visibilitychange').size, 0);
  assert.equal(f.window.listeners.get('blur').size, 0);
  assert.equal(f.observers[0].targets.length, 0);
  assert.ok(f.layers.every(c => c.width === 0 && c.height === 0));
  assert.equal(f.host.style.values['--comfy-npv-card-darkening'], undefined);
  f.setting('Enabled', true); f.advance(500); f.loaded();
  assert.equal(f.player.listeners.get('songchange').size, 1);
  assert.equal(f.host.children.length, 1);
});

test('unfocused or reduced-motion transitions retain only one layer', () => {
  const f = fixture(); f.advance(500); f.loaded();
  f.document.focused = false;
  f.song('spotify:image:second'); f.advance(500); f.loaded();
  assert.equal(f.host.children.length, 1);
  f.document.focused = true;
  f.window.matchMedia = () => ({ matches: true });
  f.song('spotify:image:third'); f.advance(500); f.loaded();
  assert.equal(f.host.children.length, 1);
  f.window.matchMedia = () => ({ matches: false });
  f.song('spotify:image:fourth'); f.advance(500); f.loaded();
  assert.equal(f.host.children.length, 2);
  f.window.emit('blur');
  assert.equal(f.host.children.length, 1);
});
