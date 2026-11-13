// Run manually with PLAYWRIGHT_PACKAGE set to the installed Playwright package.
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const fs=require('node:fs'), http=require('node:http'), path=require('node:path'), assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(p,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.json')?'application/json':p.endsWith('.jpg')?'image/jpeg':'text/html');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.BROWSER_PATH,headless:true});
    const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    await context.route('https://clefrontdesk.github.io/email-signature-generator/**',async route=>{
      const relative=route.request().url().split('/email-signature-generator/')[1];
      const p=path.join(root,relative);
      if(fs.existsSync(p)) await route.fulfill({path:p}); else await route.abort();
    });
    await context.route('https://drive.google.com/**',route=>route.abort());
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const file of ['generator.html','generator-v2.html']){
      await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Array.from(document.querySelector('#agentSelect').options).some(o=>o.text==='Paul Cooper'));
      const paul=await page.locator('#agentSelect option').evaluateAll(options=>options.find(o=>o.text==='Paul Cooper').value);
      await page.selectOption('#agentSelect',paul);
      await page.waitForFunction(()=>!document.querySelector('#headshotPosition').disabled);
      await page.locator('#headshotPosition').fill('0');
      const image=page.locator('#signaturePreview img').first();
      await image.evaluate(img=>img.decode());
      const src=await image.getAttribute('src');assert.match(src,/-0.jpg$/);
      const box=await image.boundingBox();assert.equal(box.width,file==='generator.html'?104:120);
      await page.click('#copyBtn');
      const copied=await page.evaluate(async()=>{const items=await navigator.clipboard.read();return (await items[0].getType('text/html')).text();});
      assert.ok(copied.includes(src));assert.ok(!copied.includes('object-position'));
      assert.ok(copied.includes('mailto:paul@cliffmlewis.com'));
      await page.reload();await page.waitForFunction(()=>!document.querySelector('#agentSelect').textContent.includes('Loading roster'));
      await page.selectOption('#agentSelect',paul);
      assert.equal(await page.locator('#headshotPosition').inputValue(),'0');
      await page.click('#headshotPositionReset');assert.equal(await page.locator('#headshotPosition').inputValue(),'50');
      await page.screenshot({path:path.join(root,'../'+file+'.png'),fullPage:true});
      console.log(file+': Paul crop, live preview, clipboard URL, dimensions, persistence and reset passed');
    }
    assert.deepEqual(errors,[]);
  } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
