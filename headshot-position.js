/* Hosted square images keep the selected crop intact when email strips CSS. */
globalThis.CLEHeadshots = (() => {
  let manifest = {}, agent = null, position = 50, refresh = () => {}, loaded = false;
  const el = id => document.getElementById(id);
  const key = a => 'cle-headshot-position:' + String(a.email || a.name).trim().toLowerCase();
  const clamp = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Math.round(Number(value) / 10) * 10)) : 50;
  function sync() {
    const available = !!manifest[agent?.headshot];
    el('headshotPositionArea').classList.toggle('hidden', !agent?.headshot);
    el('headshotPosition').value = String(position);
    el('headshotPosition').disabled = !available;
    el('headshotPositionReset').disabled = !available;
    el('copyBtn').disabled = !!agent?.headshot && !loaded;
    el('headshotPositionValue').textContent = position + '%';
    el('headshotPositionHint').textContent = available
      ? 'Move left to show more of the top of your photo, including hair. Saved for this agent in this browser.'
      : loaded ? 'Position adjustment is not available for this photo yet.' : 'Loading photo positions...';
  }
  function load(a, render) {
    agent = a; refresh = render; position = 50;
    try { const saved = localStorage.getItem(key(a)); if (saved !== null) position = clamp(saved); } catch (_) { /* Storage may be blocked in an embed. */ }
    sync();
  }
  el('headshotPosition').addEventListener('input', () => {
    position = clamp(el('headshotPosition').value);
    try { localStorage.setItem(key(agent), String(position)); } catch (_) { /* Preview still works without persistence. */ }
    sync(); refresh();
  });
  el('headshotPositionReset').addEventListener('click', () => {
    position = 50;
    try { localStorage.removeItem(key(agent)); } catch (_) {}
    sync(); refresh();
  });
  fetch('headshot-crops/manifest.json', {cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error('Crop manifest unavailable'); return r.json(); })
    .then(value => { manifest = value; })
    .catch(() => {})
    .finally(() => { loaded = true; if (agent) { sync(); refresh(); } });
  return {load, url(a) { return manifest[a?.headshot]?.[position / 10] || a?.headshot || ''; }};
})();
