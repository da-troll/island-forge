/**
 * templates.js — Island Forge addition (2026-05-24, Wilson).
 *
 * Five starter templates. Each is a compact spec — a list of terrain
 * patches and a list of objects — that the engine's `applyTemplate`
 * helper plays through the standard `placeAndAnimate` pipeline so the
 * load animates in the same way as the seeded village.
 *
 * Templates target the 28×28 grid. Stay roughly centered so the camera's
 * default center makes the build feel composed.
 */

function fill(x0, y0, w, h, id, into) {
    for (let gy = y0; gy < y0 + h; gy++) {
        if (!into[gy]) into[gy] = [];
        for (let gx = x0; gx < x0 + w; gx++) {
            into[gy][gx] = id;
        }
    }
}

function blankCanvas(terrainId = 'grass') {
    const rows = [];
    for (let gy = 0; gy < 28; gy++) {
        rows[gy] = [];
        for (let gx = 0; gx < 28; gx++) {
            rows[gy][gx] = terrainId;
        }
    }
    return rows;
}

function buildBlank() {
    return {
        id: 'blank',
        name: 'Blank Canvas',
        description: 'Open grass — start from scratch',
        terrain: blankCanvas('grass'),
        objects: [],
    };
}

function buildHarbor() {
    const terrain = blankCanvas('grass');
    // Water along the bottom 6 rows.
    fill(0, 22, 28, 6, 'water', terrain);
    fill(0, 21, 28, 1, 'sand', terrain);
    // Stone wharf paths.
    fill(8, 18, 12, 3, 'path', terrain);
    fill(13, 14, 2, 4, 'path', terrain);
    return {
        id: 'harbor',
        name: 'Harbor Town',
        description: 'Stone wharf, fishing pier, watchtower-ready',
        terrain,
        objects: [
            { id: 'main_chapel', gx: 13, gy: 10 },
            { id: 'house', gx: 8, gy: 16 },
            { id: 'two_story', gx: 17, gy: 16 },
            { id: 'lantern_post', gx: 11, gy: 19 },
            { id: 'lantern_post', gx: 16, gy: 19 },
            { id: 'small_bridge', gx: 13, gy: 22 },
            { id: 'cypress', gx: 5, gy: 14 },
            { id: 'cypress', gx: 22, gy: 14 },
            { id: 'olive', gx: 3, gy: 18 },
            { id: 'olive', gx: 25, gy: 18 },
        ],
    };
}

function buildHilltop() {
    const terrain = blankCanvas('grass');
    fill(0, 24, 28, 4, 'sand', terrain);
    // Path winding up the hill.
    for (let gy = 22; gy >= 11; gy--) {
        terrain[gy][14 + Math.round(Math.sin(gy * 0.5) * 2)] = 'path';
    }
    // Build a 7×7 hill at the top.
    const heights = new Array(28 * 28).fill(0);
    for (let gy = 7; gy < 14; gy++)
    for (let gx = 11; gx < 18; gx++) {
        const dx = gx - 14, dy = gy - 10;
        const r = Math.sqrt(dx * dx + dy * dy);
        const h = Math.max(0, Math.round(3 - r * 0.9));
        if (h > 0) heights[gy * 28 + gx] = h;
    }
    return {
        id: 'hilltop',
        name: 'Hilltop Chapel',
        description: 'Whitewashed chapel crowning a raised promontory',
        terrain,
        heights,
        objects: [
            { id: 'main_chapel', gx: 13, gy: 9 },
            { id: 'cypress', gx: 11, gy: 11 },
            { id: 'cypress', gx: 16, gy: 11 },
            { id: 'olive', gx: 9, gy: 16 },
            { id: 'olive', gx: 18, gy: 16 },
            { id: 'bougainvillea', gx: 13, gy: 13 },
            { id: 'lantern_post', gx: 13, gy: 17 },
            { id: 'flower_pot', gx: 14, gy: 9 },
        ],
    };
}

function buildFishingVillage() {
    const terrain = blankCanvas('grass');
    fill(0, 0, 28, 12, 'water', terrain);
    fill(0, 12, 28, 1, 'sand', terrain);
    for (let gy = 13; gy < 22; gy++) {
        terrain[gy][13] = 'path';
        terrain[gy][14] = 'path';
    }
    return {
        id: 'fishing-village',
        name: 'Fishing Village',
        description: 'Cluster of cottages along a stone path to the sea',
        terrain,
        objects: [
            { id: 'house', gx: 6, gy: 14 },
            { id: 'house', gx: 18, gy: 14 },
            { id: 'cube_house', gx: 9, gy: 18 },
            { id: 'cube_house', gx: 20, gy: 18 },
            { id: 'two_story', gx: 4, gy: 19 },
            { id: 'two_story', gx: 22, gy: 19 },
            { id: 'small_bridge', gx: 13, gy: 12 },
            { id: 'lantern_post', gx: 13, gy: 17 },
            { id: 'lantern_post', gx: 13, gy: 21 },
            { id: 'cypress', gx: 8, gy: 23 },
            { id: 'olive', gx: 19, gy: 23 },
            { id: 'agave', gx: 25, gy: 25 },
        ],
    };
}

function buildGardenEstate() {
    const terrain = blankCanvas('grass');
    // Formal stone borders.
    for (let gx = 4; gx < 24; gx++) {
        terrain[6][gx] = 'path';
        terrain[22][gx] = 'path';
    }
    for (let gy = 6; gy < 23; gy++) {
        terrain[gy][4] = 'path';
        terrain[gy][23] = 'path';
    }
    // Cross paths.
    for (let gx = 5; gx < 23; gx++) terrain[14][gx] = 'path';
    for (let gy = 7; gy < 22; gy++) terrain[gy][14] = 'path';
    return {
        id: 'garden-estate',
        name: 'Garden Estate',
        description: 'Formal cypress alleys around a central villa',
        terrain,
        objects: [
            { id: 'villa', gx: 12, gy: 12 },
            { id: 'cypress', gx: 6, gy: 8 },
            { id: 'cypress', gx: 21, gy: 8 },
            { id: 'cypress', gx: 6, gy: 20 },
            { id: 'cypress', gx: 21, gy: 20 },
            { id: 'olive', gx: 10, gy: 8 },
            { id: 'olive', gx: 16, gy: 8 },
            { id: 'olive', gx: 10, gy: 20 },
            { id: 'olive', gx: 16, gy: 20 },
            { id: 'flower_pot', gx: 13, gy: 9 },
            { id: 'flower_pot', gx: 15, gy: 9 },
            { id: 'terracotta_pot', gx: 13, gy: 17 },
            { id: 'terracotta_pot', gx: 15, gy: 17 },
            { id: 'bougainvillea', gx: 11, gy: 14 },
            { id: 'bougainvillea', gx: 17, gy: 14 },
            { id: 'lantern_post', gx: 9, gy: 14 },
            { id: 'lantern_post', gx: 19, gy: 14 },
        ],
    };
}

export const TEMPLATES = {
    blank: buildBlank(),
    harbor: buildHarbor(),
    hilltop: buildHilltop(),
    'fishing-village': buildFishingVillage(),
    'garden-estate': buildGardenEstate(),
};
