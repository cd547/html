/**
 * 基础元素绘制函数
 * 从 renderer.js 分离出来，职责单一
 */

// 绘制平台
function drawPlatform(ctx, el, screenY, isCompleted) {
    ctx.fillStyle = isCompleted ? '#555555' : '#ffffff';
    ctx.fillRect(el.x, screenY, el.w, el.h);
    
    // 移动平台指示器
    if (el.moveVx && !isCompleted) {
        ctx.fillStyle = 'rgba(0,255,102,0.3)';
        ctx.fillRect(el.moveMin, screenY + el.h - 2, el.moveMax - el.moveMin, 2);
    }
}

// 绘制 Bug（像素风格大便形状，3节，橙黄色）
function drawBug(ctx, el, screenY, isCompleted) {
    const cx = el.x + el.w / 2;
    const cy = screenY + el.h / 2;
    
    ctx.fillStyle = '#ff9933'; // 橙黄色
    
    // 底部大节
    ctx.fillRect(cx - 7, cy + 3, 14, 6);
    
    // 中间节
    ctx.fillRect(cx - 5, cy - 3, 10, 6);
    
    // 顶部小节
    ctx.fillRect(cx - 3, cy - 8, 6, 5);
    
    // 高光
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(cx - 2, cy - 7, 2, 2);
    
    // 巡逻范围指示器
    if (el.patrolVx && !isCompleted) {
        ctx.fillStyle = 'rgba(255,153,51,0.15)';
        ctx.fillRect(el.patrolMin, screenY + el.h, el.patrolMax - el.patrolMin, 2);
    }
}

// 绘制变量
function drawVariable(ctx, el, screenY, isCompleted, allGameplaysCompleted) {
    // 已收集的变量不显示
    if (el.active === false) return;
    
    if (el.subType === 'bool') {
        ctx.fillStyle = isCompleted ? '#006633' : '#00ff66';
        ctx.fillRect(el.x, screenY, el.w, el.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText("T", el.x + 4, screenY + 12);
    }
    else if (el.subType === 'break') {
        ctx.fillStyle = isCompleted ? '#006633' : '#00ff66';
        ctx.save();
        ctx.translate(el.x + el.w / 2, screenY + el.h / 2);
        ctx.rotate(Date.now() * 0.005);
        ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h);
        ctx.restore();
    }
    else if (el.subType === 'counter') {
        // 组合玩法：所有玩法都完成才显示绿色
        ctx.fillStyle = allGameplaysCompleted ? '#00ff66'
                      : (isCompleted ? '#555555' : '#ffffff');
        ctx.fillRect(el.x, screenY, el.w, el.h);
        ctx.font = '10px "Courier New"';
        ctx.fillStyle = '#666666';
        ctx.fillText(`i++ (${el.current}/${el.target})`, el.x - 15, screenY - 8);
    }
    else if (el.subType === 'awaitToken') {
        // await token：橙色方块
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(el.x, screenY, el.w, el.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 6px sans-serif';
        ctx.fillText('await', el.x - 8, screenY - 3);
    }
    // caseKey 和 freePtr 由各自的 gameplay/modifier drawElement 处理
}

// 统一绘制入口
function drawElement(ctx, el, screenY, isCompleted, allGameplaysCompleted) {
    if (el.type === 'decoration') return;
    
    switch (el.type) {
        case 'platform':
            drawPlatform(ctx, el, screenY, isCompleted);
            break;
        case 'bug':
            drawBug(ctx, el, screenY, isCompleted);
            break;
        case 'variable':
            drawVariable(ctx, el, screenY, isCompleted, allGameplaysCompleted);
            break;
    }
}
