// ═══════════════════════════════════════════════════════════════
// GAME — Main orchestrator: update loop, camera, boot sequence
// ═══════════════════════════════════════════════════════════════

// ── Per-frame update — delegates to subsystems ────────────
function update() {
    // Smooth camera scroll toward target
    state.scrollY += (state.targetScrollY - state.scrollY) * 0.08;

    if (state.gameState === 'CRASHED') return;

    if (state.gameState === 'TRANSITIONING') {
        updateTransition();
        return;
    }

    if (state.gameState !== 'PLAYING') return;

    const floor = state.floors[state.currentFloor];
    updateMovingElements(floor);   // gameplay timers, patrol bugs, moving platforms
    updatePlayer(floor);           // input, physics, collisions

    // ── Modifier checks ───────────────────────────────────
    const hasMemoryLeak = (floor.modifiers || []).some(m => m.id === 'memoryleak');
    state.showRamBar = hasMemoryLeak;
    if (hasMemoryLeak && state.ramUsage >= state.ramMax) {
        state.gameState = 'CRASHED';
        state.crashReason = 'overflow';
        const screenTopY = getFloorScreenTop(floor.index);
        const p = state.player;
        spawnParticles(p.x + p.w/2, p.y + screenTopY + p.h/2, '#ff6600', 40);
    }
}

// ── Standard rAF game loop ────────────────────────────────
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════════════
// BOOT — Initialize runtime and start compile tower
// ═══════════════════════════════════════════════════════════════
initGame(0);
loop();
