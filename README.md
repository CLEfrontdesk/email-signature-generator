# CLE email signature generator

Use [the main generator](https://clefrontdesk.github.io/email-signature-generator/generator.html) or [v2](https://clefrontdesk.github.io/email-signature-generator/generator-v2.html).

## Source of truth

[Public Team Roster - CLE](https://docs.google.com/spreadsheets/d/1a44VfxcgighbzytEgV-Apc261bt5-5mlgBZ7pFWdssM/edit), **Everyone** tab (gid `1571367455`). The owner confirmed that everyone listed is active. Row removal removes the signature profile on the next successful sync. Do not use the older `Cliff Lewis Experience - Roster` or the commission-tier workbook.

| Column | Signature field |
| --- | --- |
| A: Name | Name |
| B: E-Mail Address | Email and stable matching key |
| C: Phone Number | Cell |
| D: License # | License, or existing staff role labels |
| E: NMLS # | Individual mortgage license |
| F: Instagram Name | Instagram |
| G: Office | Office |
| H: Languages | Languages |

Optional columns named `Title` and `Apply Now URL` can be appended to Everyone when needed. The exporter locates them by header. With no Title, recognized staff labels in License # become titles; otherwise an existing profile title is retained, with Realtor as the new-profile default. Birthdays, join dates, group membership and internal system fields are never exported.

## Deployed roster API

The roster requires Google authentication. GitHub reads only the approved signature fields through the separate [CLE Signature Roster API project](https://script.google.com/home/projects/1-F8FByRh75VSRG0cADKrmxrE2Qo0A5ZlloEUmciZK9NDY2ccpnZBvmvo/edit), deployed October 2, 2026. The workflow contains its deployed URL; no repository variable is required. `ROSTER_API_URL` can optionally override it when replacing the deployment.

To recreate or update the exporter:

1. Sign into Apps Script with an account that can read the roster. Create a project named `CLE Signature Roster API` and paste the file into Code.gs. In Project Settings, show the manifest, then use `apps-script/appsscript.json` so the script requests only read access to spreadsheets.
2. Deploy a web app that executes as the owner and allows Anyone to access the approved professional signature fields. Complete Google's authorization in your own account.
3. Update the existing deployment to a new version to keep its URL. If creating a replacement deployment, set its `/exec` URL as the GitHub repository **Actions variable** `ROSTER_API_URL` under Settings > Secrets and variables > Actions > Variables.
4. Run **Actions > Sync Signature Data > Run workflow**. Check that the roster step completes and verify the published generator's dropdown.

Any roster fetch/validation failure stops the workflow before committing. The previous published profiles remain intact. The new workflow starts on merge because its workflow file changed, and retains its manual and Monday triggers.

## Maintenance after activation

- **New hire:** add their row to Everyone, put their photo in the existing Drive headshot folder, then run Sync Signature Data.
- **Departure:** remove their row from Everyone, then run Sync Signature Data. Historical headshot files are retained; they no longer create a profile.
- **Contact, license, title or application link:** update Everyone and run the workflow.
- **New photo:** replace it in the existing headshot folder and run the workflow.
- The automatic Monday run remains at 12:15 UTC. The workflow file remains `sync-headshots.yml`, so existing manual workflow links remain valid.

The roster step builds the new profile list first, preserving headshots by email and matching the saved photo manifest by normalized name. The original headshot download step then refreshes photos. Everything is committed together. Empty exports, changed source identifiers, missing fields, duplicate names/emails, invalid NMLS/application URLs, and removals exceeding 20% stop the update. Intentional large removals can use the manual `allow_large_removal` option after reviewing the sheet.

## Mortgage signatures

Both roster-based generators share `mortgage.js`. With mortgage included and a numeric individual NMLS number, Gmail, FUB / Sure Send, and Vacation include **Company NMLS #894392**, the Blue Sky website and **Apply Now**. Mortgage-off and non-LO profiles omit these details.

`Apply Now URL` in the sheet, or the generator's input, accepts a personal HTTPS application link. Blank uses [Blue Sky's main application](https://blueskyhomefinance.com/loan-app/?siteId=8983717502&workFlowId=208215), linked by [Blue Sky's website](https://blueskyhomefinance.com/). The main application is not a personal referral link. Invalid nonempty links are omitted rather than rendered.

The legacy `index.html` and `fub.html` are manual builders and are not the roster-based generator. Their behavior is unchanged.

## Verification

Run `node --test tests/*.test.cjs` and `python -m unittest discover -s tests -p 'test_*.py'`. GitHub checks both on pull requests. Tests cover all six signature variants, mortgage on/off, link escaping, profile switching, roster additions/removals, retained headshots, validation, and exporter field privacy.

Data review from October 2, 2026: Everyone repeats NMLS 2584611 for Asia Smith and Devin Zydyk. Verify these in the source roster; the sync does not guess license corrections. George Zumas's Instagram value contains spaces and is omitted as an invalid handle. Kim Drogo's Instagram value is `Allentown`; verify that value as well.
