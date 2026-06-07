// ═══════════════════════════════════════════════════════════════
// TERNARY — 二选一分叉路
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'ternary', name: 'TERNARY-operator', minFloor: 3, weight: 1.0,
    codeText: 'bool ok = (probe() == 1) ? Pass() : Crash();',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Obstacles on the main path (avoid branch area x:550-630, reduced count)
        const count = Math.floor(Math.random() * 2);  // 0-1 platforms max (减少数量)
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.35) {
                // 使用 createBug 函数确保与蓝色/黄色元素保持安全距离
                const bug = createBug(pt, elements, 60, 530, gy - 16);
                if (bug) {
                    elements.push(bug);
                    pt.add(bug.x, bug.y, bug.w, bug.h);
                }
            } else {
                const platform = pt.placeRandom(45, 80, 55, 80, 60, 530);
                if (platform) {
                    elements.push(platform);
                }
            }
        }

        // Two branches at right side — one correct, one wrong (increased spacing)
        const branchX = 550;
        const correctBranch = Math.random() > 0.5 ? 'top' : 'bottom';
        // 增加两个平台之间的垂直间距（确保玩家可以跳跃）
        // 使用统一的 placeAt 方法，自动处理所有检查
        const platform1 = pt.placeAt(branchX, 45, 80, 10, { isExitPlatform: true });
        const platform2 = pt.placeAt(branchX, 125, 80, 10, { isExitPlatform: true });
        
        if (platform1) elements.push(platform1);
        if (platform2) elements.push(platform2);

        if (correctBranch === 'top') {
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 29, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 45, w: 80, h: 26, color: '#00ff66' });
            elements.push({ type: 'bug', x: branchX + 30, y: 109, w: 20, h: 16 });  // wrong branch — intentional
        } else {
            elements.push({ type: 'bug', x: branchX + 30, y: 29, w: 20, h: 16 });  // wrong branch — intentional
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 109, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 125, w: 80, h: 26, color: '#00ff66' });
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
    },

    checkWinCondition(p, floor) {
        // 必须解锁大门才能过关（选择正确分支收集bool变量）
        return floor.gateUnlocked === true;
    }
});
