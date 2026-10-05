const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function page(file) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {value:'', checked:false, innerHTML:'', textContent:'', classList:{toggle(){},remove(){},add(){}}, addEventListener(){}});
    return elements.get(id);
  };
  const context = vm.createContext({URL, document:{getElementById:element,querySelectorAll:()=>[]},fetch:()=>new Promise(()=>{})});
  vm.runInContext(fs.readFileSync(path.join(root,'mortgage.js'),'utf8'),context);
  const html = fs.readFileSync(path.join(root,file),'utf8');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  return {context,element,run:expression=>vm.runInContext(expression,context)};
}
for (const file of ['generator-v2.html','generator.html']) {
  test(file + ': all formats include both NMLS numbers and mortgage links only when enabled', () => {
    const p=page(file), modern=file==='generator.html';
    const load=modern?'load':'loadAgent', data=modern?'d()':'data()';
    const renderers=modern?['gmail','fub','vacation']:['gmailHtml','fubHtml','vacationHtml'];
    p.run(`${load}({name:'Test Agent',nmls:'2578349',license:'RS123',headshot:'https://example.com/photo.jpg',apply_url:'https://example.com/apply?lo=123&source=email'})`);
    p.element('includeMortgage').checked=true;
    for(const render of renderers){
      const html=p.run(`${render}(${data})`);
      assert.match(html,/NMLS #2578349/); assert.match(html,/Company NMLS #894392/);
      assert.match(html,/https:\/\/blueskyhomefinance.com\//); assert.match(html,/Apply Now/);
      assert.match(html,/lo=123&amp;source=email/);
      p.element('includeMortgage').checked=false;
      assert.doesNotMatch(p.run(`${render}(${data})`),/NMLS|Blue Sky|Apply Now/);
      p.element('includeMortgage').checked=true;
    }
    p.run(`${load}({name:'Non LO',nmls:''})`);
    assert.equal(p.element('applyUrl').value,'');
    p.element('includeMortgage').checked=true;
    for(const render of renderers) assert.doesNotMatch(p.run(`${render}(${data})`),/NMLS|Blue Sky|Apply Now/);
  });
}
for (const file of ['generator-v2.html','generator.html']) {
  test(file + ': optional second-state license appears in every signature format', () => {
    const p=page(file), modern=file==='generator.html';
    const load=modern?'load':'loadAgent', data=modern?'d()':'data()';
    const renderers=modern?['gmail','fub','vacation']:['gmailHtml','fubHtml','vacationHtml'];
    p.run(`${load}({name:'Test Agent',license:'RS123'})`);
    p.element('additionalLicenseState').value='nj';
    p.element('additionalLicense').value='2080123';
    for(const render of renderers){
      const html=p.run(`${render}(${data})`);
      assert.match(html,/PA #RS123/);
      assert.match(html,/NJ #2080123/);
    }
    p.element('additionalLicenseState').value='';
    for(const render of renderers) assert.doesNotMatch(p.run(`${render}(${data})`),/NJ #2080123/);
  });
}
test('application link defaults and invalid URLs',()=>{
  const p=page('generator.html');
  assert.match(p.run("CLEMortgage.links(true,'123','')"),/siteId=8983717502&amp;workFlowId=208215/);
  for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com','invalid']) {
    assert.equal(p.run(`CLEMortgage.applicationUrl(${JSON.stringify(url)})`),'');
    assert.doesNotMatch(p.run(`CLEMortgage.links(true,'123',${JSON.stringify(url)})`),/Apply Now/);
  }
  assert.equal(p.run("CLEMortgage.links(true,'not licensed','')"),'');
});

