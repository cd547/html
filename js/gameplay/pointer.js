// ═══════════════════════════════════════════════════════════════
// POINTER — 指针传送门（成对出现）
// ═══════════════════════════════════════════════════════════════
// …（说明略）
registerGameplay({
    id: 'pointer', name: 'POINTER-gate', minFloor: 2, weight: 1.1,
    floorHeightLevel: 2,
    codeText: 'void* ptr = &gate; *(ptr) = unlock; // deref → teleport',

    generateElements(floorIndex, floor, sharedPt) {
        const elements = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Bool variable first
        const vx = 200 + Math.random() * 200;
        elements.push({ type: 'variable', subType: 'bool', x: vx, y: gy - 16, w: 16, h: 16, active: true });
        pt.add(vx, gy - 16, 16, 16);

        // High platform + portals
        const platX = 620, platY = 42;
        const mainPlatform = { type: 'platform', x: platX, y: platY, w: 150, h: 10 };
        // 检查是否与已有元素重叠
        if (!pt.overlaps(mainPlatform.x, mainPlatform.y, mainPlatform.w, mainPlatform.h)) {
            elements.push(mainPlatform);
            pt.add(platX, platY, 150, 10);
        }

        const portalId = floorIndex * 100 + 1;
        elements.push({ type: 'portal', portalId, x: 540, y: gy - 22, w: 18, h: 22 });
        pt.add(540, gy - 22, 18, 22);
        // Portal above the platform, player will fall onto platform after teleport
        // Portal y: 20, height: 22, player height: 24
        // Player position after teleport: 20 + 22 - 24 = 18
        // Player bottom: 18 + 24 = 42 (exactly at platform top)
        elements.push({ type: 'portal', portalId, x: platX + 20, y: 20, w: 18, h: 22 });

        // Obstacles avoid variable + portals (reduced count)
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
        if (el.subType === 'bool' && el.active) { el.active = false; return { unlockGate: true }; }
        return null;
    },

    drawElement(ctx, el, esy) {
        if (el.type !== 'portal') return false;
        // 跳过救援传送门（由 renderer.js 绘制）
        if (el.isRescue) return false;
        
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006), alpha = 0.35 + pulse * 0.45;
        ctx.fillStyle = `rgba(51,170,255,${alpha*0.3})`; ctx.fillRect(el.x-4, esy-4, el.w+8, el.h+8);
        ctx.strokeStyle = `rgba(51,170,255,${alpha})`; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.strokeRect(el.x, esy, el.w, el.h);
        ctx.fillStyle = `rgba(51,170,255,${alpha*0.4})`; ctx.fillRect(el.x+2, esy+2, el.w-4, el.h-4);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.font = 'bold 7px "Courier New"';
        ctx.fillText('*ptr', el.x-1, esy+14);
        return true;
    },

    drawGate(ctx, floor, screenTopY) {
        const portals = floor.elements.filter(e => e.type === 'portal');
        if (portals.length < 2) return;
        const p1 = portals[0], p2 = portals[1];
        ctx.strokeStyle = 'rgba(51,170,255,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([4,6]);
        ctx.beginPath();
        ctx.moveTo(p1.x+p1.w/2, p1.y+screenTopY+p1.h/2);
        ctx.lineTo(p2.x+p2.w/2, p2.y+screenTopY+p2.h/2);
        ctx.stroke(); ctx.setLineDash([]);
    },

    setupFloor(floor) { floor.returnX = 700; floor.returnY = -8; },

    checkWinCondition(p, floor) {
        // pointer 玩法只需要玩家到达传送门位置即可
        // 位置检查由 player.js 的 atExit 统一处理
        return true;
    }
});
