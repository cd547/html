// ═══════════════════════════════════════════════════════════════
// SWITCH/CASE — 多钥匙收集
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'switch', name: 'SWITCH-statement', minFloor: 2, weight: 1.2,
    codeText: 'switch(status) { case 0: case 1: case 2: return OK; }',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // 3 keys first
        const positions = [
            { x: 160 + Math.random() * 100, y: gy - 14 },
            { x: 320 + Math.random() * 100, y: 48 + Math.random() * 10 },
            { x: 480 + Math.random() * 100, y: gy - 14 }
        ];
        positions.forEach((pos, idx) => {
            elements.push({ type: 'variable', subType: 'caseKey', x: pos.x, y: pos.y, w: 14, h: 14, keyIndex: idx, active: true });
            pt.add(pos.x, pos.y, 14, 14);
            if (pos.y < gy - 20) {
                const platform = { type: 'platform', x: pos.x - 18, y: pos.y + 20, w: 50, h: 10 };
                // 检查是否与已有元素重叠
                if (!pt.overlaps(platform.x, platform.y, platform.w, platform.h)) {
                    elements.push(platform);
                    pt.add(platform.x, platform.y, platform.w, platform.h);
                }
            }
        });

        // Obstacles away from keys (reduced count)
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

    handleInteraction(p, el, floor) {
        if (el.subType === 'caseKey' && el.active) {
            el.active = false;
            const allDone = floor.elements.filter(e => e.subType === 'caseKey').every(e => !e.active);
            if (allDone) return { unlockGate: true };
            return { bounce: -3 };
        }
        return null;
    },

    drawElement(ctx, el, esy) {
        if (el.subType === 'caseKey' && el.active) {
            ctx.fillStyle = '#ffcc00'; ctx.fillRect(el.x, esy, el.w, el.h);
            ctx.fillStyle = '#000'; ctx.font = 'bold 9px "Courier New"';
            ctx.fillText(el.keyIndex, el.x + 4, esy + 11);
            return true;
        }
        return false;
    },

    checkWinCondition(p, floor) {
        // 必须收集所有case钥匙才能过关
        const caseKeys = floor.elements.filter(e => e.subType === 'caseKey');
        return caseKeys.length > 0 && caseKeys.every(e => !e.active);
    }
});
