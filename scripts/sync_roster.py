"""Rebuild signature profiles only from the complete, confirmed CLE roster export."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

SOURCE_ID = '1a44VfxcgighbzytEgV-Apc261bt5-5mlgBZ7pFWdssM'
SOURCE_SHEET = 'Everyone'
HEADSHOT_BASE = 'https://clefrontdesk.github.io/email-signature-generator/headshots/'
ROLE_LABELS = {'boss/ceo': 'BOSS/CEO', 'c.o.o.': 'C.O.O.', 'virtual assistant': 'Virtual Assistant', 'cliff assistant': 'Cliff Assistant'}

def text(value):
    return str(value or '').strip()

def key(value):
    return re.sub(r'[^a-z0-9]+', '', text(value).lower())

def rebuild(payload, previous, manifest, allow_large_removal=False):
    if payload.get('schemaVersion') != 1 or payload.get('complete') is not True:
        raise ValueError('Roster API did not return a complete version 1 export')
    if payload.get('source') != {'spreadsheetId': SOURCE_ID, 'sheet': SOURCE_SHEET}:
        raise ValueError('Roster source does not match the confirmed Everyone tab')
    rows = payload.get('agents')
    if not isinstance(rows, list) or not rows:
        raise ValueError('Refusing an empty or invalid roster')
    old = {text(a.get('email')).lower(): a for a in previous.get('agents', [])}
    photos = {key(name): filename for name, filename in manifest.items()}
    agents, emails, names, nmls_owners = [], set(), set(), {}
    for number, row in enumerate(rows, 2):
        if not isinstance(row, dict):
            raise ValueError(f'Invalid roster row {number}')
        name = text(row.get('name')).rstrip('*').strip()
        email = text(row.get('email')).lower()
        if not name or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
            raise ValueError(f'Row {number} needs a name and valid email')
        if email in emails or key(name) in names:
            raise ValueError(f'Duplicate profile at row {number}')
        emails.add(email)
        names.add(key(name))
        prior = old.get(email, {})
        license_number = text(row.get('license'))
        role = ROLE_LABELS.get(license_number.lower())
        title = text(row.get('title')) or role or prior.get('title') or 'Realtor'
        if role:
            license_number = ''
        nmls = text(row.get('nmls'))
        if nmls and (not nmls.isascii() or not nmls.isdigit()):
            raise ValueError(f'Row {number} has a nonnumeric NMLS number')
        if nmls in nmls_owners:
            print(f'Warning: NMLS #{nmls} occurs more than once; verify it in the roster', file=sys.stderr)
        if nmls:
            nmls_owners[nmls] = name
        handle = text(row.get('instagram_handle')).lstrip('@').rstrip('/')
        if handle.startswith(('https://www.instagram.com/', 'https://instagram.com/')):
            handle = urllib.parse.urlparse(handle).path.strip('/')
        if handle and not re.fullmatch(r'[A-Za-z0-9_.]+', handle):
            print(f'Warning: invalid Instagram handle at row {number}; omitted', file=sys.stderr)
            handle = ''
        apply_url = text(row.get('apply_url'))
        if apply_url:
            url = urllib.parse.urlparse(apply_url)
            if url.scheme != 'https' or not url.hostname or url.username or url.password:
                raise ValueError(f'Row {number} needs an HTTPS Apply Now URL')
        photo = prior.get('headshot', '')
        filename = photos.get(key(name))
        if filename and re.fullmatch(r'[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)', filename, re.I):
            photo = HEADSHOT_BASE + urllib.parse.quote(filename)
        agents.append(dict(name=name, email=email, phone=text(row.get('phone')), license=license_number,
                           nmls=nmls, office=text(row.get('office')), languages=text(row.get('languages')),
                           title=title, instagram_handle=handle,
                           instagram_url=f'https://www.instagram.com/{handle}/' if handle else '',
                           headshot=photo, apply_url=apply_url))
    removed = set(old) - emails
    if old and len(removed) / len(old) > 0.2 and not allow_large_removal:
        raise ValueError('More than 20% of existing profiles would be removed. Review the roster, then use the manual allow_large_removal input if intentional.')
    agents.sort(key=lambda agent: agent['name'].casefold())
    result = dict(previous)
    result['agents'] = agents
    result['source'] = payload['source']
    print(f'Roster: {len(agents)} profiles; {len(emails - set(old))} added; {len(removed)} removed')
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, help='Validate a saved export instead of calling the API')
    parser.add_argument('--roster', type=Path, default=Path('agents.json'))
    parser.add_argument('--manifest', type=Path, default=Path('headshots/manifest.json'))
    parser.add_argument('--allow-large-removal', action='store_true')
    args = parser.parse_args()
    if args.input:
        payload = json.loads(args.input.read_text(encoding='utf-8'))
    else:
        api = os.environ.get('ROSTER_API_URL', '').strip()
        if not api.startswith('https://script.google.com/macros/s/') or not api.endswith('/exec'):
            raise ValueError('Set ROSTER_API_URL to the deployed roster Apps Script /exec URL')
        request = urllib.request.Request(api, headers={'User-Agent': 'CLE-signature-sync'})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.load(response)
    previous = json.loads(args.roster.read_text(encoding='utf-8'))
    manifest = json.loads(args.manifest.read_text(encoding='utf-8')) if args.manifest.exists() else {}
    result = rebuild(payload, previous, manifest, args.allow_large_removal)
    temporary = args.roster.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temporary.replace(args.roster)

if __name__ == '__main__':
    main()
