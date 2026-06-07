// ═══════════════════════════════════════════════════════════════
// FOR LOOP — 循环计数器（按 ↓ 触发）
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'for', name: 'FOR-loop', minFloor: 0,
    codeText: 'for (int i = [COUNT]; i < [TARGET]; i++) { DeadLoop(); }',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Counter first
        const cx = 280 + Math.random() * 200;
        const target = 2 + Math.floor(Math.random() * (floorIndex >= 6 ? 3 : 2));
        elements.push({ type: 'variable', subType: 'counter', x: cx, y: gy - 5, w: 36, h: 12, current: 0, target });
        pt.add(cx, gy - 5, 36, 12);

        // Obstacles avoid counter (reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.4) {
                const ox = pt.tryPlaceX(20, 130, 610, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: ox, y: gy - 16, w: 20, h: 16 });
                pt.add(ox, gy - 16, 20, 16);
            } else {
                const platform = createPlatform(pt, 45, 80, 55, 80, 60, 610, 15);
                if (platform) {
                    elements.push(platform);
                    pt.add(platform.x, platform.y, platform.w, platform.h);
                }
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
    },

    checkWinCondition(p, floor) {
        // 计数器必须达到目标值才能过关
        const counter = floor.elements.find(e => e.subType === 'counter');
        return counter && counter.current >= counter.target;
    }
});
