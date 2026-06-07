// ═══════════════════════════════════════════════════════════════
// GAMEPLAY BASE — Registry for primary types & modifiers
// ═══════════════════════════════════════════════════════════════
//
// PRIMARY GAMEPLAY (required — one per floor):
//   registerGameplay({ id, name, codeText, generateElements(fi),
//                      handleInteraction(p, el, floor) })
//   Optional: minFloor, weight, drawElement, drawGate, updateFloor
//
// MODIFIER (optional — can stack on top of any primary):
//   registerModifier({ id, name, minFloor, weight,
//                      generateExtras(fi), onActivate(floor),
//                      onDeactivate(floor), updateFloor(floor),
//                      drawUI(ctx) })
//   Modifiers add pressure/risk/bonus without changing the win condition.

const GAMEPLAYS  = [];
const MODIFIERS  = [];

function registerGameplay(gp) { GAMEPLAYS.push(gp); }
function registerModifier(mod) { MODIFIERS.push(mod); }

// ── Weighted random pick ──────────────────────────────────
function weightedPick(list, floorIndex, field = 'minFloor') {
    const available = list.filter(m => floorIndex >= (m[field] || 0));
    if (!available.length) return null;
    const total = available.reduce((s, m) => s + (m.weight || 1), 0);
    let roll = Math.random() * total;
    for (const m of available) {
        roll -= (m.weight || 1);
        if (roll <= 0) return m;
    }
    return available[available.length - 1];
}

function getGameplayForFloor(floorIndex) {
    const gp = weightedPick(GAMEPLAYS, floorIndex);
    return gp || GAMEPLAYS[0];
}

// ── Get multiple gameplays for a floor (组合多种玩法) ─────
function getGameplaysForFloor(floorIndex) {
    // 根据楼层索引决定组合的玩法数量
    // 楼层0-2: 1种玩法
    // 楼层3-6: 2种玩法
    // 楼层7+: 3种玩法
    let count = 1;
    if (floorIndex >= 7) count = 3;
    else if (floorIndex >= 3) count = 2;
    
    const gameplays = [];
    const available = GAMEPLAYS.filter(gp => floorIndex >= (gp.minFloor || 0));
    
    // 随机选择不重复的玩法
    const shuffled = available.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        gameplays.push(shuffled[i]);
    }
    
    // 确保至少有一个玩法
    if (gameplays.length === 0) {
        gameplays.push(GAMEPLAYS[0]);
    }
    
    return gameplays;
}

function getModifiersForFloor(floorIndex) {
    const mods = [];
    for (const mod of MODIFIERS) {
        if (floorIndex >= (mod.minFloor || 0) && Math.random() < (mod.weight || 0.3)) {
            mods.push(mod);
        }
    }
    return mods;
}
