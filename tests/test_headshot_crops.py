import importlib.util
import unittest
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('crops', Path(__file__).resolve().parents[1] / 'scripts/build_headshot_crops.py')
crops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crops)

class CropTests(unittest.TestCase):
    def test_top_center_bottom_and_landscape(self):
        self.assertEqual(crops.crop_box(200, 400, 0), (0, 0, 200, 200))
        self.assertEqual(crops.crop_box(200, 400, 50), (0, 100, 200, 300))
        self.assertEqual(crops.crop_box(200, 400, 100), (0, 200, 200, 400))
        self.assertEqual(crops.crop_box(400, 200, 0), (100, 0, 300, 200))

    def test_every_published_crop_is_square(self):
        self.assertTrue(list((crops.ROOT / 'headshot-crops').glob('*.jpg')))
        for path in (crops.ROOT / 'headshot-crops').glob('*.jpg'):
            with Image.open(path) as image:
                self.assertEqual(image.size, (240, 240))
