// ═══════════════════════════════════════════════════════════════
// TERNARY — 二选一分叉路
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'ternary', name: 'TERNARY-operator', minFloor: 3, weight: 1.0,
    codeText: 'bool ok = (probe() == 1) ? Pass() : Crash();',

    generateElements(floorIndex, floor) {
        const elements = [], pt = createPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Obstacles on the main path (avoid branch area x:550-630)
        const count = 2 + Math.floor(Math.random() * 2) + Math.floor(floorIndex / 5);
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.35) {
                const ox = pt.tryPlaceX(20, 130, 530, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: ox, y: gy - 16, w: 20, h: 16 });
                pt.add(ox, gy - 16, 20, 16);
            } else {
                const py = 50 + Math.random() * 35;
                const px = pt.tryPlaceX(60, 130, 530, py, 10, 5);
                elements.push({ type: 'platform', x: px, y: py, w: 55 + Math.random() * 25, h: 10 });
                pt.add(px, py, 60, 10);
            }
        }

        // Two branches at right side — one correct, one wrong
        const branchX = 550;
        const correctBranch = Math.random() > 0.5 ? 'top' : 'bottom';
        elements.push({ type: 'platform', x: branchX, y: 65, w: 80, h: 10 });
        elements.push({ type: 'platform', x: branchX, y: 95, w: 80, h: 10 });

        if (correctBranch === 'top') {
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 49, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 65, w: 80, h: 26, color: '#00ff66' });
            elements.push({ type: 'bug', x: branchX + 30, y: 79, w: 20, h: 16 });  // wrong branch — intentional
        } else {
            elements.push({ type: 'bug', x: branchX + 30, y: 49, w: 20, h: 16 });  // wrong branch — intentional
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 79, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 95, w: 80, h: 26, color: '#00ff66' });
        }
        return elements;
    },

    handleInteraction(p, el) {
        if (el.subType === 'bool' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    },

    drawElement(ctx, el, esy) {
        if (el.subType === 'glow') {
            ctx.fillStyle = el.color === '#00ff66' ? 'rgba(0,255,102,0.08)' : 'rgba(255,51,51,0.08)';
            ctx.fillRect(el.x, esy, el.w, el.h);
            return true;
        }
        return false;
    }
});
