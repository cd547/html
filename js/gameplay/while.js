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
        // 使用统一的 placeAt 方法，自动处理所有检查
        const platform1 = pt.placeAt(bx - 18, ay + 26, 56, 10);
        if (platform1) {
            elements.push(platform1);
        }

        // Obstacles away from variable (reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.35) {
                // 使用 createBug 函数确保与蓝色/黄色元素保持安全距离
                const bug = createBug(pt, elements, 60, 610, gy - 16);
                if (bug) {
                    elements.push(bug);
                    pt.add(bug.x, bug.y, bug.w, bug.h);
                }
            } else {
                const platform = pt.placeRandom(45, 80, 55, 80, 60, 610);
                if (platform) {
                    elements.push(platform);
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
