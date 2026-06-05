// ═══════════════════════════════════════════════════════════════
// IF STATEMENT — 条件判断
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'if', name: 'IF-statement', minFloor: 0,
    codeText: 'if (status == SUCCESS) { ExecuteNext(); } else { Blocked; }',

    generateElements(floorIndex, floor) {
        const elements = [], pt = createPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // 1) Variable first — obstacles avoid it
        const vx = 180 + Math.random() * 200;
        if (Math.random() > 0.5) {
            elements.push({ type: 'variable', subType: 'bool', x: vx, y: gy - 16, w: 16, h: 16, active: true });
            pt.add(vx, gy - 16, 16, 16);
        } else {
            const ay = 48 + Math.random() * 10;
            elements.push({ type: 'variable', subType: 'bool', x: vx, y: ay, w: 16, h: 16, active: true });
            pt.add(vx, ay, 16, 16);
            elements.push({ type: 'platform', x: vx - 20, y: ay + 22, w: 56, h: 10 });
            pt.add(vx - 20, ay + 22, 56, 10);
        }

        // 2) Obstacles — skip if overlapping variable
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(floorIndex / 3);
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.4) {
                const bx = pt.tryPlaceX(20, 130, 610, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: bx, y: gy - 16, w: 20, h: 16 });
                pt.add(bx, gy - 16, 20, 16);
            } else {
                const py = 50 + Math.random() * 35;
                const px = pt.tryPlaceX(60, 130, 610, py, 10, 5);
                elements.push({ type: 'platform', x: px, y: py, w: 55 + Math.random() * 25, h: 10 });
                pt.add(px, py, 60, 10);
            }
        }
        return elements;
    },

    handleInteraction(p, el) {
        if (el.subType === 'bool' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    }
});
