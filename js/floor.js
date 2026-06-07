// ═══════════════════════════════════════════════════════════════
// FLOOR — Generation, management, transitions, and moving elements
// ═══════════════════════════════════════════════════════════════

// ── Floor factory — primary gameplay + optional modifiers ──
function generateFloor(floorIndex) {
    // 获取多个玩法（组合玩法）
    const gameplays = getGameplaysForFloor(floorIndex);
    const primaryGp = gameplays[0];  // 第一个玩法作为主玩法
    const mods = getModifiersForFloor(floorIndex);

    // Floor dimensions — use the tallest gameplay's height
    let height = FLOOR_HEIGHT;
    for (const gp of gameplays) {
        if (gp.floorHeightLevel && FLOOR_HEIGHT_LEVELS[gp.floorHeightLevel]) {
            height = Math.max(height, FLOOR_HEIGHT_LEVELS[gp.floorHeightLevel]);
        } else if (gp.desiredHeight) {
            height = Math.max(height, gp.desiredHeight * FLOOR_HEIGHT);
        }
    }
    const groundY = height - GROUND_BLOCK_H;

    // Build floor shell first so gameplay has groundY available
    const floor = {
        index: floorIndex,
        gameplay: primaryGp,  // 主玩法（用于胜利条件检查）
        gameplays: gameplays,  // 所有玩法（用于元素生成）
        modifiers: mods,
        height: height,
        groundY: groundY,
        gateX: 650,
        gateUnlocked: false,
        elements: [],
        codeText: '',
        completed: false,
        returnX: null,
        returnY: null
    };

    // Let all gameplays customize floor before element generation
    for (const gp of gameplays) {
        if (gp.setupFloor) gp.setupFloor(floor, floorIndex);
    }

    // Generate elements from all gameplays
    const elements = [];
    // 使用增强版放置追踪器防止平台重叠（所有玩法共享）
    const pt = createEnhancedPlacementTracker();
    
    for (const gp of gameplays) {
        // 传递共享的 placement tracker 给玩法
        const gpElements = gp.generateElements(floorIndex, floor, pt);
        // 将元素添加到追踪器
        gpElements.forEach(el => {
            elements.push(el);
            pt.add(el.x, el.y, el.w, el.h);
        });
    }
    floor.elements = elements;   // set early so modifiers can check overlaps

    // Modifiers add extra elements (can see floor.elements for overlap check)
    mods.forEach(mod => {
        if (mod.generateExtras) {
            const extras = mod.generateExtras(floorIndex, floor, pt);
            extras.forEach(el => {
                elements.push(el);
                pt.add(el.x, el.y, el.w, el.h);
            });
        }
    });

    floor.elements = elements;

    // ── Limit platform count to max 4 per floor ──
    // 限制每个关卡的平台数量不超过4个（不包括出口平台）
    const platforms = elements.filter(e => e.type === 'platform' && !e.isRescue && !e.isExitPlatform);
    if (platforms.length > 4) {
        console.log(`[Floor ${floorIndex}] Too many platforms (${platforms.length}), removing ${platforms.length - 4}`);
        // 保留前4个平台，删除多余的
        const toRemove = platforms.slice(4);
        toRemove.forEach(p => {
            const idx = elements.indexOf(p);
            if (idx > -1) elements.splice(idx, 1);
        });
    }

    // ── Ensure exit has a platform to stand on ──
    // 如果出口在高处（超过地面40px以上），确保有平台可以到达
    const exitY = floor.returnY != null ? Math.max(10, floor.returnY) : groundY - 50; // 限制出口最小高度，避免展示不全
    const exitX = floor.returnX != null ? floor.returnX : 730;
    // 更新 floor 的 returnY 以应用限制
    if (floor.returnY != null && floor.returnY < 10) {
        floor.returnY = 10;
    }
    const exitMinYForPlatform = (floor.groundY || FLOOR_GROUND_LOCAL) - 40;
    
    if (exitY < exitMinYForPlatform) {
        // 出口在高处，需要在出口下方添加平台
        const platformY = exitY + 50;  // 平台在出口下方50px处
        const platformW = 60;
        const platformX = exitX - platformW / 2 + 20;  // 居中对齐出口
        
        // 检查是否已有平台在该位置附近
        let hasPlatformNearExit = elements.some(el => 
            el.type === 'platform' && 
            Math.abs(el.x - platformX) < platformW && 
            Math.abs(el.y - platformY) < 30
        );
        
        if (!hasPlatformNearExit) {
            // 使用统一的 placeAt 方法，自动处理所有检查
            let exitPlatform = pt.placeAt(platformX, platformY, platformW, 10, { isExitPlatform: true });
            
            // 如果放置失败，尝试向左或向右调整位置
            if (!exitPlatform) {
                console.log(`[Floor ${floorIndex}] Failed to place exit platform at (${platformX}, ${platformY}), trying adjusted positions`);
                // 尝试左边一点
                exitPlatform = pt.placeAt(platformX - 40, platformY, platformW, 10, { isExitPlatform: true });
                if (!exitPlatform) {
                    // 尝试右边一点
                    exitPlatform = pt.placeAt(platformX + 40, platformY, platformW, 10, { isExitPlatform: true });
                    if (!exitPlatform) {
                        // 如果还失败，直接强制放置（不检查重叠）
                        console.log(`[Floor ${floorIndex}] Force placing exit platform at (${platformX}, ${platformY})`);
                        exitPlatform = {
                            type: 'platform',
                            x: platformX,
                            y: platformY,
                            w: platformW,
                            h: 10,
                            isExitPlatform: true
                        };
                        pt.add(platformX, platformY, platformW, 10);
                    }
                }
            }
            
            if (exitPlatform) {
                elements.push(exitPlatform);
                console.log(`[Floor ${floorIndex}] Added platform for exit at (${exitPlatform.x}, ${exitPlatform.y})`);
            }
        }
    }

    // Build code text from all gameplays
    let codeText = gameplays.map(gp => gp.codeText).join('\n');
    mods.forEach(mod => { codeText += '\n  // [' + mod.name + ']'; });
    floor.codeText = codeText;

    // ── Reachability analysis — detect and fix dead zones ──
    // 分析场景可达性，检测无法到达的区域
    const playerStartX = 60;  // 玩家起始X位置
    const playerStartY = FLOOR_CEILING_LOCAL;  // 玩家起始Y位置（楼层顶部）
    const analysis = analyzeReachability(floor, playerStartX, playerStartY);
    
    if (analysis.hasDeadZone) {
        console.log(`[Floor ${floorIndex}] Detected ${analysis.unreachableElements.length} unreachable elements:`, 
            analysis.unreachableElements.map(e => ({ type: e.type, x: e.x, y: e.y })));
        
        // 添加救援传送门
        const rescuePortals = addRescuePortals(floor, analysis, pt);
        console.log(`[Floor ${floorIndex}] Added ${rescuePortals.length} rescue portals:`,
            rescuePortals.map(p => ({ type: p.type, x: p.x, y: p.y, isRescue: p.isRescue })));
        
        rescuePortals.forEach(el => {
            elements.push(el);
            pt.add(el.x, el.y, el.w, el.h);
        });
        
        // 更新代码文本，标记添加了救援传送门
        floor.codeText = codeText + '\n  // [AUTO-RESCUE: ' + rescuePortals.length + ' portals added]';
    }

    return floor;
};

// ── Pre-generation ────────────────────────────────────────
function ensureFloorsExist(upToIndex) {
    while (state.floors.length <= upToIndex) {
        const idx = state.floors.length;
        state.floors.push(generateFloor(idx));
    }
}

// ── Update moving elements + gameplay/modifier per-frame logic
function updateMovingElements(floor) {
    // All gameplays update (timers, etc.) - 组合玩法
    if (floor.gameplays) {
        for (const gp of floor.gameplays) {
            if (gp.updateFloor) gp.updateFloor(floor);
        }
    }
    // Fallback to primary gameplay (向后兼容)
    if (floor.gameplay && floor.gameplay.updateFloor) {
        floor.gameplay.updateFloor(floor);
    }
    // Modifier updates (RAM leak, etc.)
    (floor.modifiers || []).forEach(mod => {
        if (mod.updateFloor) mod.updateFloor(floor);
    });
    floor.elements.forEach(el => {
        if (el.type === 'platform' && el.moveVx) {
            el.x += el.moveVx;
            if (el.x > el.moveMax) { el.x = el.moveMax; el.moveVx *= -1; }
            if (el.x < el.moveMin) { el.x = el.moveMin; el.moveVx *= -1; }
        }
        if (el.type === 'bug' && el.patrolVx) {
            el.x += el.patrolVx;
            if (el.x > el.patrolMax) { el.x = el.patrolMax; el.patrolVx *= -1; }
            if (el.x < el.patrolMin) { el.x = el.patrolMin; el.patrolVx *= -1; }
        }
    });
}

// ── Screen coordinate helper ──────────────────────────────
function getFloorScreenTop(floorIndex) {
    // 楼层从上往下堆叠：楼层0在最上面，楼层索引越大越靠下
    // scrollY增加时，楼层向上移动（实现向下滚动的视觉效果）
    let cumulative = 0;
    for (let i = 0; i < floorIndex; i++) {
        cumulative += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    return cumulative - state.scrollY;
}

// ── Camera target computation ─────────────────────────────
function computeTargetScroll() {
    // 计算滚动位置，让玩家保持在屏幕上方（从上往下爬）
    const playerScreenY = 100;  // 玩家在屏幕上的目标位置（距顶部）
    let above = 0;
    for (let i = 0; i < state.currentFloor; i++) {
        above += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    // 让当前楼层的顶部（玩家起始位置）保持在屏幕上方
    const raw = above + FLOOR_CEILING_LOCAL - playerScreenY;
    return Math.max(0, raw);
}

// ── Floor advancement — trigger transition to next floor ──
function advanceToNextFloor() {
    // Deactivate modifiers on current floor
    const cur = state.floors[state.currentFloor];
    if (cur) (cur.modifiers || []).forEach(m => { if (m.onDeactivate) m.onDeactivate(cur); });

    state.gameState = 'TRANSITIONING';
    state.transitionTimer = 40;
    state.transitionPhase = 0;
    state.flashAlpha = 0.8;
    state.ramUsage = 128;   // reset memory for next floor

    state.floors[state.currentFloor].completed = true;
    state.linesExecuted += 10;
    state.totalFloorsCleared++;
    linesCountEl.innerText = state.linesExecuted;

    ensureFloorsExist(state.currentFloor + 2);

    const curFloor = state.floors[state.currentFloor];
    const screenTopY = getFloorScreenTop(curFloor.index);
    spawnParticles(state.player.x + state.player.w / 2, state.player.y + screenTopY, '#00ff66', 25);
}

// ── Transition animation state machine ────────────────────
function updateTransition() {
    state.transitionTimer--;
    state.flashAlpha *= 0.92;

    if (state.transitionPhase === 0) {
        // Phase 0: transition to next floor (直接传送，不再等待下落)
        // 立即进入下一层，不再需要等待玩家"掉下去"
        state.transitionPhase = 1;
        state.currentFloor++;
        const nextFloor = state.floors[state.currentFloor];
        const ceilingY = (nextFloor && nextFloor.height ? nextFloor.height - FLOOR_GROUND_LOCAL + FLOOR_CEILING_LOCAL : FLOOR_CEILING_LOCAL);
        state.player.x = 60;
        state.player.y = ceilingY;
        state.player.vy = 0;
        state.player.vx = 0;
        state.player.trail = [];
        state.player.isGrounded = false;
        state.targetScrollY = computeTargetScroll();
        floorDisplayEl.innerText = String(state.currentFloor + 1);
        
        // 生成传送粒子效果
        const screenTopY = getFloorScreenTop(state.currentFloor);
        spawnParticles(state.player.x + state.player.w / 2,
            screenTopY + ceilingY,
            '#00ff66', 20);
    }

    // Always update position during transition for smooth scrolling
    const p = state.player;
    p.vy += state.gravity * 0.3;  // 轻微重力效果
    p.y += p.vy;
    
    // Keep player at ceiling during transition
    const curFloor = state.floors[state.currentFloor];
    const ceilingY = (curFloor && curFloor.height ? curFloor.height - FLOOR_GROUND_LOCAL + FLOOR_CEILING_LOCAL : FLOOR_CEILING_LOCAL);
    if (p.y <= ceilingY) {
        p.y = ceilingY;
        p.vy = 0;
    }

    if (state.transitionTimer <= 0) {
        state.gameState = 'PLAYING';
        state.player.isGrounded = false;
        state.player.vy = 0;
        state.player.x = 60;
        state.player.y = ceilingY;
        state.player._transitionCooldown = 30;
        state.flashAlpha = 0;
    }
}

// ── Restart current floor (preserves layout, just resets state) ──────
function restartFloor() {
    const idx = state.currentFloor;
    const floor = state.floors[idx];
    
    // Deactivate modifiers on current floor
    if (floor) (floor.modifiers || []).forEach(m => { if (m.onDeactivate) m.onDeactivate(floor); });

    // Reset all elements to their initial state (reactivate variables, reset counters)
    if (floor && floor.elements) {
        floor.elements.forEach(el => {
            if (el.active !== undefined) el.active = true;
            if (el.current !== undefined) el.current = 0;
            if (el._lastPress) delete el._lastPress;
            if (el.collected !== undefined) el.collected = false;
            if (el.touched !== undefined) el.touched = false;
        });
    }

    // Reset extras (freePtr potions)
    if (floor && floor.extras) {
        floor.extras.forEach(el => {
            if (el.active !== undefined) el.active = true;
            if (el.collected !== undefined) el.collected = false;
        });
    }

    // Reset floor-specific state
    if (floor) {
        floor.gateUnlocked = false;
        floor.completed = false;
        floor._asyncTimer = 0;
        floor._asyncGateOpen = false;
    }

    // Reset game state
    state.ramUsage = 128;
    state.crashReason = 'bug';
    state.gameState = 'PLAYING';
    // 自动滚动到当前楼层位置
    state.targetScrollY = computeTargetScroll();
    state.scrollY = state.targetScrollY;
    
    // Reset player position and state (start from top of floor)
    state.player.x = 60;
    const ceilingY = (floor && floor.height ? floor.height - FLOOR_GROUND_LOCAL + FLOOR_CEILING_LOCAL : FLOOR_CEILING_LOCAL);
    state.player.y = ceilingY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.trail = [];
    state.player.facing = 1;
    state.player.isGrounded = false;  // 玩家从楼层顶部开始，在空中
    state.player.airJumps = 0;
    state.player._lastJumpTime = 0;
    state.player._jumpCooldown = 0;
    state.particles = [];
    state.flashAlpha = 0;
    floorDisplayEl.innerText = String(idx + 1);
}

// ── Full game reset ───────────────────────────────────────
function initGame(scoreValue = 0) {
    // Deactivate modifiers on all floors before reset
    state.floors.forEach(f => {
        (f.modifiers || []).forEach(m => { if (m.onDeactivate) m.onDeactivate(f); });
    });

    state.linesExecuted = scoreValue;
    state.totalFloorsCleared = 0;
    state.ramUsage = 128;
    state.crashReason = 'bug';
    state.showRamBar = false;
    state.currentFloor = 0;
    state.scrollY = 0;
    state.targetScrollY = 0;
    state.gameState = 'PLAYING';
    state.floors = [];
    state.particles = [];
    state.transitionTimer = 0;
    state.transitionPhase = 0;
    state.flashAlpha = 0;

    ensureFloorsExist(2);
    state.player.x = 60;
    // 玩家从楼层顶部开始（从上往下爬）
    const firstFloor = state.floors[0];
    const ceilingY = (firstFloor && firstFloor.height ? firstFloor.height - FLOOR_GROUND_LOCAL + FLOOR_CEILING_LOCAL : FLOOR_CEILING_LOCAL);
    state.player.y = ceilingY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.trail = [];
    
    // Initialize level editor if available
    if (typeof initLevelEditor === 'function') {
        initLevelEditor();
    }
    state.player.facing = 1;

    linesCountEl.innerText = state.linesExecuted;
    floorDisplayEl.innerText = '1';
}
