// ═══════════════════════════════════════════════════════════════
// PLAYER — Input handling and per-frame physics / collision
// ═══════════════════════════════════════════════════════════════

// ── Keyboard state ────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'r') {
        if (state.gameState === 'CRASHED') {
            restartFloor();                       // keep score, re-roll current floor
        } else if (state.gameState === 'PLAYING') {
            restartFloor();                       // re-roll current floor, keep score
        }
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ── Main player update — called each frame during PLAYING ─
function updatePlayer(floor) {
    const p = state.player;

    // Horizontal input .......................................
    if (keys['arrowleft'] || keys['a'])      { p.vx = -p.speed; p.facing = -1; }
    else if (keys['arrowright'] || keys['d']) { p.vx =  p.speed; p.facing =  1; }
    else                                       { p.vx = 0; }

    // Jump ...................................................
    if ((keys['arrowup'] || keys['w'] || keys[' ']) && p.isGrounded) {
        p.vy = -p.jump;
        p.isGrounded = false;
        const screenTopY = getFloorScreenTop(floor.index);
        spawnParticles(p.x + p.w / 2, p.y + screenTopY + p.h, '#ffffff', 5);
    }

    // Gravity ................................................
    if (!p.isGrounded) {
        p.vy += state.gravity;
    }

    // Trail (motion blur) ...................................
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();

    // Horizontal movement + bounds ..........................
    p.x += p.vx;
    if (p.x < 0) p.x = 0;
    if (p.x > CANVAS_W - p.w) p.x = CANVAS_W - p.w;

    // Vertical movement .....................................
    p.y += p.vy;
    p.isGrounded = false;

    // Apply gravity only if not grounded and not just teleported
    if (!p.isGrounded && !p._skipGravity) {
        p.vy += state.gravity;
    }
    p._skipGravity = false; // Clear the flag after checking

    // Ground collision (current floor) ......................
    if (p.y + p.h >= (floor.groundY || FLOOR_GROUND_LOCAL)) {
        p.y = (floor.groundY || FLOOR_GROUND_LOCAL) - p.h;
        p.vy = 0;
        p.isGrounded = true;
    }

    // Ceiling collision (play area top) .....................
    if (p.y < FLOOR_PLAY_TOP) {
        p.y = FLOOR_PLAY_TOP;
        p.vy = 0;
    }

    // ── Element interactions ──────────────────────────────
    floor.elements.forEach(el => {
        if (el.type === 'platform') {
            const playerRect = { x: p.x, y: p.y, w: p.w, h: p.h };
            const platRect   = { x: el.x, y: el.y, w: el.w, h: el.h };
            
            // Check if player is horizontally overlapping with platform
            const horizontalOverlap = !(p.x + p.w < el.x || p.x > el.x + el.w);
            
            // Check if player's feet are at or below platform top
            const playerBottom = p.y + p.h;
            const onOrAbovePlatform = playerBottom >= el.y && playerBottom <= el.y + el.h + 20;
            
            if (horizontalOverlap && onOrAbovePlatform) {
                p.y = el.y - p.h;
                p.vy = 0;
                p.isGrounded = true;
            }
        }

        if (el.type === 'bug') {
            if (isColliding({ x: p.x, y: p.y, w: p.w, h: p.h },
                            { x: el.x, y: el.y, w: el.w, h: el.h })) {
                state.gameState = 'CRASHED';
                state.crashReason = 'bug';
                const screenTopY = getFloorScreenTop(floor.index);
                spawnParticles(p.x + p.w / 2, p.y + screenTopY + p.h / 2, '#ff3333', 30);
            }
        }

        // Portal teleport
        if (el.type === 'portal' && (el._cooldown || 0) <= 0) {
            const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
            const elRect = { x: el.x, y: el.y, w: el.w, h: el.h };
            if (isColliding(pRect, elRect)) {
                const partner = floor.elements.find(
                    e => e.type === 'portal' && e.portalId === el.portalId && e !== el
                );
                if (partner) {
                    // Teleport to partner portal
                    p.x = partner.x + partner.w / 2 - p.w / 2;
                    p.y = partner.y + partner.h - p.h;
                    p.vy = 0;
                    p.isGrounded = false;
                    // Cooldown both portals to prevent instant re-teleport
                    el._cooldown = 30;
                    partner._cooldown = 30;
                    const screenTopY = getFloorScreenTop(floor.index);
                    spawnParticles(partner.x + partner.w / 2, partner.y + screenTopY, '#33aaff', 12);
                    
                    // Check if there's a platform directly below or at the same level
                    const playerBottom = p.y + p.h;
                    let foundPlatform = false;
                    for (let i = 0; i < floor.elements.length && !foundPlatform; i++) {
                        const otherEl = floor.elements[i];
                        if (otherEl.type === 'platform') {
                            const horizontalOverlap = !(p.x + p.w < otherEl.x || p.x > otherEl.x + otherEl.w);
                            const verticalDistance = otherEl.y - playerBottom;
                            
                            // If player is above or at platform level
                            if (horizontalOverlap && verticalDistance >= -10 && verticalDistance <= 50) {
                                // Place player exactly on top of platform
                                p.y = otherEl.y - p.h;
                                p.vy = 0;
                                p.isGrounded = true;
                                p._skipGravity = true; // Skip gravity in next frame
                                foundPlatform = true; // Only snap to one platform
                            }
                        }
                    }
                }
            }
        }

        if (el.type === 'variable') {
            const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
            const elRect = { x: el.x, y: el.y, w: el.w, h: el.h };
            if (!isColliding(pRect, elRect)) return;  // continue forEach

            // Try modifiers first (e.g. free(ptr) potions)
            let result = null;
            const mods = floor.modifiers || [];
            for (const mod of mods) {
                if (mod.handleInteraction) {
                    result = mod.handleInteraction(p, el, floor);
                    if (result) break;
                }
            }
            // Fall through to primary gameplay
            if (!result && floor.gameplay && floor.gameplay.handleInteraction) {
                result = floor.gameplay.handleInteraction(p, el, floor);
            }

            if (result) {
                if (result.unlockGate) floor.gateUnlocked = true;
                if (result.bounce)  p.vy = result.bounce;
                if (result.warpX)   p.x = result.warpX;

                const screenTopY = getFloorScreenTop(floor.index);
                const color = result.unlockGate ? '#00ff66' : '#ffffff';
                const count = result.unlockGate ? 15 : 5;
                spawnParticles(el.x + el.w / 2, el.y + screenTopY, color, count);
            }
        }
    });

    // ── Gate collision ────────────────────────────────────
    if (!floor.gateUnlocked &&
        p.x + p.w > floor.gateX && p.x < floor.gateX + 10 &&
        p.y + p.h > FLOOR_PLAY_TOP && p.y < (floor.groundY || FLOOR_GROUND_LOCAL)) {
        p.x = floor.gateX - p.w;
    }

    // ── return; portal — advance to next floor ────────────
    // Cooldown tick for portal elements
    floor.elements.forEach(el => {
        if (el.type === 'portal' && el._cooldown > 0) el._cooldown--;
    });

    // Check win condition: gameplay override or default position
    const gp = floor.gameplay;
    let won = false;
    if (gp && gp.checkWinCondition) {
        won = gp.checkWinCondition(p, floor);
    } else {
        const rx = floor.returnX != null ? floor.returnX : 720;
        const ry = floor.returnY != null ? floor.returnY : ((floor.groundY || FLOOR_GROUND_LOCAL) - 50);
        // p.y and ry are both floor-local — no screenY conversion needed
        won = p.x > rx + 10 && p.y + p.h > ry && p.y < ry + 60;
    }
    if (won) advanceToNextFloor();
}
