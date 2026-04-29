import { itemCatalog } from "./data.js";
import { state } from "./gameState.js";
import { playTone } from "./audio.js";

export const refs = {
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

export function setActions(actions) {
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

export function log(message) {
  const item = document.createElement("li");
  item.textContent = message;
  refs.battleLog.prepend(item);

  while (refs.battleLog.children.length > 10) {
    refs.battleLog.lastElementChild.remove();
  }
}

export function showDamage(text, target = "enemy") {
  refs.damagePop.textContent = text;
  refs.damagePop.style.left = target === "player" ? "22%" : "58%";
  refs.damagePop.style.top = target === "player" ? "48%" : "34%";
  refs.damagePop.classList.remove("hidden");
  refs.damagePop.style.animation = "none";
  refs.damagePop.offsetHeight;
  refs.damagePop.style.animation = "";

  window.setTimeout(() => refs.damagePop.classList.add("hidden"), 650);
}

export function spendMp(cost) {
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

export function restoreMp(amount) {
  const restored = Math.min(amount, state.player.maxMp - state.player.mp);
  state.player.mp += restored;
  if (restored > 0) {
    log(`MP restored: +${restored}.`);
    showDamage(`+${restored} MP`, "player");
  }
  return restored;
}

export function inventorySummary() {
  const parts = itemCatalog
    .filter((item) => (state.player.inventory[item.id] || 0) > 0)
    .map((item) => `${item.name.replace("Health ", "")} x${state.player.inventory[item.id]}`);
  return parts.length > 0 ? `Inventory: ${parts.join(" | ")}` : "Inventory: empty";
}

export function updateHud() {
  const playerHpPercent = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  const playerMpPercent = Math.max(0, state.player.mp / state.player.maxMp) * 100;
  refs.playerHpText.textContent = `HP ${state.player.hp} / ${state.player.maxHp} | ATK ${state.player.attack}`;
  refs.playerHpBar.style.width = `${playerHpPercent}%`;
  refs.playerMpText.textContent = `MP ${state.player.mp} / ${state.player.maxMp}`;
  refs.playerMpBar.style.width = `${playerMpPercent}%`;
  refs.potionText.textContent = inventorySummary();
  if (state.inventoryOpen) {
    refs.modeBadge.textContent = "Inventory";
  } else {
    refs.modeBadge.textContent =
      state.phase === "battle"
        ? "Battle Mode"
        : state.phase === "event"
          ? "Event"
          : state.phase === "ending"
            ? "Truth Revealed"
            : state.phase === "alt_ending"
              ? "Guardian's Vigil"
              : state.phase === "defeat"
                ? "Defeat"
                : state.phase === "intro"
                  ? "Intro"
                  : "Exploration Mode";
  }

  refs.controlHint.textContent =
    state.phase === "explore"
      ? "WASD / Arrows to move \u00b7 [I] Open Inventory \u00b7 Touch markers, monsters, or the exit."
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
      state.phase === "explore" ? "Explore. Events and enemies react when touched." : "No active encounter.";
    refs.enemyPanel.style.opacity = "0.72";
  }
}
