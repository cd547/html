// ═══════════════════════════════════════════════════════════════
// MODIFIER: MEMORY LEAK — 内存泄漏（可叠加修饰器）
// ═══════════════════════════════════════════════════════════════
//
// 【机制说明】
//   这不是独立玩法，而是一个可以叠加在任意主玩法上的压力修饰器。
//   35% 几率出现在 3 层以上的楼层。进入楼层后：
//     · RAM 从 128MB 开始持续上涨（每帧 +0.22~0.5MB，楼层越高越快）
//     · 达到 1024MB → STACK OVERFLOW 崩溃，游戏结束
//     · 地图上散落绿色 "free" 药瓶，收集一个 -220MB
//
// 【视觉提示】
//   Header 栏会出现 RAM 进度条（绿→黄→红），超过 80% 时闪烁 ⚠ 警告。
//   绿色小瓶标注 "free" = free(ptr) 药瓶。
//   楼层标签追加 "// [MEMORY-LEAK]"。
//
// 【策略】
//   时间就是一切！你必须快速完成主玩法目标，同时顺路收集 free 药瓶。
//   不要贪心收集所有药瓶——够用就行，优先完成主目标。
registerModifier({
    id: 'memoryleak',
    name: 'MEMORY-LEAK',
    minFloor: 3,
    weight: 0.35,

    // Extra elements: free(ptr) potions — avoid existing elements
    generateExtras(floorIndex, floor, sharedPt) {
        const extras = [], pt = sharedPt || createEnhancedPlacementTracker();
        const gy = floor.groundY || FLOOR_GROUND_LOCAL;

        // Register already-placed elements so potions don't overlap
        (floor.elements || []).forEach(el => pt.add(el.x, el.y, el.w, el.h));

        const count = Math.floor(Math.random() * 2);  // Reduced: 0-1 potions (减少数量)
        for (let i = 0; i < count; i++) {
            const py = Math.random() > 0.5 ? gy - 14 : 50 + Math.random() * 20;
            const px = pt.tryPlaceX(14, 160, 600, py, 14, 15);
            extras.push({ type: 'variable', subType: 'freePtr', x: px, y: py, w: 14, h: 14, active: true });
            pt.add(px, py, 14, 14);
            if (py < gy - 20) {
                // 使用统一的 placeAt 方法，自动处理所有检查
                const platform = pt.placeAt(px - 18, py + 20, 50, 10);
                if (platform) {
                    extras.push(platform);
                }
            }
        }
        return extras;
    },

    // Per-frame: leak RAM + update header bar
    updateFloor(floor) {
        const rate = 0.22 + floor.index * 0.05;
        state.ramUsage += rate;

        // 每10关卡增加512MB内存上限，给玩家更多时间
        const baseRamMax = 1024;
        const bonusRam = Math.floor(floor.index / 10) * 512;
        state.ramMax = baseRamMax + bonusRam;

        // Update DOM header bar
        const display = document.getElementById('ram-display');
        const valueEl = document.getElementById('ram-value');
        const fillEl  = document.getElementById('ram-fill');
        if (!display || !valueEl || !fillEl) return;

        display.style.display = 'inline';
        const used = Math.floor(state.ramUsage);
        const ratio = state.ramUsage / state.ramMax;
        
        // 保持文本长度不变，避免 DOM 重排
        valueEl.textContent = String(used);

        // Color: green < 50% → yellow < 80% → red
        const warningEl = document.getElementById('ram-warning');
        if (ratio > 0.8) {
            valueEl.className = 'red';
            fillEl.style.background = '#ff3333';
            // 显示警告图标并闪烁
            if (warningEl) {
                warningEl.style.display = 'inline';
                warningEl.style.opacity = (Math.floor(Date.now() / 300) % 2 === 0) ? '1' : '0.3';
            }
        } else if (ratio > 0.5) {
            valueEl.className = '';
            valueEl.style.color = '#ffcc00';
            fillEl.style.background = '#ffcc00';
            if (warningEl) warningEl.style.display = 'none';
        } else {
            valueEl.className = 'green';
            fillEl.style.background = '#00ff66';
            if (warningEl) warningEl.style.display = 'none';
        }
        fillEl.style.width = Math.min(100, ratio * 100) + '%';
    },

    // Cleanup when leaving floor
    onDeactivate(floor) {
        const display = document.getElementById('ram-display');
        if (display) display.style.display = 'none';
    },

    // Handle free(ptr) potion collection (called from player.js via modifier interaction)
    handleInteraction(player, element, floor) {
        if (element.subType === 'freePtr' && element.active) {
            element.active = false;
            state.ramUsage = Math.max(0, state.ramUsage - 220);
            return { bounce: -3 };
        }
        return null;
    },

    // Custom draw for free(ptr) potions
    drawElement(ctx, el, esy, floor) {
        if (el.subType === 'freePtr' && el.active) {
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(el.x + 2, esy + 1, el.w - 4, el.h - 2);
            ctx.fillStyle = '#0c0c0c';
            ctx.font = 'bold 7px "Courier New"';
            ctx.fillText('free', el.x, esy + 11);
            return true;
        }
        // 已使用的 freePtr 不显示
        if (el.subType === 'freePtr' && !el.active) {
            return true;  // 返回 true 表示已处理，不绘制
        }
        return false;
    }
});
