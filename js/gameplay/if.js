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
            const platform = { type: 'platform', x: vx - 20, y: ay + 22, w: 56, h: 10 };
            // 检查是否与已有元素重叠
            if (!pt.overlaps(platform.x, platform.y, platform.w, platform.h)) {
                elements.push(platform);
                pt.add(platform.x, platform.y, platform.w, platform.h);
            }
        }

        // 2) Obstacles — skip if overlapping variable (reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.4) {
                const bx = pt.tryPlaceX(20, 130, 610, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: bx, y: gy - 16, w: 20, h: 16 });
                pt.add(bx, gy - 16, 20, 16);
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
        if (el.subType === 'bool' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    },

    checkWinCondition(p, floor) {
        // 必须解锁大门才能过关（收集bool变量）
        return floor.gateUnlocked === true;
    }
});
