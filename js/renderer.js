// ═══════════════════════════════════════════════════════════════
// RENDERER — All canvas drawing: background, floors, player, UI
// ═══════════════════════════════════════════════════════════════

const ctx = canvas.getContext('2d');

// ── Draw a single floor at its screen position ────────────
function drawFloor(floor, screenTopY) {
    const isCurrent   = floor.index === state.currentFloor;
    const isCompleted = floor.completed;
    const isAbove     = floor.index > state.currentFloor;

    const fh = floor.height || FLOOR_HEIGHT;

    // Floor background tint .................................
    if (isCompleted) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.03)';
        ctx.fillRect(0, screenTopY, CANVAS_W, fh);
    } else if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(0, screenTopY, CANVAS_W, fh);
    }

    // Floor separator (dotted line above) ...................
    if (floor.index > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(20, screenTopY);
        ctx.lineTo(CANVAS_W - 20, screenTopY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Line number gutter (code editor style) .................
    const lineNum = String(floor.index + 1);
    ctx.fillStyle = isCurrent ? '#00ff66'
                  : (isCompleted ? '#004422' : '#2a2a2a');
    ctx.font = '10px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(lineNum, 25, screenTopY + 27);
    ctx.textAlign = 'left';

    // Floor label ...........................................
    const statusIcon  = isCompleted ? '[X]' : (isCurrent ? '[>]' : '[ ]');
    const labelColor  = isCompleted ? '#006633' : (isCurrent ? '#ffffff' : '#444444');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px "Courier New"';
    const gpName = (floor.gameplay && floor.gameplay.name) || floor.type || '???';
    ctx.fillText(`${statusIcon} // L${floor.index}: ${gpName}`, 35, screenTopY + 14);

    // Code text .............................................
    let displayText = floor.codeText || '';
    // Replace placeholders for any gameplay type that uses them
    const counter = floor.elements.find(e => e.subType === 'counter');
    if (counter) {
        displayText = displayText.replace('[COUNT]', counter.current).replace('[TARGET]', counter.target);
    }
    const codeAlpha = isAbove ? 0.35 : (isCompleted ? 0.5 : 1.0);
    ctx.fillStyle = isCompleted ? '#666666' : '#e0e0e0';
    ctx.globalAlpha = codeAlpha;
    ctx.font = '12px "Courier New"';
    ctx.fillText(`  ${displayText}`, 35, screenTopY + 28);
    ctx.globalAlpha = 1.0;

    // Ground line ...........................................
    const groundY = floor.groundY || FLOOR_GROUND_LOCAL;
    const groundScreenY = screenTopY + groundY;
    ctx.strokeStyle = isCompleted ? '#1a3a1a' : (isCurrent ? '#ffffff' : '#333333');
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, groundScreenY);
    ctx.lineTo(CANVAS_W, groundScreenY);
    ctx.stroke();

    // Ground block ..........................................
    ctx.fillStyle = isCompleted ? '#0a1a0a' : '#1a1a1a';
    ctx.fillRect(0, groundScreenY, CANVAS_W, GROUND_BLOCK_H);

    // Only draw interactive elements for current & completed floors
    if (isAbove && !isCompleted) return;

    // Elements ..............................................
    const gp = floor.gameplay;
    const mods = floor.modifiers || [];
    floor.elements.forEach(el => {
        const esy = el.y + screenTopY;

        // Try modifier drawElement first, then gameplay drawElement
        let drawn = false;
        for (const mod of mods) {
            if (mod.drawElement && mod.drawElement(ctx, el, esy, floor)) { drawn = true; break; }
        }
        if (!drawn && gp && gp.drawElement && gp.drawElement(ctx, el, esy, floor)) drawn = true;
        if (drawn) return;

        if (el.type === 'decoration') return;

        if (el.type === 'platform') {
            ctx.fillStyle = isCompleted ? '#555555' : '#ffffff';
            ctx.fillRect(el.x, esy, el.w, el.h);
            ctx.fillStyle = '#0c0c0c';
            ctx.fillRect(el.x + 2, esy + 2, el.w - 4, el.h - 4);
            // Draw movement indicator for moving platforms
            if (el.moveVx && !isCompleted) {
                ctx.fillStyle = 'rgba(0,255,102,0.2)';
                ctx.fillRect(el.moveMin, esy + el.h - 2, el.moveMax - el.moveMin, 2);
            }
        }
        else if (el.type === 'bug') {
            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.moveTo(el.x, esy + el.h);
            ctx.lineTo(el.x + el.w / 2, esy);
            ctx.lineTo(el.x + el.w, esy + el.h);
            ctx.fill();
            // Patrol range indicator
            if (el.patrolVx && !isCompleted) {
                ctx.fillStyle = 'rgba(255,51,51,0.15)';
                ctx.fillRect(el.patrolMin, esy + el.h, el.patrolMax - el.patrolMin, 2);
            }
        }
        else if (el.type === 'variable') {
            if (el.subType === 'bool' && el.active) {
                ctx.fillStyle = isCompleted ? '#006633' : '#00ff66';
                ctx.fillRect(el.x, esy, el.w, el.h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText("T", el.x + 4, esy + 12);
            }
            else if (el.subType === 'break' && el.active) {
                ctx.fillStyle = isCompleted ? '#006633' : '#00ff66';
                ctx.save();
                ctx.translate(el.x + el.w / 2, esy + el.h / 2);
                ctx.rotate(Date.now() * 0.005);
                ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h);
                ctx.restore();
            }
            else if (el.subType === 'counter') {
                ctx.fillStyle = floor.gateUnlocked ? '#00ff66'
                              : (isCompleted ? '#555555' : '#ffffff');
                ctx.fillRect(el.x, esy, el.w, el.h);
                ctx.font = '10px "Courier New"';
                ctx.fillStyle = '#666666';
                ctx.fillText(`i++ (${el.current}/${el.target})`, el.x - 15, esy - 8);
            }
        }
    });

    // Gate ...................................................
    if (gp && gp.drawGate) {
        gp.drawGate(ctx, floor, screenTopY);
    } else {
        const gateScreenY = screenTopY + FLOOR_PLAY_TOP;
        const gateH = groundY - FLOOR_PLAY_TOP;
        if (!floor.gateUnlocked) {
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(floor.gateX, gateScreenY, 8, gateH);
            ctx.font = '10px "Courier New"';
            ctx.fillStyle = '#ff3333';
            ctx.fillText('COMPILER_ERR', floor.gateX - 42, gateScreenY - 4);
        } else {
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(floor.gateX, gateScreenY, 8, gateH);
            ctx.setLineDash([]);
        }
    }

    // return; portal ........................................
    const retX = floor.returnX != null ? floor.returnX : 730;
    const retY = floor.returnY != null ? screenTopY + floor.returnY : screenTopY + groundY - 50;
    if (floor.gateUnlocked || floor.completed) {
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(retX, retY, 40, 50);
        ctx.fillStyle = '#00ff66';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText("return;", retX - 5, retY - 6);
    }
}

// ── Draw player on current floor ──────────────────────────
function drawPlayer() {
    const curFloor = state.floors[state.currentFloor];
    if (!curFloor) return;

    const screenTopY = getFloorScreenTop(curFloor.index);
    const p = state.player;
    const psx = p.x;
    const psy = p.y + screenTopY;

    // Trail (simple rect blur for performance)
    p.trail.forEach((t, i) => {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * (i + 1)})`;
        ctx.fillRect(t.x, t.y + screenTopY, p.w, p.h);
    });

    // Self-heal: rebuild cursor sprite if data went missing
    if (!p.spriteData || !p.spriteData.length) {
        p.spriteData = buildCursorSprite();
        p.spriteIsCustom = false;
    }

    // ── Pixel sprite rendering ──────────────────────────
    const PW = 16, PH = 24;
    const data = p.spriteData;
    const flip = p.facing === -1;

    // Blinking cursor: visibility toggle ~500ms on/off (classic terminal)
    if (!p.spriteIsCustom) {
        const visible = Math.floor(Date.now() / 530) % 2 === 0;
        if (!visible) return;
    }

    for (let i = 0; i < data.length; i++) {
        const color = data[i];
        if (!color) continue;
        const col = i % PW;
        const row = Math.floor(i / PW);
        const sx = flip ? (PW - 1 - col) : col;
        ctx.fillStyle = color;
        ctx.fillRect(psx + sx, psy + row, 1, 1);
    }

    ctx.globalAlpha = 1.0;
}

// ── Draw and update particles (screen-space) ──────────────
function drawParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

// ── Draw crash overlay ────────────────────────────────────
function drawCrashOverlay() {
    const isOverflow = state.crashReason === 'overflow';
    ctx.fillStyle = 'rgba(12, 12, 12, 0.92)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = isOverflow ? '#ff6600' : '#ff3333';
    ctx.font = '24px "Courier New"';
    ctx.fillText(isOverflow
        ? '[!] STACK OVERFLOW: HEAP EXHAUSTED'
        : '[!] RUNTIME_ERROR: SEGMENTATION FAULT', 130, 220);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New"';
    ctx.fillText(isOverflow
        ? `Memory leak at ${state.ramMax}MB. GC failed. Floor ${state.currentFloor}.`
        : `Pointer out of bounds. App crashed on Floor ${state.currentFloor}.`, 180, 270);
    ctx.fillText(`Total lines executed: ${state.linesExecuted}.`, 240, 300);
    ctx.fillStyle = '#666666';
    ctx.fillText(`Press [ R ] to re-compile current floor.`, 240, 340);
}

// ── Modifier UI — let each modifier draw its UI element ──
function drawModifierUI() {
    const floor = state.floors[state.currentFloor];
    if (!floor) return;
    (floor.modifiers || []).forEach(mod => {
        if (mod.drawUI) mod.drawUI(ctx);
    });
}

// ── Scrollbar — right edge of canvas ─────────────────────
// ── Scrollbar geometry ──────────────────────────────────
function getScrollbarGeo() {
    const totalFloors = state.floors.length;
    // Compute total world height from actual floor heights
    let totalH = 0;
    for (let i = 0; i < totalFloors; i++) {
        totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    const trackX = CANVAS_W - 7, trackY = 2, trackW = 5, trackH = CANVAS_H - 4;
    const maxScroll = Math.max(1, totalH - CANVAS_H);
    const visibleRatio = CANVAS_H / (totalH + CANVAS_H);
    const thumbH = Math.max(20, visibleRatio * trackH);
    const scrollRatio = state.scrollY / maxScroll;
    const thumbY = trackY + scrollRatio * (trackH - thumbH);
    return { totalFloors, trackX, trackY, trackW, trackH, maxScroll, thumbH, thumbY, visible: totalFloors > 3 || totalH > CANVAS_H };
}

// ── Scrollbar mouse → scroll conversion ──────────────────
function scrollbarMouseToY(my) {
    const g = getScrollbarGeo();
    if (!g.visible) return;
    const ratio = Math.max(0, Math.min(1, (my - g.trackY) / g.trackH));
    // Set both directly for instant response — no lerp lag
    state.scrollY = state.targetScrollY = ratio * g.maxScroll;
}

// ── Scrollbar interaction state ──────────────────────────
let sbDragging = false;

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const g = getScrollbarGeo();
    if (!g.visible) return;
    // Click anywhere in scrollbar zone (wider hit area for usability)
    if (mx >= g.trackX - 6 && mx <= g.trackX + g.trackW + 6 && my >= g.trackY && my <= g.trackY + g.trackH) {
        sbDragging = true;
        scrollbarMouseToY(my);
        e.preventDefault();
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!sbDragging) return;
    const rect = canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    scrollbarMouseToY(my);
});

canvas.addEventListener('mouseup', () => { sbDragging = false; });
canvas.addEventListener('mouseleave', () => { sbDragging = false; });

// ── Draw scrollbar ──────────────────────────────────────
function drawScrollbar() {
    const g = getScrollbarGeo();
    if (!g.visible) return;

    // Track
    ctx.fillStyle = sbDragging ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(g.trackX, g.trackY, g.trackW, g.trackH);
    // Track border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(g.trackX, g.trackY, g.trackW, g.trackH);

    // Thumb
    const thumbY = Math.max(g.trackY, Math.min(g.trackY + g.trackH - g.thumbH, g.thumbY));
    ctx.fillStyle = sbDragging ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(g.trackX, thumbY, g.trackW, g.thumbH);

    // Floor indicator dot
    if (g.totalFloors > 0) {
        const dotY = g.trackY + (state.currentFloor / Math.max(1, g.totalFloors - 1)) * (g.trackH - 4);
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(g.trackX - 1, dotY, g.trackW + 2, 3);
    }
}

// ── MAIN DRAW — Full render pipeline ──────────────────────
function draw() {
    // Background fill .......................................
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Matrix rain (screen-space) ............................
    ctx.fillStyle = '#161616';
    ctx.font = '10px "Courier New"';
    state.matrixLines.forEach(line => {
        ctx.fillText(line.text, line.x, line.y);
        line.y += line.speed;
        if (line.y > CANVAS_H) { line.y = -10; line.x = Math.random() * CANVAS_W; }
    });

    // Subtle grid ...........................................
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Modifier UI (RAM bar etc.) ...........................
    drawModifierUI();

    // Draw all floors (bottom→top for proper overlap) ......
    for (let i = 0; i < state.floors.length; i++) {
        const screenTopY = getFloorScreenTop(i);
        const fh2 = state.floors[i].height || FLOOR_HEIGHT;
        if (screenTopY + fh2 < 0 || screenTopY > CANVAS_H) continue;
        drawFloor(state.floors[i], screenTopY);
    }

    // Player ................................................
    if (state.gameState !== 'CRASHED') {
        drawPlayer();
    }

    // Particles .............................................
    drawParticles();

    // Transition flash overlay ..............................
    if (state.flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(0, 255, 102, ${state.flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Crash screen ..........................................
    if (state.gameState === 'CRASHED') {
        drawCrashOverlay();
    }

    // Scrollbar (right edge) ...............................
    drawScrollbar();
}
