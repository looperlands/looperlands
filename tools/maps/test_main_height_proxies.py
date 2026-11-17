import json
import unittest

from PIL import Image

from generate_main_height_proxies import ARTWORK, ATLAS, BAKED_SHADOWS, ROOT, make_atlas, make_shadow_mask


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
                ('Town oak', 220, 185, 30, 194, 22),
                ('Town boulder', 282, 18, 48, 213, 7),
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
                    expected_red = min(255, 3 * height) - int(name == 'Town oak')
                    self.assertEqual((red, blue, alpha), (expected_red, 255 - depth, 255))
            # Lower facade pixels have less height than the slate roof. Flat
            # ground and the oak's translucent painted shadow cast nothing.
            self.assertLess(atlas.getpixel((74, 133))[1], atlas.getpixel((115, 50))[1])
            self.assertEqual(atlas.getpixel((180, 19))[3], 0)
            self.assertEqual(atlas.getpixel((200, 224))[3], 0)

    def test_mask_only_removes_the_profiled_terrain_ground_shadows(self):
        with Image.open(ARTWORK) as source, Image.open(BAKED_SHADOWS) as mask:
            self.assertEqual(mask.size, source.size)
            self.assertEqual(mask.tobytes(), make_shadow_mask(source).tobytes())
            for point in [(209, 228), (164, 90), (314, 49), (44, 1293), (59, 1504)]:
                self.assertEqual(mask.getpixel(point)[3], 255, point)
            # Keep grass, glass, noticeboard wood, boulder underside and unrelated tile shadows.
            for point in [(260, 193), (27, 2045), (10, 2933), (282, 40), (34, 50)]:
                self.assertEqual(mask.getpixel(point)[3], 0, point)
            self.assertIsNone(mask.crop((256, 192, 320, 224)).getbbox())

    def test_board_panel_and_oak_crown_allow_light_underneath(self):
        with Image.open(ATLAS) as atlas:
            for point in [(32, 2890), (32, 2928), (220, 185), (229, 221)]:
                red, height, _, alpha = atlas.getpixel(point)
                self.assertGreater(height, 0, point)
                self.assertEqual((red, alpha), (min(255, 3 * height) - 1, 255), point)
            for point in [(12, 2929), (51, 2931), (222, 222), (215, 231)]:
                red, height, _, alpha = atlas.getpixel(point)
                self.assertGreater(height, 0, point)
                self.assertEqual((red, alpha), (min(255, 3 * height), 255), point)
            self.assertEqual(atlas.getpixel((32, 2931))[3], 0)  # air between the legs

    def test_oak_crown_rounds_off_at_its_top_and_meets_the_hidden_trunk(self):
        with Image.open(ATLAS) as atlas:
            x = 224
            trunk_red, bark_height, bark_blue, _ = atlas.getpixel((x, 226))
            trunk_top = bark_height + trunk_red - min(255, 3 * bark_height)
            trunk_center = 226 + bark_height - (255 - bark_blue) / 2
            # The visible bark stays at its original height and footprint.
            self.assertEqual((bark_height, trunk_center), (12, 236.5))
            sections = []
            for y in range(163, 223):
                red, z, blue, alpha = atlas.getpixel((x, y))
                if alpha and red == min(255, 3 * z) - 1:
                    depth = 255 - blue
                    sections.append((z, depth, y + z - depth / 2))
            peak = max(z for z, _, _ in sections)
            self.assertLess(max(depth for z, depth, _ in sections if z == peak), 7)
            widest = max(depth for _, depth, _ in sections)
            self.assertGreaterEqual(widest, 34)
            self.assertTrue(all(abs(center - trunk_center) <= 1 for _, depth, center in sections if depth == widest))
            self.assertTrue(any(z == trunk_top and depth >= 30 for z, depth, _ in sections))

    def test_column_and_surface_geometry_follows_the_artwork(self):
        with Image.open(ATLAS) as atlas:
            def profile(x, y):
                _, height, blue, _ = atlas.getpixel((x, y))
                return height, 255 - blue

            # The canopy and boulder are higher and deeper in their centers than at their rims.
            for center, rim in [((222, 195), (194, 195)), ((300, 33), (317, 33))]:
                middle_height, middle_depth = profile(*center)
                edge_height, edge_depth = profile(*rim)
                self.assertGreater(middle_height, edge_height)
                self.assertGreater(middle_depth, edge_depth)
            self.assertGreater(profile(222, 195)[1], profile(224, 229)[1])
            # On the slate house, the chimney cap is raised above its roof,
            # the dormer projects from the shingles, and the porch stands
            # forward of the adjacent wall at the same screen row.
            self.assertGreater(profile(153, 38)[0], profile(143, 38)[0] + 3)
            self.assertLess(profile(153, 38)[1], profile(143, 38)[1])
            self.assertGreater(profile(80, 59)[0], profile(104, 59)[0] + 8)
            self.assertGreater(profile(111, 115)[0], profile(84, 115)[0])
            self.assertGreater(profile(110, 143)[0], profile(80, 143)[0])
            self.assertEqual(profile(70, 143), profile(80, 143))
            # The red house ridge runs front-to-back and the eaves sit below it.
            self.assertEqual(profile(102, 180), profile(102, 188))
            self.assertGreater(profile(102, 185)[0], profile(70, 213)[0])
            # Wood ends at the feet; grass and the space between the legs stay at ground level.
            self.assertGreater(profile(10, 2933)[0], 0)
            self.assertEqual(profile(25, 2933)[0], 0)
            self.assertEqual(profile(10, 2937)[0], 0)
            self.assertGreater(profile(27, 2045)[0], 0)  # blue window glass belongs to the shop


if __name__ == '__main__':
    unittest.main()
