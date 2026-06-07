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
    
    // Handle comment mode UI
    if (state.commentMode) {
        const modal = document.getElementById('comment-mode-modal');
        if (modal && modal.style.display === 'none') {
            openCommentModeModal();
        }
    }
    
    requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════════════
// COMMENT MODE — Skip floor by commenting out code
// ═══════════════════════════════════════════════════════════════

function openCommentModeModal() {
    const modal = document.getElementById('comment-mode-modal');
    const input = document.getElementById('comment-code-input');
    const floorNum = document.getElementById('comment-floor-num');
    const floorType = document.getElementById('comment-floor-type');
    
    if (!modal || !input) return;
    
    const floor = state.floors[state.currentFloor];
    if (!floor) return;
    
    // Update floor info
    if (floorNum) floorNum.textContent = state.currentFloor + 1;
    if (floorType) floorType.textContent = (floor.gameplay && floor.gameplay.name) || 'Unknown';
    
    // Set initial code text
    input.value = state.commentText || floor.codeText || '';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus on input
    setTimeout(() => input.focus(), 100);
    
    // Add input listener
    input.addEventListener('input', handleCommentInput);
    
    // Add keyboard listener for Enter and Esc
    input.addEventListener('keydown', handleCommentKeydown);
}

function handleCommentInput(e) {
    const input = e.target;
    const status = document.getElementById('comment-status');
    const submitBtn = document.getElementById('comment-submit-btn');
    
    const text = input.value.trim();
    const isCommented = text.startsWith('//');
    
    if (status) {
        if (isCommented) {
            status.innerHTML = '✓ Code commented! Press Enter to skip floor.';
            status.style.color = '#00ff66';
        } else {
            status.innerHTML = '⚠ Code not commented yet';
            status.style.color = '#ff3333';
        }
    }
    
    if (submitBtn) {
        submitBtn.style.opacity = isCommented ? '1' : '0.5';
        submitBtn.style.pointerEvents = isCommented ? 'auto' : 'none';
    }
    
    state.commentText = text;
}

function handleCommentKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = e.target.value.trim();
        if (text.startsWith('//')) {
            submitComment();
        }
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        cancelCommentMode();
    }
}

function submitComment() {
    const input = document.getElementById('comment-code-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text.startsWith('//')) return;
    
    // Mark floor as completed
    const floor = state.floors[state.currentFloor];
    if (floor) {
        floor.completed = true;
        floor.codeText = text; // Update code text with comment
    }
    
    // Add penalty to score (commenting costs lines)
    state.linesExecuted += 5;
    linesCountEl.innerText = state.linesExecuted;
    
    // Close modal
    cancelCommentMode();
    
    // Advance to next floor
    advanceToNextFloor();
}

function cancelCommentMode() {
    const modal = document.getElementById('comment-mode-modal');
    const input = document.getElementById('comment-code-input');
    
    if (modal) modal.style.display = 'none';
    if (input) {
        input.removeEventListener('input', handleCommentInput);
        input.removeEventListener('keydown', handleCommentKeydown);
    }
    
    state.commentMode = false;
    state.commentText = '';
}

// Global keyboard listener for Esc key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.commentMode) {
        cancelCommentMode();
    }
});

// ═══════════════════════════════════════════════════════════════
// BOOT — Initialize runtime and start compile tower
// ═══════════════════════════════════════════════════════════════
initGame(0);
loop();
