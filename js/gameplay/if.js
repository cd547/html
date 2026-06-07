// ═══════════════════════════════════════════════════════════════
// IF STATEMENT — 条件判断
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'if', name: 'IF-statement', minFloor: 0,
    codeText: 'if (status == SUCCESS) { ExecuteNext(); } else { Blocked; }',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
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
            // 使用统一的 placeAt 方法，自动处理所有检查
            const platform = pt.placeAt(vx - 20, ay + 22, 56, 10);
            if (platform) {
                elements.push(platform);
            }
        }

        // 2) Obstacles — skip if overlapping variable (reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.4) {
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
        if (el.subType === 'bool' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    },

    checkWinCondition(p, floor) {
        // 必须解锁大门才能过关（收集bool变量）
        return floor.gateUnlocked === true;
    }
});
