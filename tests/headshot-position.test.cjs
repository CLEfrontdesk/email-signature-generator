const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('hosted crops, agent isolation, reset and blocked storage', async () => {
  const elements = new Map(), saved = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {classList:{toggle(){}}, listeners:{}, addEventListener(type, fn){this.listeners[type]=fn;}});
    return elements.get(id);
  };
  const context = vm.createContext({document:{getElementById:element}, localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},fetch:async()=>({ok:true,json:async()=>({'photo-a':Array.from({length:11},(_,i)=>`https://example.com/crop-${i}.jpg`)})})});
  vm.runInContext(fs.readFileSync('headshot-position.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const h=context.CLEHeadshots, a={email:'a@example.com',headshot:'photo-a'};
  h.load(a,()=>{});
  assert.equal(h.url(a),'https://example.com/crop-5.jpg');
  element('headshotPosition').value='0'; element('headshotPosition').listeners.input();
  assert.equal(h.url(a),'https://example.com/crop-0.jpg');
  h.load({email:'b@example.com',headshot:'photo-a'},()=>{});
  assert.equal(h.url(a),'https://example.com/crop-5.jpg');
  h.load(a,()=>{}); assert.equal(element('headshotPosition').value,'0');
  element('headshotPositionReset').listeners.click(); assert.equal(h.url(a),'https://example.com/crop-5.jpg');
  context.localStorage.getItem=()=>{throw Error('blocked');};
  h.load(a,()=>{}); assert.equal(h.url(a),'https://example.com/crop-5.jpg');
  h.load({email:'missing',headshot:''},()=>{}); assert.equal(h.url({}), '');
});
