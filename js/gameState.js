import { encounters, eventTemplates, memoryTemplates, playerTemplate } from "./data.js";

export function createPlayer() {
  return {
    ...playerTemplate,
    inventory: { ...playerTemplate.inventory },
    x: 74,
    y: 435,
    radius: 17,
    speed: 2.45,
    facing: "right",
  };
}

/** Build monster list with runtime patrol/movement fields injected. */
function createMonsters() {
  return encounters.map((encounter) => ({
    ...encounter,
    defeated: false,
    // Runtime patrol state (not in data.js)
    patrolOrigin: { x: encounter.x, y: encounter.y },
    moveDir: { dx: 1, dy: 0 },
    moveDirTimer: Math.floor(Math.random() * 60) + 60, // stagger timers so monsters don't sync
  }));
}

export const state = {
  phase: "intro",
  player: createPlayer(),
  monsters: createMonsters(),
  events: eventTemplates.map((event) => ({ ...event, resolved: false })),
  memories: memoryTemplates.map((memory) => ({ ...memory, collected: false })),
  memoryFragments: 0,
  enemy: null,
  activeMonsterId: null,
  activeEventId: null,
  enemySource: "monster",
  torchLit: false,
  bossDefeated: false,
  bossStarted: false,
  punishmentStarted: false,
  punishmentDefeated: false,
  endingStage: 0,
  dialogueFlags: {},
  flash: { damage: 0, fire: 0, shake: 0 },
  busy: false,
  keys: new Set(),
  lastFootstep: 0,
  audio: null,
  // --- New fields ---
  inventoryOpen: false,       // blocks player movement and prevents re-opening
  itemCooldowns: {},          // { [itemId]: timestampMs } per-item cooldown
  itemUseLock: false,         // true for ~400ms after item use — brief movement freeze
  battlesWonSinceDrop: 0,     // pity counter: resets on any drop
};

export function resetState() {
  Object.assign(state, {
    phase: "intro",
    player: createPlayer(),
    monsters: createMonsters(),
    events: eventTemplates.map((event) => ({ ...event, resolved: false })),
    memories: memoryTemplates.map((memory) => ({ ...memory, collected: false })),
    memoryFragments: 0,
    enemy: null,
    activeMonsterId: null,
    activeEventId: null,
    enemySource: "monster",
    torchLit: false,
    bossDefeated: false,
    bossStarted: false,
    punishmentStarted: false,
    punishmentDefeated: false,
    endingStage: 0,
    dialogueFlags: {},
    flash: { damage: 0, fire: 0, shake: 0 },
    busy: false,
    keys: new Set(),
    lastFootstep: 0,
    inventoryOpen: false,
    itemCooldowns: {},
    itemUseLock: false,
    battlesWonSinceDrop: 0,
  });
}
