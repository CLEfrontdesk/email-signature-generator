const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function exportRows(rows){
  const context=vm.createContext({
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getLastRow:()=>rows.length,getDataRange:()=>({getDisplayValues:()=>rows.map(row=>[...row])})})})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:content=>({setMimeType:()=>content})}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/roster-api.gs'),'utf8'),context);
  return JSON.parse(vm.runInContext('doGet()',context));
}
const headers=['Name','E-Mail Address','Phone Number','License #','NMLS #','Instagram Name','Office','Languages','Birthday','FUB ID #','Title','Apply Now URL'];
test('export includes only signature fields, supports optional title and application, ignores blank rows',()=>{
  const result=exportRows([headers,['Test','test@example.com','123','RS123','123','','Office','English','PRIVATE','SECRET','Manager','https://example.com/apply'],['','','','','','','','','','','','']]);
  assert.equal(result.complete,true);
  assert.equal(result.agents.length,1);
  assert.equal(result.agents[0].title,'Manager');
  assert.equal(result.agents[0].apply_url,'https://example.com/apply');
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|SECRET|Birthday|FUB/);
});
test('missing headers never emit a partial roster',()=>{
  const result=exportRows([['Name'],['Test']]);
  assert.equal(result.complete,false);
  assert.equal(result.agents,undefined);
});
