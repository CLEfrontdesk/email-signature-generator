// Deploy as a SEPARATE Apps Script web app. Do not replace the headshot API.
const ROSTER_SPREADSHEET_ID = '1a44VfxcgighbzytEgV-Apc261bt5-5mlgBZ7pFWdssM';
const ROSTER_SHEET_NAME = 'Everyone';

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID).getSheetByName(ROSTER_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) throw new Error('Roster sheet is missing or empty');
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values.shift().map(value => value.trim());
    const required = ['Name', 'E-Mail Address', 'Phone Number', 'License #', 'NMLS #', 'Instagram Name', 'Office', 'Languages'];
    required.forEach(header => {
      if (headers.filter(value => value === header).length !== 1) throw new Error('Missing or duplicate header: ' + header);
    });
    const fields = {
      name:'Name', email:'E-Mail Address', phone:'Phone Number', license:'License #',
      nmls:'NMLS #', instagram_handle:'Instagram Name', office:'Office', languages:'Languages',
      title:'Title', apply_url:'Apply Now URL'
    };
    const agents = values.filter(row => row.slice(0, 8).some(value => value.trim())).map(row => {
      const agent = {};
      Object.entries(fields).forEach(([field, header]) => {
        const index = headers.indexOf(header);
        if (index >= 0) agent[field] = (row[index] || '').trim();
      });
      return agent;
    });
    return json_({schemaVersion:1, complete:true, source:{spreadsheetId:ROSTER_SPREADSHEET_ID, sheet:ROSTER_SHEET_NAME}, agents});
  } catch (error) {
    // No partial roster and no internal spreadsheet contents in error responses.
    return json_({schemaVersion:1, complete:false, error:'Roster export failed. Check required headers and access.'});
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
