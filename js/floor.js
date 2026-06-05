// ═══════════════════════════════════════════════════════════════
// FLOOR — Generation, management, transitions, and moving elements
// ═══════════════════════════════════════════════════════════════

// ── Floor factory — primary gameplay + optional modifiers ──
function generateFloor(floorIndex) {
    const gp = getGameplayForFloor(floorIndex);
    const mods = getModifiersForFloor(floorIndex);

    // Floor dimensions — gameplay can request taller floors via floorHeightLevel or desiredHeight
    // floorHeightLevel: 1, 2, 3, or 5 (multipliers of FLOOR_HEIGHT)
    // desiredHeight: legacy scale factor (backward compatible)
    let height;
    if (gp.floorHeightLevel && FLOOR_HEIGHT_LEVELS[gp.floorHeightLevel]) {
        height = FLOOR_HEIGHT_LEVELS[gp.floorHeightLevel];
    } else if (gp.desiredHeight) {
        height = gp.desiredHeight * FLOOR_HEIGHT;
    } else {
        height = FLOOR_HEIGHT;
    }
    const groundY = height - GROUND_BLOCK_H;

    // Build floor shell first so gameplay has groundY available
    const floor = {
        index: floorIndex,
        gameplay: gp,
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

    // Let gameplay customize floor before element generation
    if (gp.setupFloor) gp.setupFloor(floor, floorIndex);

    // Generate elements with floor context
    const elements = gp.generateElements(floorIndex, floor);
    floor.elements = elements;   // set early so modifiers can check overlaps

    // Modifiers add extra elements (can see floor.elements for overlap check)
    mods.forEach(mod => {
        if (mod.generateExtras) {
            const extras = mod.generateExtras(floorIndex, floor);
            elements.push(...extras);
        }
    });

    floor.elements = elements;

    // Build code text
    let codeText = gp.codeText;
    mods.forEach(mod => { codeText += '  // [' + mod.name + ']'; });
    floor.codeText = codeText;

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
    // Primary gameplay update (timers, etc.)
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
    // Sum heights of floors 0..floorIndex, then offset from bottom
    let cumulative = 0;
    for (let i = 0; i <= floorIndex; i++) {
        cumulative += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    return CANVAS_H - cumulative + state.scrollY;
}

// ── Camera target computation ─────────────────────────────
function computeTargetScroll() {
    // Sum heights of floors before current, then center current floor
    let below = 0;
    for (let i = 0; i < state.currentFloor; i++) {
        below += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    const curH = (state.floors[state.currentFloor] && state.floors[state.currentFloor].height) || FLOOR_HEIGHT;
    const raw = below + curH - CANVAS_H / 2;
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
        // Phase 0: rise out of current floor
        state.player.y -= 4;
        const curFloor = state.floors[state.currentFloor];
        const screenTopY = getFloorScreenTop(curFloor.index);
        spawnParticles(
            state.player.x + state.player.w / 2,
            state.player.y + screenTopY + state.player.h,
            '#ffffff', 1
        );

        if (state.player.y < FLOOR_PLAY_TOP - 20) {
            // Teleport to next floor
            state.transitionPhase = 1;
            state.currentFloor++;
            state.player.x = 60;
            state.player.y = FLOOR_PLAY_TOP - 10;
            state.player.vy = 3;
            state.player.vx = 0;
            state.player.trail = [];
            state.player.isGrounded = false;
            state.targetScrollY = computeTargetScroll();
            floorDisplayEl.innerText = String(state.currentFloor + 1);
            spawnParticles(60 + state.player.w / 2,
                getFloorScreenTop(state.currentFloor) + FLOOR_PLAY_TOP,
                '#00ff66', 15);
        }
    } else {
        // Phase 1: fall onto new floor
        const p = state.player;
        p.vy += state.gravity;
        p.y += p.vy;
        const gy = (state.floors[state.currentFloor] && state.floors[state.currentFloor].groundY) || FLOOR_GROUND_LOCAL;
        if (p.y + p.h >= gy) {
            p.y = gy - p.h;
            p.vy = 0;
            p.isGrounded = true;
        }
    }

    if (state.transitionTimer <= 0) {
        state.gameState = 'PLAYING';
        state.player.isGrounded = true;
        state.player.vy = 0;
        const gy2 = (state.floors[state.currentFloor] && state.floors[state.currentFloor].groundY) || FLOOR_GROUND_LOCAL;
        state.player.y = gy2 - state.player.h;
        state.flashAlpha = 0;
    }
}

// ── Restart current floor on crash (preserves score) ──────
function restartFloor() {
    const idx = state.currentFloor;
    // Deactivate modifiers on crashed floor
    const old = state.floors[idx];
    if (old) (old.modifiers || []).forEach(m => { if (m.onDeactivate) m.onDeactivate(old); });

    state.floors[idx] = generateFloor(idx);
    state.floors[idx].index = idx;
    state.ramUsage = 128;
    state.crashReason = 'bug';
    state.gameState = 'PLAYING';
    state.player.x = 60;
    const gy3 = (state.floors[idx] && state.floors[idx].groundY) || FLOOR_GROUND_LOCAL;
    state.player.y = gy3 - state.player.h;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.trail = [];
    state.player.facing = 1;
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
    const gy4 = (state.floors[0] && state.floors[0].groundY) || FLOOR_GROUND_LOCAL;
    state.player.y = gy4 - state.player.h;
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
