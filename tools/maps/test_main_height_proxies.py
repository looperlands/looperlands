import json
import unittest

from PIL import Image

from generate_main_height_proxies import ARTWORK, ATLAS, ROOT, make_atlas


class HeightProxyAtlasTest(unittest.TestCase):
    def test_checked_in_atlas_matches_profiles_and_outdoor_artwork(self):
        with Image.open(ARTWORK) as source, Image.open(ATLAS) as atlas:
            self.assertEqual(atlas.size, source.size)
            self.assertEqual(atlas.tobytes(), make_atlas(source).tobytes())
            with (ROOT / 'client/maps/world_client_main.json').open() as file:
                main_map = json.load(file)
            # Sample the source pixel, its actual map placement, and extrusion depth.
            samples = [
                ('Town house', 115, 50, 15, 215, 18),
                ('Town oak', 220, 185, 30, 194, 12),
                ('Town boulder', 282, 18, 48, 213, 8),
                ('Town pipe', 288, 669, 84, 198, 8),
                ('Desert column', 28, 1280, 64, 94, 7),
                ('Desert posts', 6, 576, 9, 92, 5),
                ('Desert fossil', 22, 656, 19, 93, 10),
                ('Smith barrel', 159, 2096, 148, 442, 5),
                ('Smith anvil', 159, 2066, 153, 440, 4),
                ('Party beach parasol', 17, 396, 62, 441, 6),
            ]
            for name, px, py, tx, ty, depth in samples:
                with self.subTest(body=name):
                    gid = 1 + (py // 16) * main_map['tilesetColumns'] + px // 16
                    cell = main_map['data'][ty * main_map['width'] + tx]
                    self.assertIn(gid, cell if isinstance(cell, list) else [cell])
                    red, height, blue, alpha = atlas.getpixel((px, py))
                    self.assertGreater(height, 0)
                    self.assertEqual((red, blue, alpha), (min(255, 3 * height), 255 - depth, 255))
            # Lower facade pixels have less height than the slate roof. Flat
            # ground and the oak's translucent painted shadow cast nothing.
            self.assertLess(atlas.getpixel((74, 133))[1], atlas.getpixel((115, 50))[1])
            self.assertEqual(atlas.getpixel((180, 19))[3], 0)
            self.assertEqual(atlas.getpixel((200, 224))[3], 0)


if __name__ == '__main__':
    unittest.main()
