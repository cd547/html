// ═══════════════════════════════════════════════════════════════
// WHILE LOOP — 打破死循环
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'while', name: 'WHILE-loop', minFloor: 0,
    codeText: 'while (infinite_loop == true) { Yield(); // Break it! }',

    generateElements(floorIndex, floor) {
        const elements = [], pt = createPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Variable + platform first
        const bx = 200 + Math.random() * 250, ay = 48 + Math.random() * 10;
        elements.push({ type: 'variable', subType: 'break', x: bx, y: ay, w: 20, h: 20, active: true });
        pt.add(bx, ay, 20, 20);
        elements.push({ type: 'platform', x: bx - 18, y: ay + 26, w: 56, h: 10 });
        pt.add(bx - 18, ay + 26, 56, 10);

        // Obstacles away from variable
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(floorIndex / 3);
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

    handleInteraction(p, el) {
        if (el.subType === 'break' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    }
});
