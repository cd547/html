// ═══════════════════════════════════════════════════════════════
// PIXEL EDITOR — Custom sprite designer + image upload
// ═══════════════════════════════════════════════════════════════

const PW = 16, PH = 24;                     // player pixel dimensions
const CELL = 16;                            // editor cell size in px

let editorColor   = '#ffffff';
let editorGrid    = [];                     // flat array: row*PW+col → color|null
let editorMouseDown = false;
let editorErase   = false;

// ── Preset sprites ────────────────────────────────────────
const PRESETS = {
    'Cursor':   buildCursorSprite(),   // default blinking terminal block
    'Robot':    buildPreset([
        "......####......",
        "....########....",
        "...###....###...",
        "...##......##...",
        "...#.#....#.#...",
        "..##..####..##..",
        "..##..####..##..",
        "..#..........#..",
        ".##..######..##.",
        ".#..##....##..#.",
        ".#..#......#..#.",
        ".#..#..##..#..#.",
        ".#..#..##..#..#.",
        ".#..##....##..#.",
        ".##..######..##.",
        "..#..........#..",
        "..##..####..##..",
        "..#...####...#..",
        "..#..........#..",
        "..##..####..##..",
        "...##......##...",
        "...##..##..##...",
        "....##.##.##....",
        "......##.##......"
    ]),
    'Cat': buildPreset([
        "......####......",
        "....########....",
        "...###....###...",
        "...##......##...",
        "...#..#..#...#..",
        "..##..####..##..",
        "..##..####..##..",
        "..#..........#..",
        ".##.#......#.##.",
        ".#...#....#...#.",
        ".#...........#..",
        ".#.....##.....#.",
        ".#....#..#....#.",
        ".#....#..#....#.",
        ".##...#..#...##.",
        "..#..........#..",
        "..##...##...##..",
        "..#....##....#..",
        "..#..........#..",
        "..##..####..##..",
        "...##......##...",
        "...##..##..##...",
        "....##.##.##....",
        "......##.##......"
    ]),
    'Runner': buildPreset([
        "................",
        ".......##.......",
        "......####......",
        "......####......",
        ".......##.......",
        ".......##.......",
        "......####......",
        ".....######.....",
        "....########....",
        "....##....##....",
        "....##....##....",
        "....#......#....",
        "....#......#....",
        "...##......##...",
        "...##..##..##...",
        "..#...####...#..",
        "..#..........#..",
        "..#...####...#..",
        "..#..........#..",
        "..#..........#..",
        "..#..........#..",
        "...##......##...",
        "....##....##....",
        ".....##..##....."
    ]),
    'Skull': buildPreset([
        "......####......",
        "....########....",
        "...###....###...",
        "...##......##...",
        "...#..#..#..#...",
        "..#..........#..",
        ".##..######..##.",
        ".#..##....##..#.",
        ".#..#......#..#.",
        ".#..#..##..#..#.",
        ".#..#.####.#..#.",
        ".#..........#...",
        ".##.#......#.##.",
        "..#.#......#.#..",
        "..#.#......#.#..",
        "..#.#......#.#..",
        "..#...####...#..",
        "..#..........#..",
        "..#..........#..",
        "..##........##..",
        "...##......##...",
        "...##..##..##...",
        "....##.##.##....",
        "......##.##......"
    ])
};

function buildPreset(rows) {
    const data = new Array(PW * PH).fill(null);
    for (let y = 0; y < PH && y < rows.length; y++) {
        for (let x = 0; x < PW && x < rows[y].length; x++) {
            if (rows[y][x] === '#') data[y * PW + x] = '#ffffff';
        }
    }
    return data;
}

// ── Initialize editor grid from current sprite ────────────
function initEditorGrid() {
    if (state.player.spriteData) {
        editorGrid = [...state.player.spriteData];
    } else {
        // Fallback: cursor pattern
        editorGrid = [...buildCursorSprite()];
    }
}

// ── Draw the editor grid onto its canvas ──────────────────
function drawEditorCanvas() {
    const ec = document.getElementById('editor-canvas');
    if (!ec) return;
    const ectx = ec.getContext('2d');
    const W = PW * CELL, H = PH * CELL;

    // Solid dark background
    ectx.fillStyle = '#0c0c0c';
    ectx.fillRect(0, 0, PW * CELL, PH * CELL);

    // Draw filled pixels
    for (let i = 0; i < editorGrid.length; i++) {
        if (editorGrid[i]) {
            const x = (i % PW) * CELL, y = Math.floor(i / PW) * CELL;
            ectx.fillStyle = editorGrid[i];
            ectx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        }
    }

    // Grid lines
    ectx.strokeStyle = 'rgba(255,255,255,0.08)';
    ectx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += CELL) {
        ectx.beginPath(); ectx.moveTo(x, 0); ectx.lineTo(x, H); ectx.stroke();
    }
    for (let y = 0; y <= H; y += CELL) {
        ectx.beginPath(); ectx.moveTo(0, y); ectx.lineTo(W, y); ectx.stroke();
    }
}

// ── Draw the live preview ─────────────────────────────────
function drawPreview() {
    const pc = document.getElementById('preview-canvas');
    if (!pc) return;
    const pctx = pc.getContext('2d');
    const SCALE = 4;
    pctx.clearRect(0, 0, PW * SCALE, PH * SCALE);

    // Solid dark background
    pctx.fillStyle = '#0c0c0c';
    pctx.fillRect(0, 0, PW * SCALE, PH * SCALE);

    // Pixels
    for (let i = 0; i < editorGrid.length; i++) {
        if (editorGrid[i]) {
            const x = (i % PW) * SCALE, y = Math.floor(i / PW) * SCALE;
            pctx.fillStyle = editorGrid[i];
            pctx.fillRect(x, y, SCALE, SCALE);
        }
    }
}

// ── Handle mouse on editor canvas ─────────────────────────
function editorMouseEvent(e) {
    const ec = document.getElementById('editor-canvas');
    if (!ec) return;
    const rect = ec.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = Math.floor(mx / CELL);
    const cy = Math.floor(my / CELL);
    if (cx < 0 || cx >= PW || cy < 0 || cy >= PH) return;

    const idx = cy * PW + cx;

    if (e.type === 'mousedown') {
        editorMouseDown = true;
        if (editorColor === 'eraser') {
            editorGrid[idx] = null;
            editorErase = true;
        } else {
            editorErase = (editorGrid[idx] === editorColor);
            editorGrid[idx] = editorErase ? null : editorColor;
        }
        drawEditorCanvas();
        drawPreview();
    } else if (e.type === 'mousemove' && editorMouseDown) {
        editorGrid[idx] = (editorColor === 'eraser' || editorErase) ? null : editorColor;
        drawEditorCanvas();
        drawPreview();
    }
}

// ── Set up editor canvas events ───────────────────────────
function setupEditorEvents() {
    const ec = document.getElementById('editor-canvas');
    if (!ec) return;
    ec.addEventListener('mousedown', editorMouseEvent);
    ec.addEventListener('mousemove', editorMouseEvent);
    ec.addEventListener('mouseup', () => { editorMouseDown = false; });
    ec.addEventListener('mouseleave', () => { editorMouseDown = false; });
}

// ── Color selection ───────────────────────────────────────
function setEditorColor(color) {
    editorColor = color;
    document.querySelectorAll('.color-swatch').forEach(el => {
        el.classList.toggle('active', el.dataset.color === color);
    });
    // Eraser swatch uses data-color="eraser"
}

// ── Open / close the editor modal ─────────────────────────
function openPixelEditor() {
    initEditorGrid();
    const modal = document.getElementById('pixel-editor-modal');
    if (modal) {
        modal.style.display = 'flex';
        drawEditorCanvas();
        drawPreview();
        setupEditorEvents();
    }
}

function closePixelEditor() {
    const modal = document.getElementById('pixel-editor-modal');
    if (modal) modal.style.display = 'none';
    editorMouseDown = false;
}

// ── Save sprite to player state ───────────────────────────
function saveSprite() {
    // If grid matches cursor pattern, treat as default (blinking cursor)
    const cursorData = buildCursorSprite();
    const isCursor = editorGrid.every((p, i) => p === cursorData[i]);
    if (isCursor) {
        state.player.spriteData = cursorData;
        state.player.spriteIsCustom = false;   // blinking effect on
    } else {
        state.player.spriteData = [...editorGrid];
        state.player.spriteIsCustom = true;    // solid, no blink
    }
    closePixelEditor();
}

// ── Clear entire grid ─────────────────────────────────────
function clearEditorGrid() {
    editorGrid = new Array(PW * PH).fill(null);
    drawEditorCanvas();
    drawPreview();
}

// ── Fill entire grid with current color ───────────────────
function fillEditorGrid() {
    editorGrid = editorGrid.map(() => editorColor);
    drawEditorCanvas();
    drawPreview();
}

// ── Load a preset ─────────────────────────────────────────
function loadPreset(name) {
    const data = PRESETS[name];
    editorGrid = data ? [...data] : new Array(PW * PH).fill(null);
    drawEditorCanvas();
    drawPreview();
}

// ── Handle image upload ───────────────────────────────────
function handleImageUpload(file) {
    if (!file) return;
    // Reset input so re-selecting the same file triggers change again
    const fileInput = document.querySelector('#pixel-editor-modal input[type=file]');
    if (fileInput) fileInput.value = '';
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Draw image scaled to 16×24 on a temp canvas
            const tmp = document.createElement('canvas');
            tmp.width = PW;
            tmp.height = PH;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(img, 0, 0, PW, PH);

            // Extract pixel data
            const imageData = tctx.getImageData(0, 0, PW, PH);
            editorGrid = new Array(PW * PH).fill(null);
            for (let i = 0; i < PW * PH; i++) {
                const r = imageData.data[i * 4];
                const g = imageData.data[i * 4 + 1];
                const b = imageData.data[i * 4 + 2];
                const a = imageData.data[i * 4 + 3];
                if (a > 128) {
                    const hex = '#' + [r, g, b].map(v =>
                        v.toString(16).padStart(2, '0')
                    ).join('');
                    editorGrid[i] = hex;
                }
            }
            drawEditorCanvas();
            drawPreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ── Keyboard shortcut ─────────────────────────────────────
window.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey &&
        document.activeElement === document.body) {
        const modal = document.getElementById('pixel-editor-modal');
        if (modal && modal.style.display === 'flex') {
            closePixelEditor();
        } else {
            openPixelEditor();
        }
    }
    if (e.key === 'Escape') {
        const modal = document.getElementById('pixel-editor-modal');
        if (modal && modal.style.display === 'flex') {
            closePixelEditor();
        }
    }
});
