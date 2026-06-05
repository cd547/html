// ═══════════════════════════════════════════════════════════════
// SWITCH/CASE — 多钥匙收集
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'switch', name: 'SWITCH-statement', minFloor: 2, weight: 1.2,
    codeText: 'switch(status) { case 0: case 1: case 2: return OK; }',

    generateElements(floorIndex, floor) {
        const elements = [], pt = createPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // 3 keys first
        const positions = [
            { x: 160 + Math.random() * 100, y: gy - 14 },
            { x: 320 + Math.random() * 100, y: 48 + Math.random() * 10 },
            { x: 480 + Math.random() * 100, y: gy - 14 }
        ];
        positions.forEach((pos, idx) => {
            elements.push({ type: 'variable', subType: 'caseKey', x: pos.x, y: pos.y, w: 14, h: 14, keyIndex: idx, active: true });
            pt.add(pos.x, pos.y, 14, 14);
            if (pos.y < gy - 20) {
                elements.push({ type: 'platform', x: pos.x - 18, y: pos.y + 20, w: 50, h: 10 });
                pt.add(pos.x - 18, pos.y + 20, 50, 10);
            }
        });

        // Obstacles away from keys
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(floorIndex / 4);
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.35) {
                const ox = pt.tryPlaceX(20, 130, 610, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: ox, y: gy - 16, w: 20, h: 16 });
                pt.add(ox, gy - 16, 20, 16);
            } else {
                const py = 50 + Math.random() * 35;
                const px = pt.tryPlaceX(60, 130, 610, py, 10, 5);
                elements.push({ type: 'platform', x: px, y: py, w: 55 + Math.random() * 25, h: 10 });
                pt.add(px, py, 60, 10);
            }
        }
        return elements;
    },

    handleInteraction(p, el, floor) {
        if (el.subType === 'caseKey' && el.active) {
            el.active = false;
            const allDone = floor.elements.filter(e => e.subType === 'caseKey').every(e => !e.active);
            if (allDone) return { unlockGate: true };
            return { bounce: -3 };
        }
        return null;
    },

    drawElement(ctx, el, esy) {
        if (el.subType === 'caseKey' && el.active) {
            ctx.fillStyle = '#ffcc00'; ctx.fillRect(el.x, esy, el.w, el.h);
            ctx.fillStyle = '#000'; ctx.font = 'bold 9px "Courier New"';
            ctx.fillText(el.keyIndex, el.x + 4, esy + 11);
            return true;
        }
        return false;
    }
});
