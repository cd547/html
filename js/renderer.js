// ═══════════════════════════════════════════════════════════════
// RENDERER — All canvas drawing: background, floors, player, UI
// ═══════════════════════════════════════════════════════════════

const ctx = canvas.getContext('2d');

// ── Draw a single floor at its screen position ────────────
function drawFloor(floor, screenTopY) {
    const isCurrent   = floor.index === state.currentFloor;
    const isCompleted = floor.completed;
    const isAbove     = floor.index > state.currentFloor;

    const fh = floor.height || FLOOR_HEIGHT;

    // Floor background tint .................................
    if (isCompleted) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.03)';
        ctx.fillRect(0, screenTopY, GAME_W, fh);  // 只在游戏区域绘制
    } else if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(0, screenTopY, GAME_W, fh);  // 只在游戏区域绘制
    }

    // Floor separator (dotted line above) ...................
    if (floor.index > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(20, screenTopY);
        ctx.lineTo(GAME_W - 20, screenTopY);  // 只在游戏区域绘制
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Line number gutter (code editor style) .................
    const lineNum = String(floor.index + 1);
    ctx.fillStyle = isCurrent ? '#00ff66'
                  : (isCompleted ? '#004422' : '#2a2a2a');
    ctx.font = '10px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(lineNum, 25, screenTopY + 27);
    ctx.textAlign = 'left';

    // Floor label ...........................................
    const statusIcon  = isCompleted ? '[X]' : (isCurrent ? '[>]' : '[ ]');
    const labelColor  = isCompleted ? '#006633' : (isCurrent ? '#ffffff' : '#444444');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px "Courier New"';
    const gpName = (floor.gameplay && floor.gameplay.name) || floor.type || '???';
    ctx.fillText(`${statusIcon} // L${floor.index}: ${gpName}`, 35, screenTopY + 14);

    // Code text .............................................
    let displayText = floor.codeText || '';
    // Replace placeholders for any gameplay type that uses them
    const counter = floor.elements.find(e => e.subType === 'counter');
    if (counter) {
        displayText = displayText.replace('[COUNT]', counter.current).replace('[TARGET]', counter.target);
    }
    const codeAlpha = isAbove ? 0.35 : (isCompleted ? 0.5 : 1.0);
    ctx.fillStyle = isCompleted ? '#666666' : '#e0e0e0';
    ctx.globalAlpha = codeAlpha;
    ctx.font = '12px "Courier New"';
    ctx.fillText(`  ${displayText}`, 35, screenTopY + 28);
    ctx.globalAlpha = 1.0;

    // Ground line ...........................................
    const groundY = floor.groundY || FLOOR_GROUND_LOCAL;
    const groundScreenY = screenTopY + groundY;
    ctx.strokeStyle = isCompleted ? '#1a3a1a' : (isCurrent ? '#ffffff' : '#333333');
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, groundScreenY);
    ctx.lineTo(CANVAS_W, groundScreenY);
    ctx.stroke();

    // Ground block ..........................................
    ctx.fillStyle = isCompleted ? '#0a1a0a' : '#1a1a1a';
    ctx.fillRect(0, groundScreenY, CANVAS_W, GROUND_BLOCK_H);
    
    // Shadow line for bottommost floor (ground level)
    // 如果是最底层，添加阴影线表示坚实地面
    if (floor.index === state.floors.length - 1 || 
        (floor.index + 1 < state.floors.length && 
         getFloorScreenTop(floor.index + 1) > CANVAS_H)) {
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, groundScreenY + GROUND_BLOCK_H);
        ctx.lineTo(CANVAS_W, groundScreenY + GROUND_BLOCK_H);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Only draw interactive elements for current & completed floors
    if (isAbove && !isCompleted) return;

    // 检查所有玩法是否都满足胜利条件（组合玩法需要全部完成）- 提前计算
    let allGameplaysCompleted = floor.completed;
    if (!allGameplaysCompleted && floor.gameplays && floor.gameplays.length > 0) {
        allGameplaysCompleted = floor.gameplays.every(gpItem => {
            if (gpItem.checkWinCondition) {
                const p = state.player;
                return gpItem.checkWinCondition(p, floor);
            }
            return true;
        });
    }

    // Elements ..............................................
    const gp = floor.gameplay;
    const gameplays = floor.gameplays || [gp];  // 支持组合玩法
    const mods = floor.modifiers || [];
    floor.elements.forEach(el => {
        const esy = el.y + screenTopY;

        // 救援传送门：优先绘制（黄色脉冲效果）
        if (el.type === 'portal' && el.isRescue) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
            const alpha = 0.35 + pulse * 0.45;
            
            // 外层光晕
            ctx.fillStyle = `rgba(255, 204, 0, ${alpha * 0.3})`;
            ctx.fillRect(el.x - 4, esy - 4, el.w + 8, el.h + 8);
            
            // 主体框
            ctx.strokeStyle = `rgba(255, 204, 0, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(el.x, esy, el.w, el.h);
            
            // 内部填充
            ctx.fillStyle = `rgba(255, 204, 0, ${alpha * 0.4})`;
            ctx.fillRect(el.x + 2, esy + 2, el.w - 4, el.h - 4);
            
            // 标签
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.font = 'bold 7px "Courier New"';
            ctx.fillText('SOS', el.x + 2, esy + 14);
            return;  // 绘制完成，跳过后续逻辑
        }

        // Try modifier drawElement first, then all gameplays drawElement
        let drawn = false;
        for (const mod of mods) {
            if (mod.drawElement && mod.drawElement(ctx, el, esy, floor)) { drawn = true; break; }
        }
        // Check all gameplays for custom drawing (组合玩法)
        if (!drawn) {
            for (const gpItem of gameplays) {
                if (gpItem && gpItem.drawElement && gpItem.drawElement(ctx, el, esy, floor)) {
                    drawn = true;
                    break;
                }
            }
        }
        if (drawn) return;

        // 使用分离的元素绘制函数
        drawElement(ctx, el, esy, isCompleted, allGameplaysCompleted);
    });

    // 黄色救援传送门虚线关联
    const rescuePortals = floor.elements.filter(e => e.type === 'portal' && e.isRescue);
    if (rescuePortals.length >= 2) {
        // 按 portalId 分组配对
        const portalPairs = {};
        rescuePortals.forEach(p => {
            if (!portalPairs[p.portalId]) {
                portalPairs[p.portalId] = [];
            }
            portalPairs[p.portalId].push(p);
        });
        
        // 绘制每对传送门之间的虚线
        Object.values(portalPairs).forEach(pair => {
            if (pair.length === 2) {
                const p1 = pair[0], p2 = pair[1];
                ctx.strokeStyle = 'rgba(255, 204, 0, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                ctx.moveTo(p1.x + p1.w / 2, p1.y + screenTopY + p1.h / 2);
                ctx.lineTo(p2.x + p2.w / 2, p2.y + screenTopY + p2.h / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    }

    // Gate ...................................................
    // Check all gameplays for custom gate drawing (组合玩法)
    let gateDrawn = false;
    if (gameplays) {
        for (const gpItem of gameplays) {
            if (gpItem && gpItem.drawGate && gpItem.drawGate(ctx, floor, screenTopY, allGameplaysCompleted)) {
                gateDrawn = true;
                break;
            }
        }
    }
    if (!gateDrawn && gp && gp.drawGate) {
        gp.drawGate(ctx, floor, screenTopY, allGameplaysCompleted);
        gateDrawn = true;
    }
    if (!gateDrawn) {
        const gateScreenY = screenTopY + FLOOR_PLAY_TOP;
        const gateH = groundY - FLOOR_PLAY_TOP;
        if (!allGameplaysCompleted) {
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(floor.gateX, gateScreenY, 8, gateH);
            ctx.font = '10px "Courier New"';
            ctx.fillStyle = '#ff3333';
            ctx.fillText('COMPILER_ERR', floor.gateX - 42, gateScreenY - 4);
        } else {
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(floor.gateX, gateScreenY, 8, gateH);
            ctx.setLineDash([]);
        }
    }

    // return; portal — 传送门效果 ........................................
    const retX = floor.returnX != null ? floor.returnX : 730;
    // 门现在在楼层底部（地面上方）
    const retY = floor.returnY != null ? screenTopY + floor.returnY : screenTopY + groundY - 50;
    const retW = 40, retH = 50;
    
    // 只有所有玩法都完成时才显示绿色出口
    if (allGameplaysCompleted) {
        // 传送门脉冲效果
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
        const alpha = 0.35 + pulse * 0.45;
        
        // 外层光晕
        ctx.fillStyle = `rgba(0, 255, 102, ${alpha * 0.2})`;
        ctx.fillRect(retX - 6, retY - 6, retW + 12, retH + 12);
        
        // 主体框
        ctx.strokeStyle = `rgba(0, 255, 102, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(retX, retY, retW, retH);
        
        // 内部填充
        ctx.fillStyle = `rgba(0, 255, 102, ${alpha * 0.15})`;
        ctx.fillRect(retX + 2, retY + 2, retW - 4, retH - 4);
        
        // 扫描线效果
        const scanY = retY + (Date.now() * 0.05 % retH);
        ctx.strokeStyle = `rgba(0, 255, 102, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(retX, scanY);
        ctx.lineTo(retX + retW, scanY);
        ctx.stroke();
        
        // 标签
        ctx.fillStyle = '#00ff66';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText("return;", retX - 5, retY - 6);
    } else {
        // 未解锁状态：暗淡的红色
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(retX, retY, retW, retH);
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 51, 51, 0.5)';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText("return;", retX - 5, retY - 6);
    }
}

// ── Draw player on current floor ──────────────────────────
function drawPlayer() {
    const curFloor = state.floors[state.currentFloor];
    if (!curFloor) return;

    const screenTopY = getFloorScreenTop(curFloor.index);
    const p = state.player;
    const psx = p.x;
    const psy = p.y + screenTopY;

    // Trail (motion blur with proper fade)
    const trailLength = p.trail.length;
    p.trail.forEach((t, i) => {
        // Fade from faint to clearer (older to newer)
        const alpha = 0.06 + (i / trailLength) * 0.12;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        // Slight vertical offset to simulate motion blur
        ctx.fillRect(t.x, t.y + screenTopY + (i * 0.5), p.w, p.h);
    });

    // Self-heal: rebuild cursor sprite if data went missing
    if (!p.spriteData || !p.spriteData.length) {
        p.spriteData = buildCursorSprite();
        p.spriteIsCustom = false;
    }

    // ── Pixel sprite rendering ──────────────────────────
    const PW = 16, PH = 24;
    const data = p.spriteData;
    const flip = p.facing === -1;

    // Blinking cursor: visibility toggle ~500ms on/off (classic terminal)
    if (!p.spriteIsCustom) {
        const visible = Math.floor(Date.now() / 530) % 2 === 0;
        if (!visible) return;
    }

    for (let i = 0; i < data.length; i++) {
        const color = data[i];
        if (!color) continue;
        const col = i % PW;
        const row = Math.floor(i / PW);
        const sx = flip ? (PW - 1 - col) : col;
        ctx.fillStyle = color;
        ctx.fillRect(psx + sx, psy + row, 1, 1);
    }

    ctx.globalAlpha = 1.0;
}

// ── Draw and update particles (screen-space) ──────────────
function drawParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

// ── Draw crash overlay ────────────────────────────────────
function drawCrashOverlay() {
    const isOverflow = state.crashReason === 'overflow';
    ctx.fillStyle = 'rgba(12, 12, 12, 0.92)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = isOverflow ? '#ff6600' : '#ff3333';
    ctx.font = '24px "Courier New"';
    ctx.fillText(isOverflow
        ? '[!] STACK OVERFLOW: HEAP EXHAUSTED'
        : '[!] RUNTIME_ERROR: SEGMENTATION FAULT', 130, 220);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New"';
    ctx.fillText(isOverflow
        ? `Memory leak at ${state.ramMax}MB. GC failed. Floor ${state.currentFloor}.`
        : `Pointer out of bounds. App crashed on Floor ${state.currentFloor}.`, 180, 270);
    ctx.fillText(`Total lines executed: ${state.linesExecuted}.`, 240, 300);
    ctx.fillStyle = '#666666';
    ctx.fillText(`Press [ R ] to re-compile current floor.`, 240, 340);
}

// ── Modifier UI — let each modifier draw its UI element ──
function drawModifierUI() {
    const floor = state.floors[state.currentFloor];
    if (!floor) return;
    (floor.modifiers || []).forEach(mod => {
        if (mod.drawUI) mod.drawUI(ctx);
    });
}

// ── Scrollbar — right edge of canvas ─────────────────────
// ── Scrollbar geometry ──────────────────────────────────
function getScrollbarGeo() {
    const totalFloors = state.floors.length;
    // Compute total world height from actual floor heights
    let totalH = 0;
    for (let i = 0; i < totalFloors; i++) {
        totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    // 滚动条在代码面板右侧边缘
    const trackX = CANVAS_W - 8, trackY = 2, trackW = 6, trackH = CANVAS_H - 4;
    const maxScroll = Math.max(1, totalH - CANVAS_H);
    const visibleRatio = CANVAS_H / (totalH + CANVAS_H);
    const thumbH = Math.max(20, visibleRatio * trackH);
    const scrollRatio = state.scrollY / maxScroll;
    const thumbY = trackY + scrollRatio * (trackH - thumbH);
    return { totalFloors, trackX, trackY, trackW, trackH, maxScroll, thumbH, thumbY, visible: totalFloors > 0 };
}

// ── Scrollbar mouse → scroll conversion ──────────────────
function scrollbarMouseToY(my) {
    // 计算总内容高度
    let totalH = 0;
    for (let i = 0; i < state.floors.length; i++) {
        totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    
    if (totalH <= CANVAS_H) return;
    
    const visibleRatio = CANVAS_H / totalH;
    const sliderH = Math.max(30, visibleRatio * CANVAS_H);
    const ratio = Math.max(0, Math.min(1, my / (CANVAS_H - sliderH)));
    const maxScroll = Math.max(1, totalH - CANVAS_H);
    
    // Set both directly for instant response — no lerp lag
    state.scrollY = state.targetScrollY = ratio * maxScroll;
}

// ── Scrollbar interaction state ──────────────────────────
let sbDragging = false;

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    
    // 检查是否点击在代码面板区域
    const panelX = GAME_W;
    const panelW = CODE_PANEL_W;
    
    if (mx >= panelX && mx <= panelX + panelW && my >= 0 && my <= CANVAS_H) {
        // 计算滑块位置
        let totalH = 0;
        for (let i = 0; i < state.floors.length; i++) {
            totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
        }
        
        if (totalH > CANVAS_H) {
            const visibleRatio = CANVAS_H / totalH;
            const sliderH = Math.max(30, visibleRatio * CANVAS_H);
            const scrollRatio = state.scrollY / Math.max(1, totalH - CANVAS_H);
            const sliderY = scrollRatio * (CANVAS_H - sliderH);
            
            // 检查是否点击在滑块上
            if (my >= sliderY && my <= sliderY + sliderH) {
                sbDragging = true;
                e.preventDefault();
            } else {
                // 点击滑块外的区域，直接跳转到对应位置
                sbDragging = true;
                scrollbarMouseToY(my - sliderH / 2);
                e.preventDefault();
            }
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!sbDragging) return;
    const rect = canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    
    // 计算滑块高度
    let totalH = 0;
    for (let i = 0; i < state.floors.length; i++) {
        totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    
    if (totalH > CANVAS_H) {
        const visibleRatio = CANVAS_H / totalH;
        const sliderH = Math.max(30, visibleRatio * CANVAS_H);
        const ratio = Math.max(0, Math.min(1, (my - sliderH / 2) / (CANVAS_H - sliderH)));
        const maxScroll = Math.max(1, totalH - CANVAS_H);
        state.scrollY = state.targetScrollY = ratio * maxScroll;
    }
});

canvas.addEventListener('mouseup', () => { sbDragging = false; });
canvas.addEventListener('mouseleave', () => { sbDragging = false; });

// ── Code panel — 显示所有楼层的代码略图（带VSCode风格滚动条） ──────────────────
function drawCodePanel() {
    const panelX = GAME_W;  // 面板起始X坐标
    const panelW = CODE_PANEL_W;  // 代码面板宽度（包含滚动条）
    
    // 面板背景
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(panelX, 0, panelW, CANVAS_H);
    
    // 面板左边框
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX, 0);
    ctx.lineTo(panelX, CANVAS_H);
    ctx.stroke();
    
    // 标题
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText('CODE', panelX + 10, 18);
    
    // 绘制每个楼层的代码略图
    let yOffset = 30;
    const lineHeight = 12;
    
    for (let i = 0; i < state.floors.length && yOffset < CANVAS_H - 20; i++) {
        const floor = state.floors[i];
        const isCurrent = floor.index === state.currentFloor;
        const isCompleted = floor.completed;
        
        // 楼层号
        ctx.fillStyle = isCurrent ? '#00ff66' : (isCompleted ? '#006633' : '#444444');
        ctx.font = 'bold 9px "Courier New"';
        ctx.fillText(`${i + 1}:`, panelX + 5, yOffset);
        
        // 代码文本（截断显示）
        const codeText = floor.codeText || '';
        const displayText = codeText.length > 12 ? codeText.substring(0, 12) + '...' : codeText;
        ctx.fillStyle = isCurrent ? '#ffffff' : (isCompleted ? '#00aa44' : '#666666');
        ctx.font = '8px "Courier New"';
        ctx.fillText(displayText, panelX + 25, yOffset);
        
        // 当前楼层指示器
        if (isCurrent) {
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(panelX + 2, yOffset - 8, 2, 10);
        }
        
        yOffset += lineHeight;
        
        // 如果代码有多行，显示更多行
        const codeLines = codeText.split('\n');
        for (let j = 1; j < codeLines.length && yOffset < CANVAS_H - 20; j++) {
            const lineText = codeLines[j].trim();
            if (lineText) {
                const displayLine = lineText.length > 14 ? lineText.substring(0, 14) + '...' : lineText;
                ctx.fillStyle = isCurrent ? '#aaaaaa' : '#444444';
                ctx.font = '7px "Courier New"';
                ctx.fillText('  ' + displayLine, panelX + 5, yOffset);
                yOffset += lineHeight - 2;
            }
        }
        
        yOffset += 4;  // 楼层之间的间距
    }
    
    // VSCode风格的滚动条滑块（半透明，覆盖整个面板宽度）
    // 计算总内容高度
    let totalH = 0;
    for (let i = 0; i < state.floors.length; i++) {
        totalH += (state.floors[i] && state.floors[i].height) || FLOOR_HEIGHT;
    }
    
    if (totalH > CANVAS_H) {
        const visibleRatio = CANVAS_H / totalH;
        const sliderH = Math.max(30, visibleRatio * CANVAS_H);
        const scrollRatio = state.scrollY / Math.max(1, totalH - CANVAS_H);
        const sliderY = scrollRatio * (CANVAS_H - sliderH);
        
        // 半透明滑块
        ctx.fillStyle = sbDragging ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(panelX, sliderY, panelW, sliderH);
        
        // 滑块边框（拖拽时更明显）
        if (sbDragging) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX, sliderY, panelW, sliderH);
        }
    }
}

// ── Draw scrollbar ──────────────────────────────────────
// 滚动条现在集成在代码面板中（VSCode风格），这里留空
function drawScrollbar() {
    // VSCode风格滚动条已在 drawCodePanel() 中实现
}

// ── MAIN DRAW — Full render pipeline ──────────────────────
function draw() {
    // Background fill .......................................
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Matrix rain (screen-space) ............................
    ctx.fillStyle = '#161616';
    ctx.font = '10px "Courier New"';
    state.matrixLines.forEach(line => {
        ctx.fillText(line.text, line.x, line.y);
        line.y += line.speed;
        if (line.y > CANVAS_H) { line.y = -10; line.x = Math.random() * CANVAS_W; }
    });

    // Subtle grid ...........................................
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Modifier UI (RAM bar etc.) ...........................
    drawModifierUI();

    // Draw all floors (bottom→top for proper overlap) ......
    // 现在楼层0在最上面，所以从后往前渲染（索引大的先画，在下面）
    for (let i = state.floors.length - 1; i >= 0; i--) {
        const screenTopY = getFloorScreenTop(i);
        const fh2 = state.floors[i].height || FLOOR_HEIGHT;
        if (screenTopY + fh2 < 0 || screenTopY > CANVAS_H) continue;
        drawFloor(state.floors[i], screenTopY);
    }

    // Code panel (right side) ................................
    drawCodePanel();

    // Player ................................................
    if (state.gameState !== 'CRASHED') {
        drawPlayer();
    }

    // Particles .............................................
    drawParticles();

    // Transition flash overlay ..............................
    if (state.flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(0, 255, 102, ${state.flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Crash screen ..........................................
    if (state.gameState === 'CRASHED') {
        drawCrashOverlay();
    }

    // Scrollbar (right edge) ...............................
    drawScrollbar();
}
