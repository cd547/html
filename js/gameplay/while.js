// ═══════════════════════════════════════════════════════════════
// WHILE LOOP — 打破死循环
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'while', name: 'WHILE-loop', minFloor: 0,
    codeText: 'while (infinite_loop == true) { Yield(); // Break it! }',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Variable + platform first
        const bx = 200 + Math.random() * 250, ay = 48 + Math.random() * 10;
        elements.push({ type: 'variable', subType: 'break', x: bx, y: ay, w: 20, h: 20, active: true });
        pt.add(bx, ay, 20, 20);
        const platform1 = { type: 'platform', x: bx - 18, y: ay + 26, w: 56, h: 10 };
        // 检查是否与已有元素重叠
        if (!pt.overlaps(platform1.x, platform1.y, platform1.w, platform1.h)) {
            elements.push(platform1);
            pt.add(platform1.x, platform1.y, platform1.w, platform1.h);
        }

        // Obstacles away from variable (reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.35) {
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

    handleInteraction(p, el) {
        if (el.subType === 'break' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    },

    checkWinCondition(p, floor) {
        // 必须收集break变量才能过关
        return floor.gateUnlocked === true;
    }
});
