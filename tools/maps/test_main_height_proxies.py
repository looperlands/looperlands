import json
import unittest

from PIL import Image

from generate_main_height_proxies import ARTWORK, ATLAS, BAKED_SHADOWS, ROOT, body_image, products, profile_atlas, read_profile, make_shadow_mask


class HeightProxyAtlasTest(unittest.TestCase):
    def test_outdoor_landmarks_use_registered_artwork_and_walkable_spawns(self):
        catalog = json.loads((ATLAS.parent / 'catalog.json').read_text())
        for map_id, spawn in [('m88n', (92, 140)), ('cobsfarm', (24, 484)), ('cobsfarmcity', (77, 410)),
                              ('taikotown', (81, 156))]:
            with self.subTest(map_id=map_id), Image.open(ROOT / f'client/img/1/tilesheet_{map_id}.png') as artwork:
                world = json.loads((ROOT / f'client/maps/world_client_{map_id}.json').read_text())
                px, py = spawn
                self.assertNotIn(py * world['width'] + px, world['collisions'])
                profile = read_profile(ROOT, map_id)
                self.assertEqual(catalog[map_id].get('outdoors'), profile.get('outdoors'))
                names = {catalog[map_id][k] for k in ('height', 'paint') if k in catalog[map_id]}
                gids = set()
                for name, generated in products(artwork.convert('RGBA'), profile, map_id):
                    names.remove(name)
                    with Image.open(ATLAS.with_name(name)) as asset:
                        self.assertEqual(asset.size, generated.size)
                        self.assertEqual(asset.convert('RGBA').tobytes(), generated.tobytes())
                        if name == catalog[map_id]['height']:
                            for row in profile['bodies']:
                                left, top, right, bottom = row['bounds']
                                self.assertIsNotNone(asset.crop((left, top, right, bottom)).getbbox(), row['name'])
                                for ty in range(top // 16, (bottom + 15) // 16):
                                    for tx in range(left // 16, (right + 15) // 16):
                                        gids.add(1 + ty * (artwork.width // 16) + tx)
                self.assertFalse(names)
                near_spawn = set()
                for y in range(max(0, py - 8), min(world['height'], py + 9)):
                    for x in range(max(0, px - 8), min(world['width'], px + 9)):
                        cell = world['data'][y * world['width'] + x]
                        near_spawn.update(cell if isinstance(cell, list) else [cell])
                self.assertTrue(gids & near_spawn, 'No profiled artwork within eight tiles of the landmark')

    def test_draft_geometry_must_fit_the_encoding_and_grounded_support(self):
        source = Image.new('RGBA', (16, 32), 'white')
        post = {'name': 'Post', 'bounds': [0, 0, 16, 32], 'front': 12, 'slope': .5, 'depth': 4}
        for invalid in [{'front': 161}, {'depth': -1}, {'slope': '1'}, {'slope': 1.1}, {'trunk': [0, 17]},
                        {'raisedAbove': 33}, {'shape': 'round-crown', 'crownBottom': 24}]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                body_image(source, {**post, **invalid})

    def test_duckville_trees_match_the_placed_roots_and_real_cavern_fire(self):
        with Image.open(ROOT / 'client/img/1/tilesheet_duckville.png') as artwork, \
                Image.open(ATLAS.with_name('duckville.png')) as atlas:
            self.assertEqual(atlas.size, (artwork.width, 7 * 16))
            self.assertEqual(atlas.tobytes(), profile_atlas(artwork, read_profile(ROOT, 'duckville')).tobytes())
            with (ROOT / 'client/maps/world_client_duckville.json').open() as file:
                world = json.load(file)
            self.assertEqual(world['tilesetColumns'] * 16, atlas.width)
            self.assertTrue(any(light['x'] == 113.5 * 16 and light['y'] == 427.5 * 16 and
                                light['animation'] == 'fire' for light in world['lights']))
            # Sample each silhouette on its map grid. The outdoor tree uses the
            # alternate roots from atlas row 6; the cavern tree uses row 5.
            samples = [
                ((529, 54), (113, 425), True), ((543, 67), (113, 426), False),
                ((543, 80), (113, 427), False), ((621, 57), (69, 434), True),
                ((592, 72), (68, 435), False), ((592, 96), (68, 436), False),
            ]
            for (ax, ay), (mx, my), raised in samples:
                with self.subTest(source=(ax, ay), tile=(mx, my)):
                    gid = ay // 16 * world['tilesetColumns'] + ax // 16 + 1
                    self.assertIn(gid, world['data'][my * world['width'] + mx])
                    self.assertEqual(artwork.getpixel((ax, ay))[3], 255)
                    red, z, blue, alpha = atlas.getpixel((ax, ay))
                    self.assertEqual(alpha, 255)
                    self.assertEqual(red, 3 * z - int(raised))
                    self.assertGreater(z, 0)
                    self.assertGreater(255 - blue, 0)
            # A gap between branches is transparent. Either set of painted
            # toes joins the common trunk with one native pixel of height loss.
            self.assertEqual(atlas.getpixel((581, 61))[3], 0)
            for x in (543, 592):
                above = atlas.getpixel((x, 79))[1]
                for root in (80, 96):
                    self.assertEqual(atlas.getpixel((x, root))[1], above - 1)
            for mx, my in [(112, 428), (67, 437)]:
                self.assertNotIn(my * world['width'] + mx, world['collisions'])

    def test_checked_in_atlas_matches_profiles_and_outdoor_artwork(self):
        with Image.open(ARTWORK) as source, Image.open(ATLAS) as atlas:
            self.assertEqual(atlas.size, source.size)
            self.assertEqual(atlas.tobytes(), profile_atlas(source, read_profile(ROOT, 'main')).tobytes())
            with (ROOT / 'client/maps/world_client_main.json').open() as file:
                main_map = json.load(file)
            # Sample the source pixel, its actual map placement, and extrusion depth.
            samples = [
                ('Town house', 115, 50, 15, 215, 18),
                ('Town oak', 220, 185, 30, 194, 22),
                ('Town boulder', 282, 18, 48, 213, 7),
                ('Town pipe', 288, 669, 84, 198, 8),
                ('Desert column', 28, 1280, 64, 94, 7),
                ('Desert posts', 6, 576, 9, 92, 7),
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
            self.assertEqual(mask.tobytes(), make_shadow_mask(source, read_profile(ROOT, 'main')['paint']).tobytes())
            for point in [(209, 228), (164, 90), (314, 49), (44, 1293), (59, 1504)]:
                self.assertEqual(mask.getpixel(point)[3], 255, point)
            # Keep grass, glass, noticeboard wood, boulder underside and unrelated tile shadows.
            for point in [(260, 193), (27, 2045), (10, 2933), (282, 40), (34, 50)]:
                self.assertEqual(mask.getpixel(point)[3], 0, point)
            self.assertIsNone(mask.crop((256, 192, 320, 224)).getbbox())

    def test_desert_pillars_clear_every_placed_shadow_tile_and_keep_the_sand(self):
        with (ROOT / 'client/maps/world_client_main.json').open() as file:
            desert = json.load(file)
        columns = desert['tilesetColumns']

        def tile(sheet, gid):
            x = (gid - 1) % columns * 16
            y = (gid - 1) // columns * 16
            return sheet.crop((x, y, x + 16, y + 16))

        with Image.open(ARTWORK) as source, Image.open(BAKED_SHADOWS) as mask, Image.open(ATLAS) as atlas:
            for map_x, cap_gid in [(46, 704), (51, 703)]:
                self.assertIn(cap_gid, desert['data'][98 * desert['width'] + map_x])
                # The artist placed the shadow tip two cells to the right, using
                # different atlas rows than the three shadow tiles beside the feet.
                for dx, dy, gid in [(2, 1, 685), (2, 2, 705), (1, 1, 725), (1, 2, 745), (1, 3, 765)]:
                    base_gid, shadow_gid = desert['data'][(98 + dy) * desert['width'] + map_x + dx]
                    self.assertEqual(shadow_gid, gid)
                    sand = tile(source, base_gid)
                    self.assertIsNone(tile(mask, base_gid).getbbox())
                    overlay = tile(source, shadow_gid)
                    self.assertNotEqual(Image.alpha_composite(sand, overlay).tobytes(), sand.tobytes())
                    overlay.paste((0, 0, 0, 0), mask=tile(mask, shadow_gid).getchannel('A'))
                    self.assertEqual(Image.alpha_composite(sand, overlay).tobytes(), sand.tobytes())
                # The flat cap meets a rounded shaft, deeper centrally than at the rim.
                x = (cap_gid - 1) % columns * 16
                self.assertEqual(atlas.getpixel((x + 7, 570))[1], 42)
                self.assertEqual(atlas.getpixel((x + 7, 579))[1], 42)
                edge = atlas.getpixel((x, 599))
                middle = atlas.getpixel((x + 7, 599))
                self.assertGreater(middle[1], edge[1])
                self.assertGreater(255 - middle[2], 255 - edge[2])
                self.assertEqual(mask.getpixel((x + 7, 622))[3], 0)

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
