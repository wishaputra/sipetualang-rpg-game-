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

export const state = {
  phase: "intro",
  player: createPlayer(),
  monsters: encounters.map((encounter) => ({ ...encounter, defeated: false })),
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
  endingStage: 0,
  dialogueFlags: {},
  flash: { damage: 0, fire: 0, shake: 0 },
  busy: false,
  keys: new Set(),
  lastFootstep: 0,
  audio: null,
};

export function resetState() {
  Object.assign(state, {
    phase: "intro",
    player: createPlayer(),
    monsters: encounters.map((encounter) => ({ ...encounter, defeated: false })),
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
    endingStage: 0,
    dialogueFlags: {},
    flash: { damage: 0, fire: 0, shake: 0 },
    busy: false,
    keys: new Set(),
    lastFootstep: 0,
  });
}
