// ═══════════════════════════════════════════════════════════════
// CONFIG — Compile Tower constants, state, and background init
// ═══════════════════════════════════════════════════════════════

// ── DOM handles ───────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const linesCountEl = document.getElementById('lines-count');
const floorDisplayEl = document.getElementById('floor-display');

// ── Layout constants ──────────────────────────────────────
const FLOOR_HEIGHT      = 140;
const FLOOR_PLAY_TOP    = 30;
const FLOOR_GROUND_LOCAL = 110;
const GROUND_BLOCK_H    = 30;
const CANVAS_W = 800;
const CANVAS_H = 600;

// ── Floor height levels ───────────────────────────────────
// Gameplay modules can request taller floors via floorHeightLevel:
//   1 = standard (default, 140px)
//   2 = double height (280px)
//   3 = triple height (420px)
//   5 = penta height (700px)
const FLOOR_HEIGHT_LEVELS = {
    1: FLOOR_HEIGHT,
    2: FLOOR_HEIGHT * 2,
    3: FLOOR_HEIGHT * 3,
    5: FLOOR_HEIGHT * 5
};

// ── Safe zones ────────────────────────────────────────────
const SAFE_ZONES = [
    { x: 60,  w: 50 },
    { x: 640, w: 30 },
    { x: 720, w: 50 },
    { x: 210, w: 40 }
];

// ── Default cursor sprite — blinking terminal block █ ─────
//     10px-wide block cursor, centered in 16×24 bounding box.
//     Distinctly NOT a solid rectangle — narrower, with rounded top.
function buildCursorSprite() {
    const PW = 16, PH = 24;
    const rows = [
        "................",
        "................",
        "................",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...##########...",
        "................",
        "................"
    ];
    const data = new Array(PW * PH).fill(null);
    for (let y = 0; y < PH; y++) {
        for (let x = 0; x < PW; x++) {
            if (rows[y][x] === '#') data[y * PW + x] = '#ffffff';
        }
    }
    return data;
}

// ── Application state ─────────────────────────────────────
const state = {
    linesExecuted: 0,
    totalFloorsCleared: 0,
    gameState: 'PLAYING',
    currentFloor: 0,
    scrollY: 0,
    targetScrollY: 0,
    gravity: 0.5,
    player: {
        x: 60, y: FLOOR_GROUND_LOCAL - 24, w: 16, h: 24,
        vx: 0, vy: 0, speed: 4.5, jump: 10.5,
        isGrounded: false, trail: [], facing: 1,
        spriteData: buildCursorSprite(),  // default: blinking cursor
        spriteColor: '#ffffff',
        spriteIsCustom: false           // true when user saves custom sprite
    },
    floors: [],
    particles: [],
    // Memory Leak global state
    ramUsage: 128,            // current MB
    ramMax: 1024,             // overflow threshold
    ramLeakRate: 0.35,        // MB per frame at 60fps (~21 MB/s)
    showRamBar: false,        // visible only on memoryleak floors
    crashReason: 'bug',       // 'bug' | 'overflow' — for crash screen text
    matrixLines: [],
    transitionTimer: 0,
    transitionPhase: 0,
    flashAlpha: 0
};

// ── Matrix digital rain ───────────────────────────────────
for (let i = 0; i < 20; i++) {
    state.matrixLines.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        speed: 0.5 + Math.random() * 1.5,
        text: Math.random() > 0.5 ? "010110" : "0xFFFF"
    });
}
