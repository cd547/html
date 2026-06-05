// ═══════════════════════════════════════════════════════════════
// UTILS — Collision detection, particles, placement helpers
// ═══════════════════════════════════════════════════════════════

// ── AABB intersection test ────────────────────────────────
function isColliding(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

// ── Safe zone overlap check ───────────────────────────────
function isInSafeZone(x, w) {
    for (const zone of SAFE_ZONES) {
        if (x < zone.x + zone.w && x + w > zone.x) return true;
    }
    return false;
}

// ── Placement tracker — prevents element overlap ──────────
// Usage: const pt = createPlacementTracker();
//        const x = pt.tryPlaceX(w, 130, 610);  // tries to find clear X
//        pt.add(x, y, w, h);                    // registers placed element
function createPlacementTracker() {
    const rects = [];
    return {
        add(x, y, w, h) { rects.push({ x, y, w, h }); },
        overlaps(x, y, w, h, gap = 10) {
            const rx = x - gap, ry = y - gap, rw = w + gap * 2, rh = h + gap * 2;
            for (const r of rects) {
                if (rx < r.x + r.w && rx + rw > r.x && ry < r.y + r.h && ry + rh > r.y) return true;
            }
            return false;
        },
        tryPlaceX(w, minX, maxX, y, h, gap = 10) {
            for (let attempt = 0; attempt < 25; attempt++) {
                const cx = minX + Math.random() * (maxX - minX - w);
                if (!isInSafeZone(cx, w) && !this.overlaps(cx, y, w, h, gap)) return cx;
            }
            return minX + Math.random() * (maxX - minX - w);  // fallback
        }
    };
}

// ── Particle emitter ──────────────────────────────────────
function spawnParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30 + Math.random() * 20,
            color
        });
    }
}
