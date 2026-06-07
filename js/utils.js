// ═══════════════════════════════════════════════════════════════
// UTILS — Collision detection, particles, placement helpers
// ═══════════════════════════════════════════════════════════════

// ── AABB intersection test ────────────────────────────────
function isColliding(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

// ── Safe zone overlap check ───────────────────────────────
function isInSafeZone(x, w) {
    for (const zone of SAFE_ZONES) {
        if (x < zone.x + zone.w && x + w > zone.x) return true;
    }
    return false;
}

// ── Placement tracker — prevents element overlap ──────────
// Usage: const pt = createPlacementTracker();
//        const x = pt.tryPlaceX(w, 130, 610);  // tries to find clear X
//        pt.add(x, y, w, h);                    // registers placed element
function createPlacementTracker() {
    const rects = [];
    return {
        rects,  // 暴露 rects 数组以便外部访问
        add(x, y, w, h, type) { rects.push({ x, y, w, h, type }); },
        overlaps(x, y, w, h, gap = 10) {
            const rx = x - gap, ry = y - gap, rw = w + gap * 2, rh = h + gap * 2;
            for (const r of rects) {
                if (rx < r.x + r.w && rx + rw > r.x && ry < r.y + r.h && ry + rh > r.y) return true;
            }
            return false;
        },
        tryPlaceX(w, minX, maxX, y, h, gap = 10) {
            for (let attempt = 0; attempt < 25; attempt++) {
                const cx = minX + Math.random() * (maxX - minX - w);
                if (!isInSafeZone(cx, w) && !this.overlaps(cx, y, w, h, gap)) return cx;
            }
            return minX + Math.random() * (maxX - minX - w);  // fallback
        }
    };
}

// ── Particle emitter ──────────────────────────────────────
function spawnParticles(x, y, color, count = 15) {
    // Reduce particle count to 60% of original
    const reducedCount = Math.floor(count * 0.6);
    
    for (let i = 0; i < reducedCount; i++) {
        state.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30 + Math.random() * 20,
            color
        });
    }
}

// ── Bug generator — prevents placement on blue/yellow elements ─
// Creates a bug with guaranteed safe distance from portals and keys
// Usage: const bug = createBug(pt, elements, minX, maxX, y);
//        if (bug) { elements.push(bug); pt.add(bug.x, bug.y, bug.w, bug.h); }
function createBug(pt, elements, minX, maxX, y) {
    const bugW = 20;
    const bugH = 16;
    const safetyGap = 25; // 与蓝色/黄色元素的安全距离
    
    // 获取蓝色元素（传送门）和黄色元素（钥匙、救援传送门）
    const protectedElements = elements.filter(e => 
        e.type === 'portal' ||  // 蓝色传送门
        (e.subType === 'caseKey' && e.active) ||  // 黄色钥匙
        e.isRescue  // 黄色救援传送门
    );
    
    for (let attempt = 0; attempt < 30; attempt++) {
        const bx = minX + Math.random() * (maxX - minX - bugW);
        
        // 检查是否在安全区域
        if (isInSafeZone(bx, bugW)) continue;
        
        // 检查是否与已有元素重叠
        if (pt.overlaps(bx, y, bugW, bugH, 15)) continue;
        
        // 检查是否与蓝色/黄色元素太近
        let isSafe = true;
        for (const protectedEl of protectedElements) {
            const dx = Math.abs(bx + bugW/2 - (protectedEl.x + protectedEl.w/2));
            const dy = Math.abs(y + bugH/2 - (protectedEl.y + protectedEl.h/2));
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < safetyGap + Math.max(bugW, protectedEl.w) / 2) {
                isSafe = false;
                break;
            }
        }
        
        if (isSafe) {
            return { type: 'bug', x: bx, y: y, w: bugW, h: bugH };
        }
    }
    
    // Fallback: 返回一个位置（可能不够理想，但至少能生成）
    const bx = minX + Math.random() * (maxX - minX - bugW);
    return { type: 'bug', x: bx, y: y, w: bugW, h: bugH };
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM MANAGER — 统一的平台放置管理
// ═══════════════════════════════════════════════════════════════
// 集中管理所有平台放置逻辑，自动处理重叠检测和垂直间距检查

function createPlatformManager() {
    const rects = [];  // 内部追踪所有已放置的平台
    const MIN_VERTICAL_GAP = 100;  // 最小垂直间距（玩家跳跃需要空间）
    const MIN_GAP = 20;  // 基础间距
    const MAX_ATTEMPTS = 100;  // 最大尝试次数
    
    // 检查是否在安全区域
    const isSafe = (x, w) => {
        for (const zone of SAFE_ZONES) {
            if (x < zone.x + zone.w && x + w > zone.x) return false;
        }
        return true;
    };
    
    // 检查与已有元素是否重叠
    const hasOverlap = (x, y, w, h, gap = MIN_GAP) => {
        const rx = x - gap, ry = y - gap, rw = w + gap * 2, rh = h + gap * 2;
        for (const r of rects) {
            if (rx < r.x + r.w && rx + rw > r.x && ry < r.y + r.h && ry + rh > r.y) return true;
        }
        return false;
    };
    
    // 检查垂直间距（X方向有重叠时）
    const checkVerticalSpacing = (x, y, w, h) => {
        for (const r of rects) {
            // 检查 X 方向是否重叠（考虑5px容差）
            const xOverlap = !(x + w + 5 < r.x || x > r.x + r.w + 5);
            if (xOverlap && Math.abs(y - r.y) < MIN_VERTICAL_GAP) {
                return false;  // 垂直间距不足
            }
        }
        return true;
    };
    
    return {
        rects,  // 暴露 rects 数组以便外部访问
        
        // 放置随机位置的平台
        // 返回平台对象，或 null（无法找到有效位置）
        placeRandom(minY, maxY, minW, maxW, minX, maxX, options = {}) {
            const { isExitPlatform = false, isRescue = false } = options;
            const w = minW + Math.random() * (maxW - minW);
            const h = 10;  // 固定高度
            
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                const px = minX + Math.random() * (maxX - minX - w);
                const py = minY + Math.random() * (maxY - minY);
                
                if (!isSafe(px, w)) continue;
                if (hasOverlap(px, py, w, h)) continue;
                if (!checkVerticalSpacing(px, py, w, h)) continue;
                
                // 成功放置
                const platform = { type: 'platform', x: px, y: py, w, h, isExitPlatform, isRescue };
                rects.push(platform);
                return platform;
            }
            
            return null;  // 无法找到有效位置
        },
        
        // 放置固定位置的平台
        // 返回平台对象，或 null（位置无效）
        placeAt(x, y, w, h, options = {}) {
            const { isExitPlatform = false, isRescue = false } = options;
            
            if (!isSafe(x, w)) {
                if (isExitPlatform) console.log(`[PlatformManager] Exit platform blocked by safe zone at (${x}, ${y})`);
                return null;
            }
            if (hasOverlap(x, y, w, h)) {
                if (isExitPlatform) console.log(`[PlatformManager] Exit platform overlaps at (${x}, ${y}), existing:`, rects);
                return null;
            }
            // 出口平台和救援平台跳过垂直间距检查
            if (!isExitPlatform && !isRescue && !checkVerticalSpacing(x, y, w, h)) return null;
            
            // 成功放置
            const platform = { type: 'platform', x, y, w, h, isExitPlatform, isRescue };
            rects.push(platform);
            return platform;
        },
        
        // 检查位置是否有效（不实际放置）
        isValidPosition(x, y, w, h) {
            if (!isSafe(x, w)) return false;
            if (hasOverlap(x, y, w, h)) return false;
            if (!checkVerticalSpacing(x, y, w, h)) return false;
            return true;
        },
        
        // 获取已放置的平台数量
        getCount() {
            return rects.length;
        },
        
        // 合并另一个 tracker 的 rects
        merge(otherTracker) {
            if (otherTracker && otherTracker.rects) {
                otherTracker.rects.forEach(r => rects.push(r));
            }
        },
        
        // 手动添加元素（向后兼容）
        add(x, y, w, h) {
            rects.push({ x, y, w, h });
        },
        
        // 检查是否重叠（向后兼容）
        overlaps(x, y, w, h) {
            return hasOverlap(x, y, w, h, 0);
        },
        
        // 尝试找到合适的X位置（向后兼容）
        tryPlaceX(w, minX, maxX, y, h, gap) {
            const actualGap = gap || 15;
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const px = minX + Math.random() * (maxX - minX - w);
                if (!hasOverlap(px, y, w, h, actualGap)) {
                    return px;
                }
            }
            return minX + (maxX - minX - w) / 2;  // 返回中间位置作为 fallback
        }
    };
}

// ── Platform generator (兼容旧代码) — prevents overlap with proper tracking ─
// Creates a platform with guaranteed non-overlapping placement
// Usage: const platform = createPlatform(pt, elements, minY, maxY, minW, maxW, minX, maxX);
//        if (platform) { elements.push(platform); pt.add(platform.x, platform.y, platform.w, platform.h); }
function createPlatform(pt, minY, maxY, minW, maxW, minX, maxX, options = {}) {
    const pm = createPlatformManager();
    
    // 如果传入的是旧的 tracker，合并其 rects
    if (pt && pt.rects) {
        pm.merge(pt);
    }
    
    // 尝试放置平台
    const platform = pm.placeRandom(minY, maxY, minW, maxW, minX, maxX, options);
    
    // 同步回 tracker
    if (platform && pt && pt.add) {
        pt.add(platform.x, platform.y, platform.w, platform.h, 'platform');
    }
    
    return platform;
}

// ── Enhanced placement tracker with vertical awareness ─────
function createEnhancedPlacementTracker() {
    return createPlatformManager();  // 现在使用统一的平台管理器
}

// ── Reachability analysis — detect dead zones ─────────────
// 分析场景可达性，检测玩家无法到达的区域
function analyzeReachability(floor, playerStartX, playerStartY) {
    const elements = floor.elements || [];
    const platforms = elements.filter(e => e.type === 'platform');
    const groundY = floor.groundY || FLOOR_GROUND_LOCAL;
    
    // 玩家跳跃能力参数
    const JUMP_HEIGHT = 120;  // 最大跳跃高度（从地面起跳）
    const PLAYER_H = 24;
    const PLAYER_W = 16;
    
    // 从起点开始 BFS 分析可达区域
    const visited = new Set();
    const reachable = [];
    const queue = [{ x: playerStartX, y: playerStartY, fromGround: true }];
    
    // 获取某个位置可以到达的所有平台
    function getReachablePlatforms(fromX, fromY, fromGround) {
        const result = [];
        
        // 如果在地面上，可以跳跃到空中的平台
        if (fromGround || fromY >= groundY - 10) {
            // 从地面可以跳到的平台
            for (const plat of platforms) {
                const platTop = plat.y;
                const verticalDist = groundY - platTop;
                
                // 检查是否在跳跃范围内
                if (verticalDist <= JUMP_HEIGHT && verticalDist > 0) {
                    // 检查水平距离是否可达（玩家可以移动）
                    const horizontalDist = Math.abs(fromX - (plat.x + plat.w / 2));
                    if (horizontalDist < 300) {  // 合理的水平移动距离
                        result.push({
                            platform: plat,
                            x: plat.x + plat.w / 2 - PLAYER_W / 2,
                            y: platTop - PLAYER_H,
                            fromGround: false
                        });
                    }
                }
            }
        }
        
        // 从平台可以跳到其他平台或地面
        for (const plat of platforms) {
            const platTop = plat.y;
            if (Math.abs(fromY + PLAYER_H - platTop) < 5) {
                // 当前在这个平台上
                // 可以跳到更高的平台
                for (const targetPlat of platforms) {
                    if (targetPlat === plat) continue;
                    const targetTop = targetPlat.y;
                    const verticalDist = platTop - targetTop;
                    
                    if (verticalDist > 0 && verticalDist <= JUMP_HEIGHT) {
                        const horizontalDist = Math.abs(plat.x + plat.w / 2 - (targetPlat.x + targetPlat.w / 2));
                        if (horizontalDist < 300) {
                            result.push({
                                platform: targetPlat,
                                x: targetPlat.x + targetPlat.w / 2 - PLAYER_W / 2,
                                y: targetTop - PLAYER_H,
                                fromGround: false
                            });
                        }
                    }
                }
                
                // 可以跳回地面
                const groundDist = platTop - groundY;
                if (groundDist > 0) {
                    result.push({
                        platform: null,
                        x: plat.x + plat.w / 2 - PLAYER_W / 2,
                        y: groundY - PLAYER_H,
                        fromGround: true
                    });
                }
            }
        }
        
        return result;
    }
    
    // BFS 遍历所有可达位置
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${Math.round(current.x)},${Math.round(current.y)}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        reachable.push(current);
        
        const nextPositions = getReachablePlatforms(current.x, current.y, current.fromGround);
        for (const pos of nextPositions) {
            const posKey = `${Math.round(pos.x)},${Math.round(pos.y)}`;
            if (!visited.has(posKey)) {
                queue.push(pos);
            }
        }
    }
    
    // 检查关键元素是否可达
    const unreachableElements = [];
    const criticalElements = elements.filter(e => 
        e.type === 'variable' || 
        e.type === 'gate' || 
        (e.type === 'return' && e.subType !== 'hidden')
    );
    
    for (const el of criticalElements) {
        const elCenterX = el.x + el.w / 2;
        const elCenterY = el.y + el.h / 2;
        
        // 检查是否有可达位置靠近这个元素
        let isReachable = false;
        for (const pos of reachable) {
            const dist = Math.sqrt(
                Math.pow(pos.x - elCenterX, 2) + 
                Math.pow(pos.y - elCenterY, 2)
            );
            if (dist < 50) {  // 50像素内认为可达
                isReachable = true;
                break;
            }
        }
        
        // 也检查是否在地面附近（地面总是可达的）
        if (elCenterY >= groundY - 30) {
            isReachable = true;
        }
        
        if (!isReachable) {
            unreachableElements.push(el);
        }
    }
    
    return {
        reachable,
        unreachableElements,
        hasDeadZone: unreachableElements.length > 0
    };
}

// ── Add rescue portals for unreachable elements ───────────
// 为无法到达的元素添加救援传送门
function addRescuePortals(floor, analysis, sharedPt) {
    if (!analysis.hasDeadZone) return [];
    
    const pt = sharedPt || createEnhancedPlacementTracker();
    const rescuePortals = [];
    const groundY = floor.groundY || FLOOR_GROUND_LOCAL;
    
    // 获取所有已存在的黄色元素（钥匙）位置
    const existingYellowElements = floor.elements.filter(e => 
        (e.subType === 'caseKey' && e.active) || e.isRescue
    );
    
    // 为每个无法到达的元素添加传送门对
    for (let i = 0; i < analysis.unreachableElements.length; i++) {
        const el = analysis.unreachableElements[i];
        const portalId = floor.index * 1000 + i + 100;
        
        // 地面入口传送门 - 避免与黄色元素重叠
        let entryX = 100 + i * 60;
        let entryY = groundY - 22;
        
        // 检查入口传送门是否与黄色元素重叠，如果是则调整位置
        const minGap = 30; // 最小间距
        for (const yellowEl of existingYellowElements) {
            const overlapX = Math.abs(entryX - yellowEl.x) < (18 + yellowEl.w + minGap);
            const overlapY = Math.abs(entryY - yellowEl.y) < (22 + yellowEl.h + minGap);
            if (overlapX && overlapY) {
                entryX += 40; // 向右移动40px
            }
        }
        
        // 确保入口传送门在游戏区域内
        if (entryX > GAME_W - 50) {
            entryX = GAME_W - 50;
        }
        
        // 目标传送门（靠近无法到达的元素）
        let exitX = el.x - 30;
        let exitY = el.y - 26;
        
        // 检查目标传送门是否与黄色元素重叠
        for (const yellowEl of existingYellowElements) {
            const overlapX = Math.abs(exitX - yellowEl.x) < (18 + yellowEl.w + minGap);
            const overlapY = Math.abs(exitY - yellowEl.y) < (22 + yellowEl.h + minGap);
            if (overlapX && overlapY) {
                exitX -= 30; // 向左移动30px
            }
        }
        
        // 添加传送门对
        rescuePortals.push({
            type: 'portal',
            portalId,
            x: entryX,
            y: entryY,
            w: 18,
            h: 22,
            isRescue: true
        });
        
        rescuePortals.push({
            type: 'portal',
            portalId,
            x: exitX,
            y: exitY,
            w: 18,
            h: 22,
            isRescue: true
        });
        
        // 如果需要，添加目标位置的平台
        const needsPlatform = !floor.elements.some(e => 
            e.type === 'platform' && 
            Math.abs(e.y - (exitY + 22)) < 10 &&
            exitX >= e.x && exitX + 18 <= e.x + e.w
        );
        
        if (needsPlatform) {
            // 使用统一的 placeAt 方法，自动处理所有检查
            const rescuePlatform = pt.placeAt(exitX - 10, exitY + 22, 40, 10, { isRescue: true });
            if (rescuePlatform) {
                rescuePortals.push(rescuePlatform);
            }
        }
    }
    
    return rescuePortals;
}
