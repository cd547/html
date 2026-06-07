// ═══════════════════════════════════════════════════════════════
// SCENE MANAGER — 楼层场景存储和加载系统
// ═══════════════════════════════════════════════════════════════

const SCENE_STORAGE_KEY = 'codewalker_scenes';
let scenes = {};

// 初始化场景管理器
function initSceneManager() {
    // 从 localStorage 加载已保存的场景
    const saved = localStorage.getItem(SCENE_STORAGE_KEY);
    if (saved) {
        try {
            scenes = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load saved scenes:', e);
            scenes = {};
        }
    }
}

// 保存当前楼层场景
function saveCurrentFloorScene() {
    const currentFloor = state.floors[state.currentFloor];
    if (!currentFloor) {
        alert('当前没有楼层可保存！');
        return;
    }

    // 生成场景ID（使用时间戳）
    const sceneId = Date.now().toString();
    const sceneNumber = Object.keys(scenes).length + 1;

    // 保存 gameplay ID 而不是整个对象（函数无法序列化）
    const gameplayId = currentFloor.gameplay ? currentFloor.gameplay.id : null;
    
    // 保存 modifiers 的 ID 和状态（函数无法序列化）
    const modifiersData = (currentFloor.modifiers || []).map(mod => ({
        id: mod.id,
        name: mod.name,
        // 保存运行时状态
        active: mod.active,
        ramUsage: mod.ramUsage
    }));

    // 创建场景对象 - 保存所有楼层属性
    const scene = {
        id: sceneId,
        number: sceneNumber,
        name: `楼层 ${sceneNumber} - ${new Date().toLocaleString()}`,
        floorIndex: state.currentFloor,
        // 楼层完整状态
        index: currentFloor.index,
        gameplayId: gameplayId,
        modifiers: modifiersData,
        gateX: currentFloor.gateX,
        gateUnlocked: currentFloor.gateUnlocked,
        elements: currentFloor.elements.map(el => ({ ...el })),
        codeText: currentFloor.codeText,
        completed: currentFloor.completed,
        returnX: currentFloor.returnX,
        returnY: currentFloor.returnY,
        height: currentFloor.height,
        groundY: currentFloor.groundY,
        createdAt: new Date().toISOString()
    };

    // 保存到内存
    scenes[sceneId] = scene;

    // 保存到 localStorage
    saveScenesToStorage();

    alert(`场景已保存！\n编号: ${sceneNumber}\n名称: ${scene.name}`);
}

// 保存场景到 localStorage
function saveScenesToStorage() {
    try {
        localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(scenes));
    } catch (e) {
        console.error('Failed to save scenes to localStorage:', e);
        alert('保存失败：存储空间不足');
    }
}

// 加载场景到当前楼层
function loadSceneToCurrentFloor(sceneId) {
    const scene = scenes[sceneId];
    if (!scene) {
        alert('场景不存在！');
        return;
    }

    // 替换当前楼层 - 恢复所有属性（除了索引）
    const currentFloor = state.floors[state.currentFloor];
    
    // 从 ID 重建 gameplay 对象
    if (scene.gameplayId && typeof GAMEPLAYS !== 'undefined') {
        currentFloor.gameplay = GAMEPLAYS.find(gp => gp.id === scene.gameplayId);
    }
    
    // 从 ID 重建 modifiers 对象
    if (scene.modifiers && scene.modifiers.length > 0 && typeof MODIFIERS !== 'undefined') {
        currentFloor.modifiers = scene.modifiers.map(modData => {
            const modTemplate = MODIFIERS.find(m => m.id === modData.id);
            if (modTemplate) {
                // 合并模板和保存的状态
                return {
                    ...modTemplate,
                    active: modData.active,
                    ramUsage: modData.ramUsage
                };
            }
            return null;
        }).filter(m => m !== null);
    } else {
        currentFloor.modifiers = [];
    }
    
    // 恢复楼层属性（保持当前楼层索引不变）
    currentFloor.gateX = scene.gateX;
    currentFloor.gateUnlocked = scene.gateUnlocked;
    currentFloor.elements = scene.elements.map(el => ({ ...el }));
    currentFloor.codeText = scene.codeText || '// Loaded Scene';
    currentFloor.completed = scene.completed || false;
    currentFloor.returnX = scene.returnX;
    currentFloor.returnY = scene.returnY;
    currentFloor.height = scene.height;
    currentFloor.groundY = scene.groundY;

    // 重置玩家位置（从楼层顶部开始）
    state.player.x = 60;
    const ceilingY = (scene.height ? scene.height - FLOOR_GROUND_LOCAL + FLOOR_CEILING_LOCAL : FLOOR_CEILING_LOCAL);
    state.player.y = ceilingY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.isGrounded = false;

    alert(`场景已加载！\n${scene.name}`);
}

// 删除场景
function deleteScene(sceneId) {
    if (!scenes[sceneId]) {
        alert('场景不存在！');
        return;
    }

    if (confirm(`确定要删除场景 "${scenes[sceneId].name}" 吗？`)) {
        delete scenes[sceneId];
        saveScenesToStorage();
        alert('场景已删除！');
        return true;
    }
    return false;
}

// 导出所有场景为JSON文件
function exportScenesToFile() {
    if (Object.keys(scenes).length === 0) {
        alert('没有可导出的场景！');
        return;
    }

    const dataStr = JSON.stringify(scenes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codewalker-scenes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 从文件导入场景
function importScenesFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedScenes = JSON.parse(e.target.result);
            
            // 验证数据格式
            let validCount = 0;
            for (const [id, scene] of Object.entries(importedScenes)) {
                if (scene.elements && Array.isArray(scene.elements)) {
                    // 生成新的ID避免冲突
                    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    scenes[newId] = {
                        ...scene,
                        id: newId,
                        name: scene.name.replace('楼层', '导入楼层')
                    };
                    validCount++;
                }
            }
            
            saveScenesToStorage();
            alert(`成功导入 ${validCount} 个场景！`);
        } catch (err) {
            alert('导入失败：无效的JSON文件');
        }
    };
    reader.readAsText(file);
}

// 获取场景列表
function getSceneList() {
    return Object.values(scenes).sort((a, b) => b.number - a.number);
}

// 创建场景管理UI
function createSceneManagerUI() {
    // 创建模态框容器
    const modal = document.createElement('div');
    modal.id = 'scene-manager-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2000;
        display: none;
        justify-content: center;
        align-items: center;
    `;

    // 创建面板
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: #1a1a1a;
        border: 2px solid #00ff00;
        border-radius: 8px;
        width: 600px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    `;

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #0a0a0a;
        border-bottom: 1px solid #333;
        border-radius: 6px 6px 0 0;
    `;
    
    const title = document.createElement('span');
    title.textContent = '场景管理器';
    title.style.cssText = `
        color: #00ff00;
        font-family: monospace;
        font-size: 18px;
        font-weight: bold;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #ff0000;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
    `;
    closeBtn.onclick = () => closeSceneManager();
    
    header.appendChild(title);
    header.appendChild(closeBtn);

    // 操作按钮栏
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        display: flex;
        gap: 10px;
        padding: 15px 20px;
        border-bottom: 1px solid #333;
        flex-wrap: wrap;
    `;
    
    const saveBtn = createButton('💾 保存当前楼层', '#008800', '#00ff00', saveCurrentFloorScene);
    const exportBtn = createButton('📤 导出所有场景', '#0066aa', '#33aaff', exportScenesToFile);
    
    const importLabel = document.createElement('label');
    importLabel.textContent = '📥 导入场景';
    importLabel.style.cssText = `
        padding: 8px 16px;
        background: #006600;
        border: 2px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
        font-size: 14px;
    `;
    
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.onchange = (e) => {
        if (e.target.files[0]) {
            importScenesFromFile(e.target.files[0]);
        }
    };
    importLabel.appendChild(importInput);
    
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(exportBtn);
    toolbar.appendChild(importLabel);

    // 场景列表容器
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 15px 20px;
    `;
    listContainer.id = 'scene-list-container';

    // 底部信息栏
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 10px 20px;
        background: #0a0a0a;
        border-top: 1px solid #333;
        border-radius: 0 0 6px 6px;
        color: #888;
        font-family: monospace;
        font-size: 12px;
    `;
    footer.textContent = '提示: 点击"加载"将场景应用到当前楼层';

    panel.appendChild(header);
    panel.appendChild(toolbar);
    panel.appendChild(listContainer);
    panel.appendChild(footer);
    modal.appendChild(panel);

    document.body.appendChild(modal);

    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSceneManager();
        }
    });
}

// 创建按钮
function createButton(text, bgColor, borderColor, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        padding: 8px 16px;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        color: ${borderColor};
        cursor: pointer;
        font-family: monospace;
        border-radius: 4px;
        font-size: 14px;
        flex-shrink: 0;
    `;
    btn.onclick = onClick;
    return btn;
}

// 更新场景列表UI
function updateSceneList() {
    const container = document.getElementById('scene-list-container');
    if (!container) return;

    const sceneList = getSceneList();
    
    if (sceneList.length === 0) {
        container.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">暂无保存的场景</div>';
        return;
    }

    container.innerHTML = '';
    
    sceneList.forEach(scene => {
        const item = document.createElement('div');
        item.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const info = document.createElement('div');
        info.style.cssText = 'flex: 1;';
        
        const name = document.createElement('div');
        name.textContent = scene.name;
        name.style.cssText = `
            color: #00ff00;
            font-family: monospace;
            font-size: 14px;
            margin-bottom: 5px;
        `;
        
        const details = document.createElement('div');
        details.textContent = `元素数: ${scene.elements.length} | 原楼层: ${scene.floorIndex}`;
        details.style.cssText = `
            color: #888;
            font-family: monospace;
            font-size: 12px;
        `;
        
        info.appendChild(name);
        info.appendChild(details);
        
        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 8px;';
        
        const loadBtn = createButton('加载', '#006600', '#00ff00', () => {
            loadSceneToCurrentFloor(scene.id);
            closeSceneManager();
        });
        
        const deleteBtn = createButton('删除', '#660000', '#ff0000', () => {
            if (deleteScene(scene.id)) {
                updateSceneList();
            }
        });
        
        actions.appendChild(loadBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

// 打开场景管理器
function openSceneManager() {
    const modal = document.getElementById('scene-manager-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateSceneList();
    }
}

// 关闭场景管理器
function closeSceneManager() {
    const modal = document.getElementById('scene-manager-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 初始化
initSceneManager();
createSceneManagerUI();

// 导出函数供外部调用
window.openSceneManager = openSceneManager;
window.closeSceneManager = closeSceneManager;