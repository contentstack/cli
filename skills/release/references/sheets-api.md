# Google Sheets API — batchUpdate Payloads

All requests go to:
```
POST https://sheets.googleapis.com/v4/spreadsheets/<spreadsheetId>/values:batchUpdate
```

All authenticated via OAuth2 bearer token (see SKILL.md Step 6a for token refresh).

## Tab GIDs (template sheet)

| Tab | GID |
|-----|-----|
| Ticket List | 231599262 |
| Deployment Plan | 0 |
| Rollback Plan | 1940902083 |
| Check List | 878611207 |

After copying the template, the new sheet keeps the same GIDs.

## Get sheet ID from GID

```javascript
const meta = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/<id>?fields=sheets.properties`)
  .then(r => r.json());
const sheet = meta.sheets.find(s => s.properties.sheetId === <gid>);
const sheetTitle = sheet.properties.title; // use title for A1 notation range
```

## Write rows — Ticket List

```javascript
const body = {
  valueInputOption: 'USER_ENTERED',
  data: [{
    range: 'Ticket List!A2:I<N+1>',  // N = number of tickets
    values: tickets.map(t => [
      t.fields.issuetype.name,    // A: Issue Type
      t.key,                      // B: Key
      t.fields.summary,           // C: Summary
      t.fields.parent?.key ?? '', // D: parent
      t.fields.sprint?.name ?? '',// E: Sprint
      t.fields.status.name,       // F: Status
      t.fields.created,           // G: Created
      t.fields.assignee?.displayName ?? '', // H: Assignee
      t.fields.reporter?.displayName ?? ''  // I: Reporter
    ])
  }]
};
await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newId}/values:batchUpdate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
```

## Write rows — Deployment Plan

```javascript
const body = {
  valueInputOption: 'USER_ENTERED',
  data: [{
    range: 'Deployement Plan!A3:F<N+2>',  // note: tab has typo "Deployement"
    values: plan.map((row, i) => [
      i + 1,              // A: Sr No.
      row.packageAtVersion, // B: Plugin/SDK e.g. "@your-org/sdk@2.1.0"
      row.platform,       // C: Release Platform e.g. "NPM/GITHUB"
      row.owner,          // D: Owner
      '',                 // E: Test Report (human fills)
      ''                  // F: Status (human fills)
    ])
  }]
};
```

## Write rows — Rollback Plan

```javascript
// During Push section starts at row 3
const body = {
  valueInputOption: 'USER_ENTERED',
  data: [{
    range: 'Rollback Plan!A3:D<N+2>',
    values: rollback.map(row => [
      row.task,        // A: Task (e.g. "npm deprecate @your-org/sdk@2.1.0 ...")
      row.owner,       // B: Owner
      '',              // C: Status
      ''               // D: Description
    ])
  }]
};
```

## Clear a range before writing

```javascript
await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Ticket%20List!A2:I1000:clear`, {
  method: 'POST'
});
```

## Copy template via Drive API

```javascript
// templateId comes from config.google_sheet_template_id (read from references/config.json)
const resp = await fetch(
  `https://www.googleapis.com/drive/v3/files/${templateId}/copy`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${projectKey} | ${releaseDate} | ${releaseType}` })
  }
);
const { id, webViewLink } = await resp.json();
// id = new spreadsheet ID to use in all subsequent Sheets API calls
// webViewLink = share URL to give the user
```

Note: Bearer token is obtained via scripts/refresh-google-token.sh using the credentials in
references/google-credentials.json (gitignored). See SKILL.md Step 6a for details.
