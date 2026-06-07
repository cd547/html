// ═══════════════════════════════════════════════════════════════
// LEVEL EDITOR — 楼层场景编辑器
// ═══════════════════════════════════════════════════════════════

let editorActive = false;
let selectedTool = 'platform';
let selectedElement = null;
let editorFloor = null;

// 工具类型定义
const EDITOR_TOOLS = [
    { id: 'platform', name: '平台', color: '#888888' },
    { id: 'variable', name: '变量', color: '#00ff00' },
    { id: 'gate', name: '大门', color: '#ff0000' },
    { id: 'portal', name: '传送门', color: '#33aaff' },
    { id: 'bug', name: 'Bug', color: '#ff6600' },
    { id: 'exit', name: '出口', color: '#00ffff' },
    { id: 'delete', name: '删除', color: '#666666' },
];

// 初始化编辑器
function initLevelEditor() {
    // 创建编辑器容器
    const editorContainer = document.createElement('div');
    editorContainer.id = 'level-editor';
    editorContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: none;
        flex-direction: column;
    `;
    
    // 顶部工具栏
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        display: flex;
        align-items: center;
        padding: 10px 20px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
        gap: 10px;
    `;
    
    // 工具按钮
    EDITOR_TOOLS.forEach(tool => {
        const btn = document.createElement('button');
        btn.textContent = tool.name;
        btn.style.cssText = `
            padding: 8px 16px;
            background: #2a2a2a;
            border: 2px solid ${tool.color};
            color: ${tool.color};
            cursor: pointer;
            font-family: monospace;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        btn.addEventListener('click', () => selectTool(tool.id));
        toolbar.appendChild(btn);
    });
    
    // 分隔符
    const sep = document.createElement('div');
    sep.style.width = '2px';
    sep.style.height = '30px';
    sep.style.background = '#333';
    toolbar.appendChild(sep);
    
    // 操作按钮
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存场景';
    saveBtn.style.cssText = `
        padding: 8px 16px;
        background: #008800;
        border: 2px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
    `;
    saveBtn.addEventListener('click', saveCurrentScene);
    toolbar.appendChild(saveBtn);
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = '加载场景';
    loadBtn.style.cssText = `
        padding: 8px 16px;
        background: #0066aa;
        border: 2px solid #33aaff;
        color: #3333ff;
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
    `;
    loadBtn.addEventListener('click', loadScene);
    toolbar.appendChild(loadBtn);
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空';
    clearBtn.style.cssText = `
        padding: 8px 16px;
        background: #444;
        border: 2px solid #666;
        color: #aaa;
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
    `;
    clearBtn.addEventListener('click', clearEditor);
    toolbar.appendChild(clearBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = `
        padding: 8px 16px;
        background: #440000;
        border: 2px solid #ff0000;
        color: #ff0000;
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
        margin-left: auto;
    `;
    closeBtn.addEventListener('click', closeEditor);
    toolbar.appendChild(closeBtn);
    
    // 编辑画布区域
    const editorCanvas = document.createElement('canvas');
    editorCanvas.id = 'level-editor-canvas';
    editorCanvas.width = 700;
    editorCanvas.height = 500;
    editorCanvas.style.cssText = `
        margin: 20px auto;
        background: #0a0a0a;
        border: 1px solid #333;
        display: block;
        cursor: crosshair;
    `;
    editorCanvas.addEventListener('click', handleCanvasClick);
    editorCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    
    // 底部信息栏
    const statusBar = document.createElement('div');
    statusBar.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 10px 20px;
        background: #1a1a1a;
        border-top: 1px solid #333;
        color: #888;
        font-family: monospace;
        font-size: 12px;
    `;
    statusBar.id = 'editor-status';
    statusBar.textContent = '点击画布放置元素 | 当前工具: 平台';
    
    editorContainer.appendChild(toolbar);
    editorContainer.appendChild(editorCanvas);
    editorContainer.appendChild(statusBar);
    document.body.appendChild(editorContainer);
    
    // 添加键盘快捷键
    document.addEventListener('keydown', e => {
        if (editorActive && e.key === 'Escape') {
            closeEditor();
        }
    });
}

// 选择工具
function selectTool(toolId) {
    selectedTool = toolId;
    selectedElement = null;
    updateStatus(`当前工具: ${EDITOR_TOOLS.find(t => t.id === toolId)?.name || toolId}`);
}

// 处理画布点击
function handleCanvasClick(e) {
    const canvas = document.getElementById('level-editor-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!editorFloor) {
        initEditorFloor();
    }
    
    if (selectedTool === 'delete') {
        // 删除元素
        editorFloor.elements = editorFloor.elements.filter(el => {
            return !(x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h);
        });
    } else {
        // 放置元素
        const newElement = createElement(selectedTool, x, y);
        if (newElement) {
            editorFloor.elements.push(newElement);
        }
    }
    
    redrawEditor();
}

// 处理鼠标移动
function handleCanvasMouseMove(e) {
    const canvas = document.getElementById('level-editor-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    updateStatus(`位置: (${Math.floor(x)}, ${Math.floor(y)}) | 当前工具: ${EDITOR_TOOLS.find(t => t.id === selectedTool)?.name || selectedTool}`);
}

// 创建元素
function createElement(type, x, y) {
    const snap = 10;
    x = Math.floor(x / snap) * snap;
    y = Math.floor(y / snap) * snap;
    
    switch (type) {
        case 'platform':
            return { type: 'platform', x, y, w: 100, h: 10 };
        case 'variable':
            return { type: 'variable', subType: 'bool', x, y, w: 16, h: 16, active: true };
        case 'gate':
            return { type: 'gate', x, y, w: 30, h: 40, unlocked: false };
        case 'portal':
            // 成对创建传送门
            const portalId = Date.now();
            const el1 = { type: 'portal', portalId, x, y, w: 18, h: 22 };
            editorFloor.elements.push(el1);
            return { type: 'portal', portalId, x: x + 80, y: y + 50, w: 18, h: 22 };
        case 'bug':
            return { type: 'bug', x, y, w: 12, h: 12 };
        case 'exit':
            return { type: 'exit', x, y, w: 30, h: 40 };
        default:
            return null;
    }
}

// 初始化编辑楼层
function initEditorFloor() {
    editorFloor = {
        elements: [],
        groundY: 460,
        width: 700,
        height: 500
    };
    // 添加地面
    editorFloor.elements.push({ type: 'platform', x: 0, y: 460, w: 700, h: 40 });
}

// 重绘画布
function redrawEditor() {
    const canvas = document.getElementById('level-editor-canvas');
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    if (!editorFloor) return;
    
    // 绘制元素
    editorFloor.elements.forEach(el => {
        drawEditorElement(ctx, el);
    });
}

// 绘制单个元素（编辑器专用，避免与 draw-elements.js 冲突）
function drawEditorElement(ctx, el) {
    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    
    switch (el.type) {
        case 'platform':
            ctx.fillStyle = '#444';
            ctx.fillRect(el.x, el.y, el.w, el.h);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(el.x, el.y, el.w, el.h);
            break;
            
        case 'variable':
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(el.x + el.w/2, el.y + el.h/2, el.w/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00ff00';
            ctx.stroke();
            break;
            
        case 'gate':
            ctx.fillStyle = el.unlocked ? '#333' : '#800';
            ctx.fillRect(el.x, el.y, el.w, el.h);
            ctx.strokeStyle = el.unlocked ? '#0f0' : '#f00';
            ctx.setLineDash(el.unlocked ? [5, 5] : []);
            ctx.strokeRect(el.x, el.y, el.w, el.h);
            ctx.setLineDash([]);
            break;
            
        case 'portal':
            ctx.fillStyle = '#1144aa';
            ctx.fillRect(el.x, el.y, el.w, el.h);
            ctx.strokeStyle = '#33aaff';
            ctx.strokeRect(el.x, el.y, el.w, el.h);
            // 传送门特效
            ctx.fillStyle = '#33aaff';
            ctx.fillRect(el.x + 4, el.y + 4, el.w - 8, el.h - 8);
            break;
            
        case 'bug':
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(el.x + el.w/2, el.y);
            ctx.lineTo(el.x + el.w, el.y + el.h);
            ctx.lineTo(el.x, el.y + el.h);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'exit':
            ctx.fillStyle = '#004444';
            ctx.fillRect(el.x, el.y, el.w, el.h);
            ctx.strokeStyle = '#00ffff';
            ctx.strokeRect(el.x, el.y, el.w, el.h);
            ctx.fillStyle = '#00ffff';
            ctx.font = '10px monospace';
            ctx.fillText('return', el.x + 5, el.y + 20);
            break;
    }
}

// 更新状态栏
function updateStatus(text) {
    const statusBar = document.getElementById('editor-status');
    if (statusBar) {
        statusBar.textContent = text;
    }
}

// 保存当前场景
function saveCurrentScene() {
    if (!editorFloor) {
        alert('请先创建场景！');
        return;
    }
    
    const sceneData = JSON.stringify({
        elements: editorFloor.elements,
        timestamp: Date.now()
    }, null, 2);
    
    // 创建下载链接
    const blob = new Blob([sceneData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-scene-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('场景已保存！');
}

// 加载场景
function loadScene() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.elements) {
                    editorFloor = {
                        elements: data.elements,
                        groundY: 460,
                        width: 700,
                        height: 500
                    };
                    redrawEditor();
                    alert('场景加载成功！');
                }
            } catch (err) {
                alert('加载失败：无效的场景文件');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 清空编辑器
function clearEditor() {
    if (confirm('确定要清空所有元素吗？')) {
        initEditorFloor();
        redrawEditor();
    }
}

// 打开编辑器
function openEditor() {
    const editor = document.getElementById('level-editor');
    if (editor) {
        editor.style.display = 'flex';
        editorActive = true;
        initEditorFloor();
        redrawEditor();
    }
}

// 关闭编辑器
function closeEditor() {
    const editor = document.getElementById('level-editor');
    if (editor) {
        editor.style.display = 'none';
        editorActive = false;
    }
}

// 应用场景到游戏
function applySceneToGame() {
    if (!editorFloor || editorFloor.elements.length === 0) {
        alert('请先创建场景！');
        return;
    }
    
    // 创建自定义楼层
    const customFloor = {
        index: state.currentFloor,
        elements: editorFloor.elements.map(el => ({ ...el })),
        height: editorFloor.height,
        groundY: editorFloor.groundY,
        gameplayId: 'custom',
        codeText: '// Custom Level'
    };
    
    // 替换当前楼层
    state.floors[state.currentFloor] = customFloor;
    
    // 重置玩家位置
    const startPos = editorFloor.elements.find(el => el.type === 'exit');
    if (startPos) {
        player.x = 50;
        player.y = editorFloor.groundY - 24;
        player.vx = 0;
        player.vy = 0;
    }
    
    closeEditor();
    alert('场景已应用到游戏！');
}

// 导出函数供外部调用
window.openLevelEditor = openEditor;