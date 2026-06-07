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
        const minKeyGap = 40; // 钥匙之间的最小间距

        // 3 keys first
        const positions = [];
        for (let i = 0; i < 3; i++) {
            let attempts = 0;
            let validPosition = false;
            let pos = null;
            
            while (!validPosition && attempts < 20) {
                if (i === 0) {
                    pos = { x: 160 + Math.random() * 100, y: gy - 14 };
                } else if (i === 1) {
                    pos = { x: 320 + Math.random() * 100, y: 48 + Math.random() * 10 };
                } else {
                    pos = { x: 480 + Math.random() * 100, y: gy - 14 };
                }
                
                // 检查与已生成钥匙的间距
                validPosition = positions.every(existingPos => {
                    const distance = Math.sqrt(
                        Math.pow(pos.x - existingPos.x, 2) + 
                        Math.pow(pos.y - existingPos.y, 2)
                    );
                    return distance >= minKeyGap;
                });
                
                attempts++;
            }
            
            if (pos) {
                positions.push(pos);
            }
        }
        
        positions.forEach((pos, idx) => {
            elements.push({ type: 'variable', subType: 'caseKey', x: pos.x, y: pos.y, w: 14, h: 14, keyIndex: idx, active: true });
            pt.add(pos.x, pos.y, 14, 14);
            if (pos.y < gy - 20) {
                // 使用统一的 placeAt 方法，自动处理所有检查
                const platform = pt.placeAt(pos.x - 18, pos.y + 20, 50, 10);
                if (platform) {
                    elements.push(platform);
                }
            }
        });

        // Obstacles away from keys (reduced count)
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
