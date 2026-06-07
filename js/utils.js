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
        add(x, y, w, h) { rects.push({ x, y, w, h }); },
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

// ── Platform generator — prevents overlap with proper tracking ─
// Creates a platform with guaranteed non-overlapping placement
// Usage: const platform = createPlatform(pt, elements, minY, maxY, minW, maxW, minX, maxX);
//        elements.push(platform);
//        pt.add(platform.x, platform.y, platform.w, platform.h);
function createPlatform(pt, minY, maxY, minW, maxW, minX, maxX, gap = 15) {
    const w = minW + Math.random() * (maxW - minW);
    const h = 10;  // Fixed platform height
    
    let px, py, attempts = 0;
    const maxAttempts = 80;  // 增加尝试次数
    const minVerticalGap = 120;  // 平台之间最小垂直间距（增加到120，进一步减少重叠）
    const minHorizontalGap = 50;  // 同高度平台之间最小水平间距（增加到50）
    
    // Try to find a valid position with proper overlap checking
    for (attempts = 0; attempts < maxAttempts; attempts++) {
        px = minX + Math.random() * (maxX - minX - w);
        py = minY + Math.random() * (maxY - minY);
        
        // Check safe zone
        if (isInSafeZone(px, w)) continue;
        
        // Check overlap with all existing elements (including other platforms)
        if (!pt.overlaps(px, py, w, h, gap)) {
            // Get all existing platforms from rects
            const existingPlatforms = (pt.rects || []).filter(r => r.type === 'platform' || r.h === 10);
            
            // Check vertical spacing with all existing platforms
            let validPosition = true;
            for (const plat of existingPlatforms) {
                // 检查垂直方向距离
                const verticalDistance = Math.abs(plat.y - py);
                
                if (verticalDistance > 0 && verticalDistance < minVerticalGap) {
                    // 垂直距离太近，检查水平方向是否有足够间距
                    const leftEdge = Math.min(px, plat.x);
                    const rightEdge = Math.max(px + w, plat.x + plat.w);
                    const horizontalOverlap = rightEdge - leftEdge;
                    
                    // 如果水平重叠超过最小间距，则位置无效
                    if (horizontalOverlap > minHorizontalGap) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            if (validPosition) {
                return { type: 'platform', x: px, y: py, w: w, h: h };
            }
        }
    }
    
    // Fallback: return null if no valid position found
    return null;
}

// ── Enhanced placement tracker with vertical awareness ─────
function createEnhancedPlacementTracker() {
    const tracker = createPlacementTracker();
    tracker.rects = [];
    
    // Override add to track in both arrays
    const originalAdd = tracker.add;
    tracker.add = function(x, y, w, h) {
        originalAdd.call(this, x, y, w, h);
        this.rects.push({ x, y, w, h });
    };
    
    return tracker;
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
    
    // 为每个无法到达的元素添加传送门对
    for (let i = 0; i < analysis.unreachableElements.length; i++) {
        const el = analysis.unreachableElements[i];
        const portalId = floor.index * 1000 + i + 100;
        
        // 地面入口传送门
        const entryX = 100 + i * 60;
        const entryY = groundY - 22;
        
        // 目标传送门（靠近无法到达的元素）
        const exitX = el.x - 30;
        const exitY = el.y - 26;
        
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
            rescuePortals.push({
                type: 'platform',
                x: exitX - 10,
                y: exitY + 22,
                w: 40,
                h: 10,
                isRescue: true
            });
        }
    }
    
    return rescuePortals;
}
