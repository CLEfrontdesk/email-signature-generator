/* Apply inline colors to the Gmail header so clipboard HTML retains the theme. */
globalThis.CLESignatureColors = (() => {
  const backgrounds = {classic:'#f7f9fb',blue:'#e8f1fb',cream:'#fff4df',sage:'#eaf2e8',lavender:'#f0eafa',black:'#17191d'};
  let agent = null, refresh = () => {};
  const select = document.getElementById('signatureColor');
  const key = a => 'cle-signature-color:' + String(a.email || a.name).trim().toLowerCase();
  function load(a, render) {
    agent = a; refresh = render; select.value = 'classic';
    try { const saved = localStorage.getItem(key(a)); if (Object.hasOwn(backgrounds,saved)) select.value = saved; } catch (_) {}
  }
  select.addEventListener('change', () => {
    if (!Object.hasOwn(backgrounds,select.value)) select.value = 'classic';
    if (agent) { try { localStorage.setItem(key(agent),select.value); } catch (_) {} }
    refresh();
  });
  function apply(html, tab) {
    if (tab !== 'gmail' || select.value === 'classic') return html;
    const theme = Object.hasOwn(backgrounds,select.value) ? select.value : 'classic';
    const holder = document.createElement('div'); holder.innerHTML = html;
    const header = holder.querySelector('[data-signature-header]');
    if (!header) return html;
    header.style.backgroundColor = backgrounds[theme];
    header.setAttribute('bgcolor', backgrounds[theme]);
    if (theme === 'black') {
      header.style.color = '#f5f7fa';
      for (const node of header.querySelectorAll('*')) {
        if (node.closest('[data-signature-logos]') || node.tagName === 'IMG') continue;
        node.style.color = node.tagName === 'A' ? (node.style.background ? '#ffffff' : '#a9d7ff') : '#f5f7fa';
      }
    }
    const logos = header.querySelector('[data-signature-logos]');
    if (logos) { logos.style.backgroundColor = '#ffffff'; logos.style.padding = '8px 0'; }
    return holder.innerHTML;
  }
  return {load, apply};
})();
