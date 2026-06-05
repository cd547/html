// ═══════════════════════════════════════════════════════════════
// FOR LOOP — 循环计数器（按 ↓ 触发）
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'for', name: 'FOR-loop', minFloor: 0,
    codeText: 'for (int i = [COUNT]; i < [TARGET]; i++) { DeadLoop(); }',

    generateElements(floorIndex, floor) {
        const elements = [], pt = createPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Counter first
        const cx = 280 + Math.random() * 200;
        const target = 2 + Math.floor(Math.random() * (floorIndex >= 6 ? 3 : 2));
        elements.push({ type: 'variable', subType: 'counter', x: cx, y: gy - 5, w: 36, h: 12, current: 0, target });
        pt.add(cx, gy - 5, 36, 12);

        // Obstacles avoid counter
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(floorIndex / 3);
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.4) {
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

    handleInteraction(player, element) {
        if (element.subType === 'counter' && element.current < element.target &&
            (keys['arrowdown'] || keys['s'])) {
            if (element._lastPress && Date.now() - element._lastPress < 300) return null;
            element._lastPress = Date.now();
            element.current++;
            if (element.current >= element.target) return { unlockGate: true, bounce: -4 };
            return { bounce: -4, warpX: 220 };
        }
        return null;
    }
});
