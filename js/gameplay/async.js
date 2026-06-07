// ═══════════════════════════════════════════════════════════════
// ASYNC/AWAIT — 异步计时门
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'async', name: 'ASYNC-await', minFloor: 4, weight: 1.0,
    codeText: 'await Task.Run(() => gate.Signal()); // timed unlock',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Token first
        const vx = 180 + Math.random() * 200;
        elements.push({ type: 'variable', subType: 'awaitToken', x: vx, y: gy - 16, w: 16, h: 16, active: true });
        pt.add(vx, gy - 16, 16, 16);

        // Obstacles (reduced count)
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
        if (el.subType === 'awaitToken' && el.active) {
            el.active = false; floor._asyncTimer = 0; floor._asyncGateOpen = false;
            return { bounce: -3 };
        }
        return null;
    },

    updateFloor(floor) {
        if (floor._asyncTimer === undefined) floor._asyncTimer = -1;
        if (floor._asyncTimer < 0) return;
        floor._asyncTimer++;
        const cycle = floor._asyncTimer % 100;
        floor._asyncGateOpen = cycle < 45;
        floor.gateUnlocked = floor._asyncGateOpen;
    },

    drawElement() { return false; },

    drawGate(ctx, floor, screenTopY, allCompleted) {
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;
        const gateScreenY = screenTopY + FLOOR_PLAY_TOP;
        const gateH = gy - FLOOR_PLAY_TOP, timerH = 6;
        ctx.fillStyle = '#222';
        ctx.fillRect(floor.gateX - 2, gateScreenY - timerH - 4, 12, timerH);
        if (floor._asyncTimer >= 0) {
            const progress = (floor._asyncTimer % 100) / 100;
            ctx.fillStyle = floor._asyncGateOpen ? '#00ff66' : '#ff3333';
            ctx.fillRect(floor.gateX - 2, gateScreenY - timerH - 4, 12 * (1 - progress), timerH);
        }
        // 使用 allCompleted 参数来决定大门是否解锁
        if (!allCompleted) {
            ctx.fillStyle = '#ff9900'; ctx.fillRect(floor.gateX, gateScreenY, 8, gateH);
            ctx.font = '10px "Courier New"'; ctx.fillStyle = '#ff9900';
            ctx.fillText('AWAIT...', floor.gateX - 35, gateScreenY - 8);
        } else {
            ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]); ctx.strokeRect(floor.gateX, gateScreenY, 8, gateH); ctx.setLineDash([]);
        }
        return true;  // 表示已自定义绘制
    },

    checkWinCondition(p, floor) {
        // 必须收集awaitToken才能开始计时，且等待计时完成后才能过关
        const token = floor.elements.find(e => e.subType === 'awaitToken');
        return token && !token.active && floor._asyncTimer >= 0 && floor.gateUnlocked;
    }
});
