import { finalBoss, itemCatalog, skills } from "./data.js";
import { resetState, state } from "./gameState.js";
import { playTone, ensureAudio } from "./audio.js";
import { triggerDialogue } from "./dialogue.js";
import { triggerFlash } from "./effects.js";
import { randomInt } from "./utils.js";
import { log, refs, restoreMp, setActions, showDamage, spendMp, updateHud } from "./ui.js";
import { rollDrop, applyDrop, getItemName } from "./drops.js";
import { closeInventoryMenu } from "./inventory.js";

export function renderIntro() {
  state.phase = "intro";
  refs.sceneTitle.textContent = "The Broken Seal";
  refs.messageText.textContent =
    "The knight wakes beneath black stone, his memory gone and his sword cracked down the center. A voice coils through the cave: You finally woke up... but you were never meant to leave this place.";
  refs.battleLog.replaceChildren();
  log("A cracked sword lies in your hand. It feels familiar. It feels afraid.");
  setActions([{ label: "Rise", className: "primary", onClick: startExploration }]);
  updateHud();
}

export function startExploration(message) {
  ensureAudio();
  // Close inventory overlay if it was somehow left open
  closeInventoryMenu();
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

export function startBattle(enemyTemplate, source = "monster") {
  // Close inventory if open when a battle starts
  closeInventoryMenu();
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
    enemyTemplate.id === "abyssal_warden"
      ? "A powerful presence blocks your path\u2026 The air grows freezing cold as the Abyssal Warden rises from the darkness."
      : enemyTemplate.id === "seal_keeper"
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

export function renderBattleActions() {
  setActions([
    { label: "Attack", className: "danger", onClick: basicAttack },
    { label: "Skill", className: "blue", onClick: renderSkillMenu },
    { label: "Item", className: "green", onClick: renderItemMenu },
    { label: "Run", disabled: state.enemy?.id === "seal_keeper" || state.enemy?.id === "abyssal_warden", onClick: attemptRun },
  ]);
}

export function renderSkillMenu() {
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

export function renderItemMenu() {
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

export function basicAttack() {
  const damage = randomInt(10, 15) + state.player.attack;
  resolvePlayerDamage("Cracked Sword", damage, { canDodge: true, sound: 210 });
}

export function castSkill(skill) {
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

export function resolvePlayerDamage(actionName, damage, options = {}) {
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

export function useItem(item) {
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
    return;
  }

  // Ancient Core — usable in battle too
  if (item.type === "permhp") {
    state.player.maxHp += item.hpBonus;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.hpBonus);
    refs.messageText.textContent = `The Ancient Core crumbles... Max HP permanently +${item.hpBonus}.`;
    log(`Ancient Core: Max HP +${item.hpBonus}.`);
    showDamage(`+${item.hpBonus} MaxHP`, "player");
    playTone(440, 0.2, "sine", 0.05);
    updateHud();
    enemyTurn();
  }
}

export function runChance() {
  let chance = 0.45;
  if (state.player.smokeTurns > 0) chance += 0.35;
  if (state.enemy?.archetype === "Fast but weak") chance -= 0.1;
  if (state.enemy?.archetype === "Tanky but slow") chance += 0.1;
  return Math.max(0.15, Math.min(0.9, chance));
}

export function attemptRun() {
  if (state.busy || !state.enemy) return;
  if (state.enemy.id === "seal_keeper") {
    refs.messageText.textContent = "The Seal Keeper bars the exit. There is nowhere left to run.";
    log("Run: impossible during the final battle.");
    return;
  }
  if (state.enemy.id === "abyssal_warden") {
    refs.messageText.textContent = "The Abyssal Warden's gaze paralyses you. Escape is impossible.";
    log("Run: impossible against the Warden.");
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

export function applyBurn() {
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

export function enemyTurn() {
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

export function markActiveThreatCleared() {
  if (state.enemySource === "event") {
    const event = state.events.find((candidate) => candidate.id === state.activeEventId);
    if (event) event.resolved = true;
    return;
  }

  if (state.enemySource === "boss") {
    state.bossDefeated = true;
    return;
  }

  if (state.enemySource === "punishment") {
    state.punishmentDefeated = true;
    return;
  }

  const monster = state.monsters.find((candidate) => candidate.id === state.activeMonsterId);
  if (monster) {
    monster.defeated = true;
  }
}

export function nudgePlayerFromEncounter() {
  state.player.x = Math.max(54, state.player.x - 28);
  state.player.y = Math.min(520 - 54, state.player.y + 18);
}

export function applyProgression() {
  state.player.attack += 1;
  state.player.maxHp += 5;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 10);
  state.player.maxMp += 2;
  state.player.mp = Math.min(state.player.maxMp, state.player.mp + 8);
  log("Stat boost: ATK +1, Max HP +5, Max MP +2, HP +10, MP +8.");
}

// ---------------------------------------------------------------------------
// Win battle — staged reward sequence
// ---------------------------------------------------------------------------

export function winBattle() {
  const defeatedName = state.enemy.name;
  const defeatedId = state.enemy.id;
  const defeatedBoss = state.enemy.id === "seal_keeper" || state.enemy.id === "abyssal_warden";
  const dropTable = state.enemy.dropTable || [];

  markActiveThreatCleared();
  applyProgression();

  state.enemy = null;
  state.activeMonsterId = null;
  state.activeEventId = null;
  state.enemySource = "monster";
  state.busy = true; // keep buttons disabled during the sequence

  refs.sceneTitle.textContent = "Victory";
  refs.messageText.textContent = `${defeatedName} is defeated. The cracked sword drinks the echo of the battle.`;
  log(`${defeatedName} defeated.`);
  playTone(360, 0.18, "triangle", 0.04);
  setActions([]); // clear buttons during sequence
  updateHud();

  // ── Step 1 (300 ms): suspense message ────────────────────────────────────
  window.setTimeout(() => {
    refs.messageText.textContent = "Something stirs in the dust…";
  }, 300);

  // ── Step 2 (800 ms): roll and reveal drop ────────────────────────────────
  window.setTimeout(() => {
    const droppedId = rollDrop(dropTable, defeatedBoss);

    if (droppedId) {
      applyDrop(droppedId);
      const itemName = getItemName(droppedId);
      refs.messageText.textContent = `You obtained: ${itemName}!`;
      log(`Drop: ${itemName} obtained.`);
      showDamage(`+${itemName}`, "player");
      playTone(520, 0.16, "sine", 0.04);
      updateHud();
    } else {
      refs.messageText.textContent = "Nothing was left behind.";
    }
  }, 800);

  // ── Step 3 (1300 ms): show action button ─────────────────────────────────
  window.setTimeout(() => {
    state.busy = false;
    setActions([
      {
        label: defeatedBoss ? "Step Forward" : "Return to Exploration",
        className: "primary",
        onClick: () => {
          if (defeatedId === "seal_keeper") {
            startEndingSequence();
          } else if (defeatedId === "abyssal_warden") {
            startAlternateEndingSequence();
          } else {
            startExploration("The cave is quiet again. You feel stronger, but less human.");
          }
        },
      },
    ]);
  }, 1300);
}

export function renderDefeat() {
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

export function startEndingSequence() {
  state.phase = "ending";
  state.endingStage = 1;
  refs.sceneTitle.textContent = "The Light Outside";
  refs.messageText.textContent = "The Seal Keeper falls. For a moment, the cave becomes completely silent.";
  setActions([]);
  updateHud();
  playTone(92, 0.45, "sine", 0.04);
  window.setTimeout(renderEnding, 1300);
}

export function renderEnding() {
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

export function startAlternateEndingSequence() {
  state.phase = "alt_ending";
  state.endingStage = 1;
  refs.sceneTitle.textContent = "The Guardian's Rebirth";
  refs.messageText.textContent = "The Abyssal Warden crumbles into ash. The air grows heavy and still.";
  setActions([]);
  updateHud();
  playTone(85, 0.45, "sine", 0.04);
  window.setTimeout(renderAlternateEnding, 1300);
}

export function renderAlternateEnding() {
  state.phase = "alt_ending";
  state.endingStage = 2;
  state.enemy = null;
  refs.sceneTitle.textContent = "The Guardian's Rebirth";
  refs.messageText.textContent =
    "You have proven your strength\u2026 But strength alone cannot grant you freedom. The cave accepts you\u2026 as its new guardian. You are no longer the one who seeks escape\u2026 You are the one who keeps others from leaving.";
  log("Alternate Ending: the knight becomes the guardian.");
  playTone(65, 0.5, "sawtooth", 0.05);
  setActions([{ label: "Embrace the Dark", className: "primary", onClick: resetGame }]);
  updateHud();
}

export function resetGame() {
  resetState();
  refs.battleLog.replaceChildren();
  renderIntro();
}

export { finalBoss };
