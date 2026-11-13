"""Build email-safe, immutable square crops without changing source headshots."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://clefrontdesk.github.io/email-signature-generator/'

def crop_box(width, height, position):
    side = min(width, height)
    left = (width - side) // 2
    top = round((height - side) * position / 100)
    return left, top, left + side, top + side

def build(root=ROOT):
    output = root / 'headshot-crops'
    output.mkdir(exist_ok=True)
    manifest = {}
    for agent in json.loads((root / 'agents.json').read_text(encoding='utf-8'))['agents']:
        source = agent.get('headshot', '')
        if not source.startswith(BASE + 'headshots/'):
            continue
        relative = source[len(BASE):]
        path = root / relative
        if path.parent.resolve() != (root / 'headshots').resolve() or not path.is_file():
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            urls = []
            for position in range(0, 101, 10):
                filename = f'{digest}-{position}.jpg'
                target = output / filename
                if not target.exists():
                    image.crop(crop_box(*image.size, position)).resize((240, 240), Image.Resampling.LANCZOS).save(target, quality=88, optimize=True)
                urls.append(BASE + 'headshot-crops/' + filename)
            manifest[source] = urls
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')

if __name__ == '__main__':
    build()
