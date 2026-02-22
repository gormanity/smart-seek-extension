/**
 * seek-controller.js — Content script for YTTV Seek Extension.
 *
 * Self-contained IIFE. Logic is inlined from seek-logic.js so there is no
 * dynamic import that could fail silently and leave no event listener attached.
 * seek-logic.js is kept as the ES-module source of truth for unit tests.
 */
(function () {
  // ── Defaults ──────────────────────────────────────────────────────────────
  var DEFAULT_SETTINGS = {
    seekAmount: 5,
    backKey:    'Shift+J',
    forwardKey: 'Shift+L',
  };

  // ── Key matching (mirrors seek-logic.js) ─────────────────────────────────

  function parseKey(keyString) {
    var parts = keyString.split('+');
    var mods  = { shift: false, ctrl: false, alt: false, meta: false };
    for (var i = 0; i < parts.length - 1; i++) {
      switch (parts[i].toLowerCase()) {
        case 'shift':                   mods.shift = true; break;
        case 'ctrl': case 'control':    mods.ctrl  = true; break;
        case 'alt':                     mods.alt   = true; break;
        case 'meta': case 'cmd':
        case 'command':                 mods.meta  = true; break;
      }
    }
    var key = parts[parts.length - 1];
    if (mods.shift && key.length === 1 && /[a-z]/i.test(key)) {
      key = key.toUpperCase();
    }
    return { key: key, shift: mods.shift, ctrl: mods.ctrl, alt: mods.alt, meta: mods.meta };
  }

  function matchesKey(event, keyString) {
    var parsed = parseKey(keyString);
    return (
      event.key      === parsed.key   &&
      !!event.shiftKey === parsed.shift &&
      !!event.ctrlKey  === parsed.ctrl  &&
      !!event.altKey   === parsed.alt   &&
      !!event.metaKey  === parsed.meta
    );
  }

  function applySeek(video, seconds) {
    video.currentTime = Math.max(0, video.currentTime + seconds);
  }

  function formatSeekLabel(seconds) {
    return String(Math.abs(seconds));
  }

  // ── OSD (on-screen display) ───────────────────────────────────────────────

  // Arrow-only path from YouTube TV's seek icon (digit subpaths omitted so
  // we can overlay the actual configured seek amount as a label).
  var ARROW_PATH = 'M4.293.293a1 1 0 011.414 1.414L4.414 3H13l.496.013A10 10 0 0113 23'
    + 'a1 1 0 010-2 8.001 8.001 0 00.396-15.99L13 5H4.414l1.293 1.293a1 1 0 01-1.414'
    + ' 1.414L.586 4 4.293.293Z';

  var osdEl    = null;
  var osdLabel = null;

  function createOsdEl() {
    var el = document.createElement('div');
    el.className = 'yttv-seek-osd';
    el.innerHTML =
      '<div class="yttv-seek-osd__content">'
      + '<div class="yttv-seek-osd__ring">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="' + ARROW_PATH + '"/>'
      + '</svg>'
      + '<span class="yttv-seek-osd__label"></span>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
    return el;
  }

  function showOsd(direction, seconds) {
    if (!osdEl) {
      osdEl    = createOsdEl();
      osdLabel = osdEl.querySelector('.yttv-seek-osd__label');
    }

    osdLabel.textContent = formatSeekLabel(seconds);
    osdEl.classList.toggle('yttv-seek-osd--forward', direction === 'forward');

    // Restart the keyframe animation on every press via forced reflow.
    osdEl.classList.remove('yttv-seek-osd--visible');
    void osdEl.offsetWidth;
    osdEl.classList.add('yttv-seek-osd--visible');
  }

  // ── Hardcoded bindings (always active, regardless of user settings) ───────
  var HARDCODED_BACK_KEY    = 'Shift+ArrowLeft';
  var HARDCODED_FORWARD_KEY = 'Shift+ArrowRight';

  // ── Storage shim ──────────────────────────────────────────────────────────
  var chromeOrBrowser = (typeof browser !== 'undefined' ? browser : chrome);
  var storageSync = chromeOrBrowser.storage.sync;

  // ── Live settings (updated without page reload) ───────────────────────────
  var settings = Object.assign({}, DEFAULT_SETTINGS);

  storageSync.get(DEFAULT_SETTINGS, function (stored) {
    Object.assign(settings, stored);
  });

  // ── Key handler ───────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (event) {
    // Ignore keypresses inside text inputs.
    var el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      return;
    }

    var isBack    = matchesKey(event, settings.backKey)    || matchesKey(event, HARDCODED_BACK_KEY);
    var isForward = matchesKey(event, settings.forwardKey) || matchesKey(event, HARDCODED_FORWARD_KEY);
    if (!isBack && !isForward) return;

    // Pick the best candidate: playing > ready-with-duration > first
    var videos = Array.from(document.querySelectorAll('video'));
    var video = videos.find(function(v) { return !v.paused && v.readyState >= 2; })
             || videos.find(function(v) { return v.readyState >= 2 && v.duration > 0; })
             || videos[0];

    if (!video) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var direction = isForward ? 'forward' : 'back';
    applySeek(video, isForward ? settings.seekAmount : -settings.seekAmount);
    showOsd(direction, settings.seekAmount);
  }, /* capture */ true);

  // ── Live settings via storage changes ────────────────────────────────────
  chromeOrBrowser.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    for (var key in changes) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        settings[key] = changes[key].newValue;
      }
    }
  });
}());
