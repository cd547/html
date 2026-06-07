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
    // J键进入注释模式
    if (e.key.toLowerCase() === 'j' && state.gameState === 'PLAYING' && !state.commentMode) {
        state.commentMode = true;
        const floor = state.floors[state.currentFloor];
        state.commentText = floor.codeText || '';
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ── Main player update — called each frame during PLAYING ─
function updatePlayer(floor) {
    const p = state.player;

    // Initialize jump variables if not present
    if (p.airJumps === undefined) p.airJumps = 0;
    if (p._lastJumpTime === undefined) p._lastJumpTime = 0;
    const maxAirJumps = 2;  // 最多3次跳跃（1次地面+2次空中）
    const comboWindow = 500; // 连续跳跃时间窗口（毫秒）

    // Horizontal input .......................................
    if (keys['arrowleft'] || keys['a'])      { p.vx = -p.speed; p.facing = -1; }
    else if (keys['arrowright'] || keys['d']) { p.vx =  p.speed; p.facing =  1; }
    else                                       { p.vx = 0; }

    // Reset air jumps if more than comboWindow has passed since last jump
    const now = Date.now();
    if (!p.isGrounded && p._lastJumpTime > 0 && now - p._lastJumpTime > comboWindow) {
        p.airJumps = maxAirJumps; // Reset to max, preventing further air jumps
    }

    // Jump ...................................................
    // Allow jump if on ground OR have air jumps remaining
    const jumpPressed = keys['arrowup'] || keys['w'] || keys[' '];
    const canJump = p.isGrounded || (p.airJumps < maxAirJumps);
    
    if (jumpPressed && canJump && !p._jumpCooldown) {
        // Calculate jump height with increasing power
        // 第1次 地面跳跃: 0.7 × 原高度
        // 第2次 空中跳跃: 1.2 × 原高度（必须在0.5秒内）
        // 第3次 空中跳跃: 1.2 × 原高度（必须在0.5秒内）
        let jumpMultiplier;
        if (p.isGrounded) {
            jumpMultiplier = 0.7;  // 增加第一次跳跃高度，给更多空中时间
            p.airJumps = 0; // Reset air jump counter on ground jump
        } else {
            // airJumps: 0 -> 第2跳, 1 -> 第3跳
            jumpMultiplier = 1.0; // 第2跳和第3跳都是1倍
        }
        const jumpHeight = -p.jump * jumpMultiplier;
        
        // 地面跳跃：直接设置速度（不叠加）
        // 空中跳跃：叠加到当前速度
        if (p.isGrounded) {
            p.vy = jumpHeight;
        } else {
            p.vy += jumpHeight;
            // 限制空中跳跃叠加后的最大向上速度
            const maxUpwardSpeed = -p.jump * 1.8;
            if (p.vy < maxUpwardSpeed) {
                p.vy = maxUpwardSpeed;
            }
        }
        
        p.isGrounded = false;
        p._lastJumpTime = now; // Record jump time for combo check
        
        if (!p.isGrounded) {
            p.airJumps++;
        }
        
        p._jumpCooldown = 8; // 增加冷却时间，防止快速连跳
        const screenTopY = getFloorScreenTop(floor.index);
        spawnParticles(p.x + p.w / 2, p.y + screenTopY + p.h, '#ffffff', 5);
    }
    
    // Decrement jump cooldown
    if (p._jumpCooldown > 0) p._jumpCooldown--;

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
    // 限制玩家在游戏区域内（不包括代码面板）
    if (p.x > GAME_W - p.w) p.x = GAME_W - p.w;

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
        p.airJumps = 0; // Reset air jumps when landing
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
                p.airJumps = 0; // Reset air jumps when landing on platform
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
            // Fall through to all gameplays (组合玩法)
            if (!result && floor.gameplays) {
                for (const gp of floor.gameplays) {
                    if (gp.handleInteraction) {
                        result = gp.handleInteraction(p, el, floor);
                        if (result) break;
                    }
                }
            }
            // Fallback to primary gameplay (for backward compatibility)
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

    // Transition cooldown — prevent immediately triggering win condition after transition
    if (p._transitionCooldown > 0) {
        p._transitionCooldown--;
    }

    // Check win condition: all gameplays must be satisfied (组合玩法)
    let won = false;
    if (!p._transitionCooldown) {  // 只有在冷却结束后才能触发胜利条件
        // 检查是否到达出口
        const rx = floor.returnX != null ? floor.returnX : 720;
        const ry = floor.returnY != null ? floor.returnY : ((floor.groundY || FLOOR_GROUND_LOCAL) - 50);
        const atExit = p.x > rx + 10 && p.y + p.h > ry && p.y < ry + 60;
        
        if (floor.gameplays && floor.gameplays.length > 0) {
            // 检查所有玩法是否都满足胜利条件（组合玩法）
            const allSatisfied = floor.gameplays.every(gp => {
                if (gp.checkWinCondition) {
                    return gp.checkWinCondition(p, floor);
                }
                return true;  // 如果没有胜利条件检查，默认为满足
            });
            
            // 所有玩法都满足 且 到达出口 才能过关
            won = allSatisfied && atExit;
        } else if (floor.gameplay && floor.gameplay.checkWinCondition) {
            // 单个玩法（向后兼容）
            won = floor.gameplay.checkWinCondition(p, floor) && atExit;
        } else {
            // 默认胜利条件：到达出口
            won = atExit;
        }
    }
    if (won) advanceToNextFloor();
}
