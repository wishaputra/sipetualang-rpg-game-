const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const playerTemplate = {
  name: "Knight",
  maxHp: 95,
  hp: 95,
  maxMp: 35,
  mp: 35,
  attack: 4,
  blessing: false,
  smokeTurns: 0,
  guard: false,
  inventory: {
    potion: 2,
    mana: 1,
    bomb: 1,
    smoke: 1,
  },
};

const skills = [
  {
    id: "fireball",
    name: "Fireball",
    description: "High fire damage.",
    type: "damage",
    mpCost: 10,
    minDamage: 22,
    maxDamage: 30,
  },
  {
    id: "ember_brand",
    name: "Ember Brand",
    description: "Lower damage, applies burn for 3 turns.",
    type: "burn",
    mpCost: 8,
    minDamage: 8,
    maxDamage: 12,
    burnDamage: 6,
    burnTurns: 3,
  },
  {
    id: "guard",
    name: "Guard",
    description: "Reduce the next enemy attack.",
    type: "guard",
    mpCost: 4,
  },
];

const itemCatalog = [
  {
    id: "potion",
    name: "Health Potion",
    description: "Restore 30 HP.",
    type: "heal",
    heal: 30,
  },
  {
    id: "mana",
    name: "Mana Potion",
    description: "Restore 20 MP.",
    type: "mp",
    restoreMp: 20,
  },
  {
    id: "bomb",
    name: "Bomb",
    description: "Deal direct damage.",
    type: "damage",
    minDamage: 24,
    maxDamage: 32,
  },
  {
    id: "smoke",
    name: "Smoke Vial",
    description: "Greatly improves the next escape attempts.",
    type: "smoke",
    turns: 2,
  },
];

const encounters = [
  {
    id: "goblin",
    name: "Cave Goblin",
    archetype: "Fast but weak",
    maxHp: 38,
    attackMin: 7,
    attackMax: 10,
    dodgeChance: 0.05,
    hint: "Fast but weak. It attacks with nervous speed.",
    x: 292,
    y: 365,
    radius: 20,
    color: "#b95b4d",
  },
  {
    id: "golem",
    name: "Small Golem",
    archetype: "Tanky but slow",
    maxHp: 82,
    attackMin: 10,
    attackMax: 15,
    dodgeChance: 0,
    hint: "Tanky and slow. Fire and bombs help break its shell.",
    x: 386,
    y: 190,
    radius: 26,
    color: "#7b7480",
  },
  {
    id: "shadow",
    name: "Cave Shadow",
    archetype: "Evasive",
    maxHp: 52,
    attackMin: 8,
    attackMax: 13,
    dodgeChance: 0.28,
    hint: "Evasive. It may dodge direct attacks.",
    x: 602,
    y: 318,
    radius: 23,
    color: "#564b8f",
  },
];

const eventEnemy = {
  id: "whisper_shadow",
  name: "Whisper Shadow",
  archetype: "Ambush",
  maxHp: 72,
  attackMin: 11,
  attackMax: 17,
  dodgeChance: 0.18,
  hint: "A stronger enemy drawn by curiosity.",
  x: 520,
  y: 244,
  radius: 25,
  color: "#332b55",
};

const finalBoss = {
  id: "seal_keeper",
  name: "Seal Keeper",
  archetype: "Final guardian",
  maxHp: 118,
  attackMin: 12,
  attackMax: 18,
  dodgeChance: 0.08,
  hint: "It protects the exit and remembers what you are.",
  x: 656,
  y: 116,
  radius: 32,
  color: "#c6a45d",
};

const eventTemplates = [
  {
    id: "skeleton",
    type: "skeleton",
    name: "Fallen Knight",
    x: 178,
    y: 392,
    radius: 22,
    color: "#d4d0bd",
  },
  {
    id: "torch",
    type: "torch",
    name: "Dim Torch",
    x: 318,
    y: 252,
    radius: 20,
    color: "#f0bf4c",
  },
  {
    id: "sound",
    type: "sound",
    name: "Strange Sound",
    x: 528,
    y: 246,
    radius: 24,
    color: "#58a6ff",
  },
];

const memoryTemplates = [
  {
    id: "chains",
    x: 92,
    y: 174,
    radius: 19,
    text: "Memory: Flashes of fire... chains... screaming.",
  },
  {
    id: "oath",
    x: 350,
    y: 118,
    radius: 19,
    text: "Memory: Your own voice says, Seal me in. Do not let me wake.",
  },
  {
    id: "crown",
    x: 642,
    y: 430,
    radius: 19,
    text: "Memory: A black crown cracks in your hands. Something inside you laughs.",
  },
];

const cave = {
  width: 720,
  height: 520,
  exit: { x: 648, y: 66, w: 48, h: 72 },
  walls: [
    { x: 0, y: 0, w: 720, h: 30 },
    { x: 0, y: 490, w: 720, h: 30 },
    { x: 0, y: 0, w: 30, h: 520 },
    { x: 690, y: 0, w: 30, h: 520 },
    { x: 102, y: 86, w: 182, h: 58 },
    { x: 398, y: 84, w: 156, h: 54 },
    { x: 134, y: 220, w: 116, h: 120 },
    { x: 455, y: 278, w: 118, h: 130 },
    { x: 304, y: 420, w: 205, h: 42 },
  ],
  rocks: [
    { x: 84, y: 408, r: 18 },
    { x: 314, y: 208, r: 14 },
    { x: 613, y: 392, r: 20 },
    { x: 567, y: 92, r: 13 },
  ],
};

const state = {
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

const refs = {
  actions: document.querySelector("#actions"),
  battleLog: document.querySelector("#battleLog"),
  controlHint: document.querySelector("#controlHint"),
  damagePop: document.querySelector("#damagePop"),
  enemyHint: document.querySelector("#enemyHint"),
  enemyHpBar: document.querySelector("#enemyHpBar"),
  enemyHpText: document.querySelector("#enemyHpText"),
  enemyName: document.querySelector("#enemyName"),
  enemyPanel: document.querySelector("#enemyPanel"),
  messageText: document.querySelector("#messageText"),
  modeBadge: document.querySelector("#modeBadge"),
  playerHpBar: document.querySelector("#playerHpBar"),
  playerHpText: document.querySelector("#playerHpText"),
  playerMpBar: document.querySelector("#playerMpBar"),
  playerMpText: document.querySelector("#playerMpText"),
  potionText: document.querySelector("#potionText"),
  sceneTitle: document.querySelector("#sceneTitle"),
};

function createPlayer() {
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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function circleRectCollision(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = a.radius + b.radius;
  return dx * dx + dy * dy < distance * distance;
}

function ensureAudio() {
  if (state.audio || !window.AudioContext) return;

  const context = new AudioContext();
  if (context.state === "suspended") {
    context.resume();
  }
  const ambience = context.createOscillator();
  const ambienceGain = context.createGain();
  ambience.type = "sine";
  ambience.frequency.value = 58;
  ambienceGain.gain.value = 0.018;
  ambience.connect(ambienceGain);
  ambienceGain.connect(context.destination);
  ambience.start();
  state.audio = { context, ambienceGain };
}

function playTone(frequency, duration = 0.12, type = "sine", volume = 0.04) {
  if (!state.audio) return;

  const { context } = state.audio;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

function playFootstep() {
  const now = performance.now();
  if (now - state.lastFootstep < 260) return;
  state.lastFootstep = now;
  playTone(95, 0.055, "triangle", 0.018);
}

function setActions(actions) {
  refs.actions.replaceChildren();

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.className = action.className || "";
    button.disabled = Boolean(action.disabled) || state.busy;
    button.addEventListener("click", action.onClick);
    refs.actions.append(button);
  });
}

function log(message) {
  const item = document.createElement("li");
  item.textContent = message;
  refs.battleLog.prepend(item);

  while (refs.battleLog.children.length > 10) {
    refs.battleLog.lastElementChild.remove();
  }
}

function showDamage(text, target = "enemy") {
  refs.damagePop.textContent = text;
  refs.damagePop.style.left = target === "player" ? "22%" : "58%";
  refs.damagePop.style.top = target === "player" ? "48%" : "34%";
  refs.damagePop.classList.remove("hidden");
  refs.damagePop.style.animation = "none";
  refs.damagePop.offsetHeight;
  refs.damagePop.style.animation = "";

  window.setTimeout(() => refs.damagePop.classList.add("hidden"), 650);
}

function triggerFlash(type, amount = 1) {
  state.flash[type] = Math.max(state.flash[type] || 0, amount);
}

function spendMp(cost) {
  if (state.player.mp < cost) {
    refs.messageText.textContent = "Not enough MP. The cracked sword stays cold.";
    log(`Not enough MP. Need ${cost} MP.`);
    showDamage("NO MP", "player");
    playTone(105, 0.1, "triangle", 0.025);
    return false;
  }

  state.player.mp -= cost;
  updateHud();
  return true;
}

function restoreMp(amount) {
  const restored = Math.min(amount, state.player.maxMp - state.player.mp);
  state.player.mp += restored;
  if (restored > 0) {
    log(`MP restored: +${restored}.`);
    showDamage(`+${restored} MP`, "player");
  }
  return restored;
}

function inventorySummary() {
  const parts = itemCatalog.map((item) => `${item.name.replace("Health ", "")} x${state.player.inventory[item.id] || 0}`);
  return `Inventory: ${parts.join(" | ")}`;
}

function updateHud() {
  const playerHpPercent = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  const playerMpPercent = Math.max(0, state.player.mp / state.player.maxMp) * 100;
  refs.playerHpText.textContent = `HP ${state.player.hp} / ${state.player.maxHp} | ATK ${state.player.attack}`;
  refs.playerHpBar.style.width = `${playerHpPercent}%`;
  refs.playerMpText.textContent = `MP ${state.player.mp} / ${state.player.maxMp}`;
  refs.playerMpBar.style.width = `${playerMpPercent}%`;
  refs.potionText.textContent = inventorySummary();
  refs.modeBadge.textContent =
    state.phase === "battle"
      ? "Battle Mode"
      : state.phase === "event"
        ? "Event"
        : state.phase === "ending"
          ? "Truth Revealed"
          : state.phase === "defeat"
            ? "Defeat"
            : state.phase === "intro"
              ? "Intro"
              : "Exploration Mode";

  refs.controlHint.textContent =
    state.phase === "explore"
      ? "WASD / Arrow Keys to move. Touch markers, monsters, or the exit."
      : state.phase === "battle"
        ? "Choose commands from the battle menu."
        : state.phase === "event"
          ? "Choose how to respond."
          : "Use the buttons to continue.";

  if (state.enemy) {
    const enemyHpPercent = Math.max(0, state.enemy.hp / state.enemy.maxHp) * 100;
    const burnText = state.enemy.effects?.burn?.turns ? ` | Burn ${state.enemy.effects.burn.turns}` : "";
    refs.enemyName.textContent = state.enemy.name;
    refs.enemyHpText.textContent = `HP ${state.enemy.hp} / ${state.enemy.maxHp}${burnText}`;
    refs.enemyHpBar.style.width = `${enemyHpPercent}%`;
    refs.enemyHint.textContent = state.enemy.hint;
    refs.enemyPanel.style.opacity = "1";
  } else {
    refs.enemyName.textContent = "No enemy";
    refs.enemyHpText.textContent = "HP 0 / 0";
    refs.enemyHpBar.style.width = "0%";
    refs.enemyHint.textContent =
      state.phase === "explore"
        ? "Explore. Events and enemies react when touched."
        : "No active encounter.";
    refs.enemyPanel.style.opacity = "0.72";
  }
}

function triggerDialogue(kind) {
  if (state.dialogueFlags[kind]) return;

  const lines = {
    lowHp: "My body... it's failing...",
    whisper: "This presence... it feels familiar...",
    exit: "Why does the light feel... wrong?",
  };

  const line = lines[kind];
  if (!line) return;

  state.dialogueFlags[kind] = true;
  refs.messageText.textContent = line;
  log(`Voice: ${line}`);
}

function renderIntro() {
  state.phase = "intro";
  refs.sceneTitle.textContent = "The Broken Seal";
  refs.messageText.textContent =
    "The knight wakes beneath black stone, his memory gone and his sword cracked down the center. A voice coils through the cave: You finally woke up... but you were never meant to leave this place.";
  refs.battleLog.replaceChildren();
  log("A cracked sword lies in your hand. It feels familiar. It feels afraid.");
  setActions([{ label: "Rise", className: "primary", onClick: startExploration }]);
  updateHud();
}

function startExploration(message) {
  ensureAudio();
  state.phase = "explore";
  state.enemy = null;
  state.activeMonsterId = null;
  state.activeEventId = null;
  state.enemySource = "monster";
  state.busy = false;
  refs.sceneTitle.textContent = "Exploration";
  refs.messageText.textContent =
    message || "Move through the cave. The voice waits in the dark, and the cracked sword hums when danger is near.";
  setActions([]);
  updateHud();
}

function startEvent(event) {
  state.phase = "event";
  state.keys.clear();
  state.activeEventId = event.id;

  if (event.type === "skeleton") {
    refs.sceneTitle.textContent = "Fallen Knight";
    refs.messageText.textContent =
      "A fallen knight rests beside a broken shield. One hand still clutches a small satchel.";
    setActions([
      { label: "Take Item", className: "green", onClick: takeSkeletonItem },
      { label: "Respect", className: "primary", onClick: respectSkeleton },
      { label: "Leave", className: "ghost", onClick: () => resolveEvent("You leave the fallen knight undisturbed.") },
    ]);
  }

  if (event.type === "torch") {
    refs.sceneTitle.textContent = "Dim Torch";
    refs.messageText.textContent =
      "A torch sputters against the wall. The air around it smells of old ash and iron.";
    setActions([
      { label: "Light It", className: "primary", onClick: lightTorch },
      { label: "Leave", className: "ghost", onClick: () => resolveEvent("You leave the torch cold.") },
    ]);
  }

  if (event.type === "sound") {
    refs.sceneTitle.textContent = "Strange Sound";
    refs.messageText.textContent =
      "A whisper moves behind the stone. It says your name before you remember having one.";
    setActions([
      { label: "Investigate", className: "danger", onClick: investigateSound },
      { label: "Ignore", className: "ghost", onClick: () => resolveEvent("You ignore the whisper. It laughs once, then fades.") },
    ]);
  }

  updateHud();
}

function currentEvent() {
  return state.events.find((event) => event.id === state.activeEventId);
}

function markCurrentEventResolved() {
  const event = currentEvent();
  if (event) event.resolved = true;
}

function resolveEvent(message) {
  markCurrentEventResolved();
  nudgePlayerFromEncounter();
  startExploration(message);
}

function collectMemory(memory) {
  memory.collected = true;
  state.memoryFragments += 1;
  refs.sceneTitle.textContent = "Memory Fragment";
  refs.messageText.textContent = memory.text;
  log(`${memory.text} (${state.memoryFragments}/3)`);
  showDamage(`MEMORY ${state.memoryFragments}/3`, "player");
  playTone(290 + state.memoryFragments * 55, 0.22, "sine", 0.045);
  updateHud();
}

function takeSkeletonItem() {
  state.player.inventory.potion += 1;
  state.player.inventory.bomb += 1;
  playTone(420, 0.12, "triangle", 0.04);
  resolveEvent("You take a potion and a small bomb from the satchel. The fallen knight's visor turns toward you after you step away.");
}

function respectSkeleton() {
  if (!state.player.blessing) {
    state.player.blessing = true;
    state.player.maxHp += 5;
    state.player.hp += 5;
  }
  playTone(260, 0.18, "sine", 0.04);
  resolveEvent("You lower your cracked sword in respect. A quiet warmth enters your armor: Max HP +5.");
}

function lightTorch() {
  state.torchLit = true;
  playTone(520, 0.18, "sawtooth", 0.035);
  resolveEvent("The torch catches. The cave opens slightly around the light, and the shadows lose some of their teeth.");
}

function investigateSound() {
  markCurrentEventResolved();
  triggerDialogue("whisper");
  startBattle(eventEnemy, "event");
}

function startBattle(enemyTemplate, source = "monster") {
  state.phase = "battle";
  state.keys.clear();
  state.enemySource = source;
  state.activeMonsterId = source === "monster" ? enemyTemplate.id : null;
  state.enemy = {
    ...enemyTemplate,
    hp: enemyTemplate.maxHp,
    effects: {},
  };
  refs.sceneTitle.textContent = "Battle";
  refs.messageText.textContent =
    enemyTemplate.id === "seal_keeper"
      ? "Why does the light feel... wrong? The Seal Keeper descends before the exit, and the light behind it bends away from you."
      : source === "event"
      ? `${enemyTemplate.name} unfolds from the whisper.`
      : `${enemyTemplate.name} attacks as the knight gets too close.`;
  refs.battleLog.replaceChildren();
  log(`${enemyTemplate.name} appears: ${enemyTemplate.archetype}.`);
  playTone(130, 0.18, "sawtooth", 0.045);
  renderBattleActions();
  updateHud();
}

function renderBattleActions() {
  setActions([
    { label: "Attack", className: "danger", onClick: basicAttack },
    { label: "Skill", className: "blue", onClick: renderSkillMenu },
    { label: "Item", className: "green", onClick: renderItemMenu },
    { label: "Run", disabled: state.enemy?.id === "seal_keeper", onClick: attemptRun },
  ]);
}

function renderSkillMenu() {
  refs.messageText.textContent = "Choose a skill. Fireball hits hard, Ember Brand burns, Guard reduces the next hit.";
  setActions([
    ...skills.map((skill) => ({
      label: `${skill.name} (${skill.mpCost} MP)`,
      className: skill.type === "guard" ? "primary" : "blue",
      disabled: state.player.mp < skill.mpCost,
      onClick: () => castSkill(skill),
    })),
    { label: "Back", className: "ghost", onClick: renderBattleActions },
  ]);
}

function renderItemMenu() {
  refs.messageText.textContent = "Choose an item. Potions heal, bombs damage, smoke improves escape odds.";
  const itemActions = itemCatalog.map((item) => {
    const count = state.player.inventory[item.id] || 0;
    return {
      label: `${item.name} x${count}`,
      className: item.type === "damage" ? "danger" : "green",
      disabled:
        count <= 0 ||
        (item.type === "heal" && state.player.hp === state.player.maxHp) ||
        (item.type === "mp" && state.player.mp === state.player.maxMp),
      onClick: () => useItem(item),
    };
  });

  setActions([...itemActions, { label: "Back", className: "ghost", onClick: renderBattleActions }]);
}

function basicAttack() {
  const damage = randomInt(10, 15) + state.player.attack;
  resolvePlayerDamage("Cracked Sword", damage, { canDodge: true, sound: 210 });
}

function castSkill(skill) {
  if (!state.enemy || state.busy) return;
  if (!spendMp(skill.mpCost)) return;

  if (skill.type === "guard") {
    state.player.guard = true;
    refs.messageText.textContent = "The knight raises the cracked sword and braces for impact.";
    log("Guard: next enemy damage reduced.");
    playTone(180, 0.16, "square", 0.035);
    enemyTurn();
    return;
  }

  const damage = randomInt(skill.minDamage, skill.maxDamage) + Math.floor(state.player.attack / 2);
  if (skill.type === "burn") {
    state.enemy.effects.burn = {
      turns: skill.burnTurns,
      damage: skill.burnDamage,
    };
    resolvePlayerDamage(skill.name, damage, {
      canDodge: false,
      afterMessage: `${state.enemy.name} is burning.`,
      sound: 520,
      fire: true,
    });
    return;
  }

  resolvePlayerDamage(skill.name, damage, { canDodge: false, sound: 460, fire: true });
}

function resolvePlayerDamage(actionName, damage, options = {}) {
  if (!state.enemy || state.busy) return;

  if (options.canDodge && Math.random() < (state.enemy.dodgeChance || 0)) {
    refs.messageText.textContent = "The attack missed!";
    log(`${state.enemy.name} dodged ${actionName}.`);
    showDamage("MISS");
    playTone(155, 0.1, "triangle", 0.03);
    enemyTurn();
    return;
  }

  if (state.enemy.effects?.guarded) {
    damage = Math.ceil(damage * 0.55);
    state.enemy.effects.guarded = false;
    log(`${state.enemy.name}'s guard reduces the hit.`);
  }

  const canCrit = options.canCrit !== false;
  const critical = canCrit && Math.random() < 0.15;
  if (critical) {
    damage = Math.ceil(damage * 1.75);
  }

  state.enemy.hp = Math.max(0, state.enemy.hp - damage);
  refs.messageText.textContent = `${actionName} hits ${state.enemy.name} for ${damage} damage.`;
  if (critical) refs.messageText.textContent += " Critical Hit!";
  if (options.afterMessage) refs.messageText.textContent += ` ${options.afterMessage}`;
  log(`${actionName}: ${critical ? "Critical Hit! " : ""}${damage} damage.`);
  showDamage(`${critical ? "CRIT " : ""}-${damage}`);
  if (critical) triggerFlash("shake", 1);
  if (options.fire) triggerFlash("fire", 1);
  playTone(options.sound || 240, 0.12, "triangle", 0.04);
  updateHud();

  if (state.enemy.hp <= 0) {
    winBattle();
    return;
  }

  enemyTurn();
}

function useItem(item) {
  const count = state.player.inventory[item.id] || 0;
  if (count <= 0 || state.busy) return;
  if (item.type === "heal" && state.player.hp === state.player.maxHp) return;

  state.player.inventory[item.id] = count - 1;

  if (item.type === "heal") {
    const healed = Math.min(item.heal, state.player.maxHp - state.player.hp);
    state.player.hp += healed;
    refs.messageText.textContent = `The knight uses ${item.name} and restores ${healed} HP.`;
    log(`${item.name}: restored ${healed} HP.`);
    showDamage(`+${healed}`, "player");
    playTone(330, 0.14, "sine", 0.04);
    updateHud();
    enemyTurn();
    return;
  }

  if (item.type === "mp") {
    const restored = restoreMp(item.restoreMp);
    refs.messageText.textContent = `The knight drinks ${item.name} and restores ${restored} MP.`;
    playTone(390, 0.14, "sine", 0.04);
    updateHud();
    enemyTurn();
    return;
  }

  if (item.type === "damage") {
    const damage = randomInt(item.minDamage, item.maxDamage);
    resolvePlayerDamage(item.name, damage, { canDodge: false, sound: 90 });
    return;
  }

  if (item.type === "smoke") {
    state.player.smokeTurns = item.turns;
    refs.messageText.textContent = "Smoke rolls across the cave floor. Your next escape attempts are much safer.";
    log(`${item.name}: run chance increased for ${item.turns} turns.`);
    playTone(115, 0.18, "sine", 0.035);
    updateHud();
    enemyTurn();
  }
}

function runChance() {
  let chance = 0.45;
  if (state.player.smokeTurns > 0) chance += 0.35;
  if (state.enemy?.archetype === "Fast but weak") chance -= 0.1;
  if (state.enemy?.archetype === "Tanky but slow") chance += 0.1;
  return Math.max(0.15, Math.min(0.9, chance));
}

function attemptRun() {
  if (state.busy || !state.enemy) return;
  if (state.enemy.id === "seal_keeper") {
    refs.messageText.textContent = "The Seal Keeper bars the exit. There is nowhere left to run.";
    log("Run: impossible during the final battle.");
    return;
  }

  const chance = runChance();
  refs.messageText.textContent = "You attempt to escape...";
  log(`Run: attempting escape (${Math.round(chance * 100)}% chance).`);
  state.busy = true;
  renderBattleActions();
  playTone(170, 0.12, "triangle", 0.03);

  window.setTimeout(() => {
    const escaped = Math.random() < chance;
    state.busy = false;

    if (state.player.smokeTurns > 0) {
      state.player.smokeTurns -= 1;
    }

    if (escaped) {
      refs.messageText.textContent = "Escape successful. The knight vanishes into the smoke and stone.";
      log("Run: escape successful.");
      markActiveThreatCleared();
      state.enemy = null;
      window.setTimeout(() => {
        nudgePlayerFromEncounter();
        startExploration("The threat is left behind. The voice sounds disappointed.");
      }, 650);
      return;
    }

    refs.messageText.textContent = "Escape failed. The cave itself seems to push you back.";
    log("Run: escape failed.");
    enemyTurn();
  }, 850);
}

function applyBurn() {
  const burn = state.enemy?.effects?.burn;
  if (!burn || burn.turns <= 0) return false;

  state.enemy.hp = Math.max(0, state.enemy.hp - burn.damage);
  burn.turns -= 1;
  log(`Burn: ${burn.damage} damage.`);
  showDamage(`-${burn.damage}`);
  playTone(510, 0.1, "sawtooth", 0.026);
  if (burn.turns <= 0) delete state.enemy.effects.burn;
  updateHud();

  if (state.enemy.hp <= 0) {
    winBattle();
    return true;
  }

  return false;
}

function enemyTurn() {
  if (!state.enemy) return;

  state.busy = true;
  renderBattleActions();

  window.setTimeout(() => {
    if (!state.enemy) return;
    if (applyBurn()) return;

    if (state.enemy.id === "seal_keeper" && !state.enemy.effects.guarded && Math.random() < 0.25) {
      state.enemy.effects.guarded = true;
      refs.messageText.textContent = "The Seal Keeper raises a ward of old light.";
      log("Seal Keeper guards: next incoming damage reduced.");
      state.busy = false;
      restoreMp(3);
      updateHud();
      renderBattleActions();
      return;
    }

    let damage = randomInt(state.enemy.attackMin, state.enemy.attackMax);
    const heavyAttack = state.enemy.id === "seal_keeper" && Math.random() < 0.3;
    if (heavyAttack) {
      damage += 8;
      log("Seal Keeper prepares a heavy strike.");
      triggerFlash("shake", 0.8);
    }

    if (state.player.guard) {
      damage = Math.ceil(damage / 2);
      state.player.guard = false;
      log("Guard reduced the blow.");
    }

    state.player.hp = Math.max(0, state.player.hp - damage);
    refs.messageText.textContent = `${state.enemy.name} ${heavyAttack ? "crushes the ground" : "strikes back"} for ${damage} damage.`;
    log(`${state.enemy.name}: ${damage} damage.`);
    showDamage(`-${damage}`, "player");
    triggerFlash("damage", 1);
    playTone(120, 0.1, "sawtooth", 0.035);
    state.busy = false;
    restoreMp(3);
    updateHud();
    triggerDialogue("lowHp");

    if (state.player.hp <= 0) {
      renderDefeat();
      return;
    }

    renderBattleActions();
  }, 650);
}

function markActiveThreatCleared() {
  if (state.enemySource === "event") {
    markCurrentEventResolved();
    return;
  }

  if (state.enemySource === "boss") {
    state.bossDefeated = true;
    return;
  }

  const monster = state.monsters.find((candidate) => candidate.id === state.activeMonsterId);
  if (monster) {
    monster.defeated = true;
  }
}

function nudgePlayerFromEncounter() {
  state.player.x = Math.max(54, state.player.x - 28);
  state.player.y = Math.min(cave.height - 54, state.player.y + 18);
}

function applyProgression() {
  state.player.attack += 1;
  state.player.maxHp += 5;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 10);
  state.player.maxMp += 2;
  state.player.mp = Math.min(state.player.maxMp, state.player.mp + 8);
  log("Progress: ATK +1, Max HP +5, Max MP +2, HP +10, MP +8.");
}

function winBattle() {
  const defeatedName = state.enemy.name;
  const defeatedBoss = state.enemy.id === "seal_keeper";
  markActiveThreatCleared();
  state.enemy = null;
  state.activeMonsterId = null;
  state.activeEventId = null;
  state.enemySource = "monster";
  state.busy = false;
  refs.sceneTitle.textContent = "Victory";
  refs.messageText.textContent = `${defeatedName} is defeated. The cracked sword drinks the echo of the battle.`;
  log(`${defeatedName} defeated.`);
  applyProgression();
  playTone(360, 0.18, "triangle", 0.04);
  setActions([
    {
      label: defeatedBoss ? "Step Into Light" : "Return to Exploration",
      className: "primary",
      onClick: () =>
        defeatedBoss
          ? startEndingSequence()
          : startExploration("The cave is quiet again. You feel stronger, but less human."),
    },
  ]);
  updateHud();
}

function renderDefeat() {
  state.phase = "defeat";
  state.enemy = null;
  state.activeMonsterId = null;
  state.activeEventId = null;
  state.busy = false;
  refs.sceneTitle.textContent = "Defeat";
  refs.messageText.textContent =
    "The knight falls. The voice sighs, almost tender: Sleep again. We will try the seal tomorrow.";
  setActions([{ label: "Retry Demo", className: "primary", onClick: resetGame }]);
  updateHud();
}

function startEndingSequence() {
  state.phase = "ending";
  state.endingStage = 1;
  refs.sceneTitle.textContent = "The Light Outside";
  refs.messageText.textContent = "The Seal Keeper falls. For a moment, the cave becomes completely silent.";
  setActions([]);
  updateHud();
  playTone(92, 0.45, "sine", 0.04);
  window.setTimeout(renderEnding, 1300);
}

function renderEnding() {
  state.phase = "ending";
  state.endingStage = 2;
  state.enemy = null;
  refs.sceneTitle.textContent = "The Light Outside";
  if (state.memoryFragments >= 3) {
    refs.messageText.textContent =
      "Memory returns as the light touches you. You chose the cave. You chose the chains. The monster was never outside the seal; it was sleeping behind your eyes. You step back from the exit. It's not over... but now you remember why.";
    log("Ending: memory restored.");
  } else {
    refs.messageText.textContent =
      "The knight steps into daylight. His armor smokes. The cracked sword opens like an eye, and the voice whispers: The cave was not your prison. It was the world's lock. You were never the hero.";
    log("Ending: the seal is broken.");
  }
  playTone(70, 0.5, "sawtooth", 0.05);
  setActions([{ label: "Play Again", className: "primary", onClick: resetGame }]);
  updateHud();
}

function resetGame() {
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
  refs.battleLog.replaceChildren();
  renderIntro();
}

function keyDirection() {
  let dx = 0;
  let dy = 0;

  if (state.keys.has("arrowleft") || state.keys.has("a")) dx -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) dx += 1;
  if (state.keys.has("arrowup") || state.keys.has("w")) dy -= 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const diagonal = Math.SQRT1_2;
    dx *= diagonal;
    dy *= diagonal;
  }

  return { dx, dy };
}

function canMoveTo(x, y) {
  const candidate = { x, y, radius: state.player.radius };
  const hitsWall = cave.walls.some((wall) => circleRectCollision(candidate, wall));
  const hitsRock = cave.rocks.some((rock) => circleCollision(candidate, rock));
  return !hitsWall && !hitsRock;
}

function updateExploration() {
  if (state.phase !== "explore") return;

  const { dx, dy } = keyDirection();
  if (dx !== 0 || dy !== 0) {
    const nextX = state.player.x + dx * state.player.speed;
    const nextY = state.player.y + dy * state.player.speed;

    if (canMoveTo(nextX, state.player.y)) {
      state.player.x = nextX;
    }

    if (canMoveTo(state.player.x, nextY)) {
      state.player.y = nextY;
    }

    if (dx < 0) state.player.facing = "left";
    if (dx > 0) state.player.facing = "right";
    playFootstep();
  }

  const touchedEvent = state.events.find(
    (event) => !event.resolved && circleCollision(state.player, event)
  );

  if (touchedEvent) {
    startEvent(touchedEvent);
    return;
  }

  const touchedMemory = state.memories.find(
    (memory) => !memory.collected && circleCollision(state.player, memory)
  );

  if (touchedMemory) {
    collectMemory(touchedMemory);
    return;
  }

  const touchedMonster = state.monsters.find(
    (monster) => !monster.defeated && circleCollision(state.player, monster)
  );

  if (touchedMonster) {
    startBattle(touchedMonster);
    return;
  }

  const allMonstersCleared = state.monsters.every((monster) => monster.defeated);
  if (allMonstersCleared && circleRectCollision(state.player, cave.exit)) {
    triggerDialogue("exit");
    if (!state.bossStarted) {
      state.bossStarted = true;
      startBattle(finalBoss, "boss");
      return;
    }

    if (state.bossDefeated) {
      startEndingSequence();
    }
  }
}

function drawCave() {
  ctx.clearRect(0, 0, cave.width, cave.height);

  const gradient = ctx.createRadialGradient(620, 80, 30, 360, 260, 560);
  gradient.addColorStop(0, state.torchLit ? "#3b3440" : "#252631");
  gradient.addColorStop(0.35, "#181a20");
  gradient.addColorStop(1, "#08090c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cave.width, cave.height);

  ctx.fillStyle = "#292733";
  ctx.beginPath();
  ctx.moveTo(58, 458);
  ctx.bezierCurveTo(160, 370, 278, 406, 358, 334);
  ctx.bezierCurveTo(484, 220, 530, 162, 680, 92);
  ctx.lineTo(690, 158);
  ctx.bezierCurveTo(548, 212, 498, 300, 382, 388);
  ctx.bezierCurveTo(286, 458, 156, 424, 74, 490);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0d0e12";
  cave.walls.forEach((wall) => {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  });

  ctx.fillStyle = "#3c3a45";
  cave.rocks.forEach((rock) => {
    ctx.beginPath();
    ctx.ellipse(rock.x, rock.y, rock.r * 1.25, rock.r, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  drawExit();
  drawEvents();
  drawMemories();
}

function drawExit() {
  ctx.save();
  ctx.globalAlpha = state.monsters.every((monster) => monster.defeated) ? 1 : 0.28;
  ctx.fillStyle = "#f2d26c";
  ctx.beginPath();
  ctx.ellipse(cave.exit.x + cave.exit.w / 2, cave.exit.y + cave.exit.h / 2, 34, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#f7e8a7";
  ctx.font = "14px sans-serif";
  ctx.fillText("Exit", cave.exit.x + 9, cave.exit.y - 8);
}

function drawEvents() {
  state.events
    .filter((event) => !event.resolved)
    .forEach((event) => {
      ctx.save();
      ctx.translate(event.x, event.y);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.arc(0, 0, event.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = event.color;

      if (event.type === "skeleton") {
        ctx.fillRect(-18, 8, 36, 6);
        ctx.beginPath();
        ctx.arc(-8, -2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(5, -3, 22, 5);
      }

      if (event.type === "torch") {
        ctx.fillStyle = "#6f4a32";
        ctx.fillRect(-3, 0, 6, 28);
        ctx.fillStyle = state.torchLit ? "#f6d45b" : "#8a6a37";
        ctx.beginPath();
        ctx.arc(0, -4, state.torchLit ? 13 : 7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (event.type === "sound") {
        ctx.strokeStyle = event.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0.2, Math.PI * 1.6);
        ctx.arc(0, 0, 18, 0.2, Math.PI * 1.6);
        ctx.stroke();
      }

      ctx.restore();
    });
}

function drawMemories() {
  state.memories
    .filter((memory) => !memory.collected)
    .forEach((memory) => {
      ctx.save();
      ctx.translate(memory.x, memory.y);
      ctx.fillStyle = "rgba(137, 213, 255, 0.12)";
      ctx.beginPath();
      ctx.arc(0, 0, memory.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#89d5ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -memory.radius);
      ctx.lineTo(memory.radius * 0.75, 0);
      ctx.lineTo(0, memory.radius);
      ctx.lineTo(-memory.radius * 0.75, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "#d9f2ff";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
}

function drawKnight() {
  const { x, y, radius, facing } = state.player;

  ctx.save();
  ctx.translate(x, y);
  if (facing === "left") ctx.scale(-1, 1);

  ctx.fillStyle = "#14161c";
  ctx.beginPath();
  ctx.ellipse(0, 17, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cbd3df";
  ctx.fillRect(-10, -8, 20, 25);
  ctx.fillStyle = "#7d8799";
  ctx.fillRect(-13, 4, 26, 16);
  ctx.fillStyle = "#e6ebf2";
  ctx.beginPath();
  ctx.arc(0, -17, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#15171d";
  ctx.fillRect(-7, -18, 14, 4);
  ctx.strokeStyle = "#f0bf4c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.lineTo(28, -18);
  ctx.stroke();
  ctx.strokeStyle = "#111114";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(21, -10);
  ctx.lineTo(25, -14);
  ctx.stroke();

  ctx.restore();
}

function drawMonster(monster) {
  ctx.save();
  ctx.translate(monster.x, monster.y);

  ctx.fillStyle = "#111217";
  ctx.beginPath();
  ctx.ellipse(0, monster.radius, monster.radius * 1.1, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = monster.color;
  ctx.beginPath();
  ctx.arc(0, 0, monster.radius, 0, Math.PI * 2);
  ctx.fill();

  if (monster.archetype === "Tanky but slow") {
    ctx.strokeStyle = "#b9b1bd";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.fillStyle = "#101114";
  ctx.beginPath();
  ctx.arc(-8, -5, 4, 0, Math.PI * 2);
  ctx.arc(8, -5, 4, 0, Math.PI * 2);
  ctx.fill();

  if (monster.archetype !== "Tanky but slow") {
    ctx.fillStyle = "#f2e5b5";
    ctx.beginPath();
    ctx.moveTo(-14, -17);
    ctx.lineTo(-24, -34);
    ctx.lineTo(-5, -22);
    ctx.closePath();
    ctx.moveTo(14, -17);
    ctx.lineTo(24, -34);
    ctx.lineTo(5, -22);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawLighting() {
  if (state.phase === "battle" || state.phase === "ending") return;

  ctx.save();
  const light = ctx.createRadialGradient(state.player.x, state.player.y, 28, state.player.x, state.player.y, state.torchLit ? 245 : 155);
  light.addColorStop(0, "rgba(0, 0, 0, 0)");
  light.addColorStop(1, state.torchLit ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, cave.width, cave.height);
  ctx.restore();
}

function drawBattleScene() {
  drawCave();
  drawKnight();

  if (state.enemy) {
    drawMonster({ ...state.enemy, x: 535, y: 270, radius: 36 });
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
  ctx.fillRect(0, 0, cave.width, cave.height);
  ctx.fillStyle = "#f2f4f8";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("Turn-Based Battle", 250, 64);
}

function draw() {
  const shake = state.flash.shake > 0 ? state.flash.shake * 6 : 0;
  if (shake > 0) {
    ctx.save();
    ctx.translate(randomInt(-shake, shake), randomInt(-shake, shake));
  }

  if (state.phase === "battle") {
    drawBattleScene();
    drawOverlays();
    if (shake > 0) ctx.restore();
    return;
  }

  drawCave();

  state.monsters
    .filter((monster) => !monster.defeated)
    .forEach((monster) => drawMonster(monster));

  drawKnight();
  drawLighting();

  if (state.phase === "intro") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.56)";
    ctx.fillRect(0, 0, cave.width, cave.height);
    ctx.fillStyle = "#f2f4f8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("The Broken Seal", 250, 232);
    ctx.font = "16px sans-serif";
    ctx.fillText("A cracked sword remembers what you do not.", 206, 262);
  }

  if (state.phase === "event") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.fillRect(0, 0, cave.width, cave.height);
  }

  if (state.phase === "ending") {
    ctx.fillStyle = state.endingStage === 1 ? "rgba(0, 0, 0, 0.45)" : "rgba(242, 210, 108, 0.22)";
    ctx.fillRect(0, 0, cave.width, cave.height);
    ctx.fillStyle = "#f2f4f8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(state.memoryFragments >= 3 ? "Now You Remember" : "You Were Never The Hero", state.memoryFragments >= 3 ? 230 : 198, 248);
  }

  if (state.phase === "defeat") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, cave.width, cave.height);
    ctx.fillStyle = "#f2f4f8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("Defeat", 318, 248);
  }

  drawOverlays();
  if (shake > 0) ctx.restore();
}

function drawOverlays() {
  if (state.player.hp > 0 && state.player.hp / state.player.maxHp < 0.3) {
    ctx.fillStyle = "rgba(160, 20, 20, 0.18)";
    ctx.fillRect(0, 0, cave.width, cave.height);
  }

  if (state.flash.damage > 0) {
    ctx.fillStyle = `rgba(220, 35, 35, ${0.26 * state.flash.damage})`;
    ctx.fillRect(0, 0, cave.width, cave.height);
    state.flash.damage = Math.max(0, state.flash.damage - 0.08);
  }

  if (state.flash.fire > 0) {
    ctx.fillStyle = `rgba(255, 128, 32, ${0.22 * state.flash.fire})`;
    ctx.fillRect(0, 0, cave.width, cave.height);
    state.flash.fire = Math.max(0, state.flash.fire - 0.07);
  }

  state.flash.shake = Math.max(0, state.flash.shake - 0.08);
}

function gameLoop() {
  updateExploration();
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const movementKeys = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"];

  if (movementKeys.includes(key)) {
    event.preventDefault();
    state.keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

renderIntro();
requestAnimationFrame(gameLoop);
