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
                const ox = pt.tryPlaceX(20, 130, 530, gy - 16, 16, 18);
                elements.push({ type: 'bug', x: ox, y: gy - 16, w: 20, h: 16 });
                pt.add(ox, gy - 16, 20, 16);
            } else {
                const platform = createPlatform(pt, 45, 80, 55, 80, 60, 530, 15);
                if (platform) {
                    elements.push(platform);
                    pt.add(platform.x, platform.y, platform.w, platform.h);
                }
            }
        }

        // Two branches at right side — one correct, one wrong (increased spacing)
        const branchX = 550;
        const correctBranch = Math.random() > 0.5 ? 'top' : 'bottom';
        // 增加两个平台之间的垂直间距（从30px增加到60px）
        const platform1 = { type: 'platform', x: branchX, y: 55, w: 80, h: 10 };
        const platform2 = { type: 'platform', x: branchX, y: 115, w: 80, h: 10 };
        
        // 先检查是否与已有元素重叠
        if (!pt.overlaps(platform1.x, platform1.y, platform1.w, platform1.h)) {
            elements.push(platform1);
            pt.add(platform1.x, platform1.y, platform1.w, platform1.h);
        }
        if (!pt.overlaps(platform2.x, platform2.y, platform2.w, platform2.h)) {
            elements.push(platform2);
            pt.add(platform2.x, platform2.y, platform2.w, platform2.h);
        }

        if (correctBranch === 'top') {
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 39, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 55, w: 80, h: 26, color: '#00ff66' });
            elements.push({ type: 'bug', x: branchX + 30, y: 99, w: 20, h: 16 });  // wrong branch — intentional
        } else {
            elements.push({ type: 'bug', x: branchX + 30, y: 39, w: 20, h: 16 });  // wrong branch — intentional
            elements.push({ type: 'variable', subType: 'bool', x: branchX + 32, y: 99, w: 16, h: 16, active: true });
            elements.push({ type: 'decoration', subType: 'glow', x: branchX, y: 115, w: 80, h: 26, color: '#00ff66' });
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
