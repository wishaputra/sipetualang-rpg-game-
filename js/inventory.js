import { itemCatalog } from "./data.js";
import { state } from "./gameState.js";
import { playTone } from "./audio.js";
import { log, refs, restoreMp, showDamage, updateHud } from "./ui.js";

const ITEM_COOLDOWN_MS = 2000; // per-item cooldown duration
const ITEM_USE_LOCK_MS = 400;  // brief movement freeze after any item use

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function toggleInventoryMenu() {
  if (state.inventoryOpen) {
    closeInventoryMenu();
  } else {
    openInventoryMenu();
  }
}

export function openInventoryMenu() {
  if (state.inventoryOpen) return;
  state.inventoryOpen = true;
  renderInventoryMenu();
  updateHud();
}

export function closeInventoryMenu() {
  state.inventoryOpen = false;
  const existing = document.getElementById("inventoryOverlay");
  if (existing) existing.remove();
  updateHud();
}

// ---------------------------------------------------------------------------
// Render overlay
// ---------------------------------------------------------------------------

export function renderInventoryMenu() {
  // Remove stale overlay if present
  const stale = document.getElementById("inventoryOverlay");
  if (stale) stale.remove();

  const overlay = document.createElement("div");
  overlay.id = "inventoryOverlay";
  overlay.className = "inventory-overlay";

  const panel = document.createElement("div");
  panel.className = "inventory-panel";

  // ── Header ────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "inv-header";

  const title = document.createElement("h2");
  title.textContent = "Inventory";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "inv-close";
  closeBtn.setAttribute("aria-label", "Close inventory");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", closeInventoryMenu);

  header.append(title, closeBtn);
  panel.appendChild(header);

  // ── Item list ─────────────────────────────────────────────────
  const list = document.createElement("div");
  list.className = "inv-list";

  const now = Date.now();

  itemCatalog.forEach((item) => {
    const count = state.player.inventory[item.id] || 0;
    const cooldownEnd = state.itemCooldowns[item.id] || 0;
    const onCooldown = now < cooldownEnd;
    const remainingMs = onCooldown ? cooldownEnd - now : 0;

    const isBattleOnly = item.type === "damage" || item.type === "smoke";
    const isFull =
      (item.type === "heal" && state.player.hp === state.player.maxHp) ||
      (item.type === "mp" && state.player.mp === state.player.maxMp);

    const row = document.createElement("div");
    row.className = "inv-item";

    // Info column
    const info = document.createElement("div");
    info.className = "inv-info";

    const nameRow = document.createElement("div");
    nameRow.className = "inv-name-row";

    const nameEl = document.createElement("span");
    nameEl.className = "inv-name";
    nameEl.textContent = item.name;

    const badge = document.createElement("span");
    badge.className = "inv-badge";
    badge.textContent = `x${count}`;

    nameRow.append(nameEl, badge);

    const descEl = document.createElement("p");
    descEl.className = "inv-desc";
    descEl.textContent = item.description;

    info.append(nameRow, descEl);

    // Button column
    const btnWrap = document.createElement("div");
    btnWrap.className = "inv-btn-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inv-use-btn";

    if (isBattleOnly) {
      btn.textContent = "Battle only";
      btn.disabled = true;
      btn.title = "Only usable during combat.";
    } else {
      btn.textContent = onCooldown ? "Cooling…" : "Use";
      btn.disabled = count <= 0 || isFull || onCooldown;
      if (isFull) {
        btn.title = item.type === "heal" ? "HP is already full." : "MP is already full.";
      }
      btn.addEventListener("click", () => useItemOutOfBattle(item));
    }

    // Cooldown bar
    const barTrack = document.createElement("div");
    barTrack.className = "cooldown-bar-track";
    const barFill = document.createElement("div");
    barFill.className = "cooldown-bar-fill";

    if (onCooldown) {
      const startPct = (remainingMs / ITEM_COOLDOWN_MS) * 100;
      barFill.style.width = `${startPct}%`;
      // Trigger CSS transition to 0% over remaining duration
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          barFill.style.transition = `width ${remainingMs}ms linear`;
          barFill.style.width = "0%";
        });
      });
    } else {
      barFill.style.width = "0%";
    }

    barTrack.appendChild(barFill);
    btnWrap.append(btn, barTrack);

    row.append(info, btnWrap);
    list.appendChild(row);
  });

  panel.appendChild(list);

  // ── Footer hint ───────────────────────────────────────────────
  const hint = document.createElement("p");
  hint.className = "inv-hint";
  hint.textContent = "Press [I] or [Esc] to close";
  panel.appendChild(hint);

  overlay.appendChild(panel);

  // Click backdrop to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeInventoryMenu();
  });

  const canvasWrap = document.querySelector(".canvas-wrap");
  canvasWrap.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Item usage outside battle
// ---------------------------------------------------------------------------

export function useItemOutOfBattle(item) {
  const count = state.player.inventory[item.id] || 0;
  if (count <= 0 || state.itemUseLock) return;

  // Battle-only guard
  if (item.type === "damage" || item.type === "smoke") return;

  const now = Date.now();
  if ((state.itemCooldowns[item.id] || 0) > now) return;

  // Full-stat guards (no item consumed on invalid use)
  if (item.type === "heal" && state.player.hp === state.player.maxHp) {
    refs.messageText.textContent = "HP is already full.";
    return;
  }
  if (item.type === "mp" && state.player.mp === state.player.maxMp) {
    refs.messageText.textContent = "MP is already full.";
    return;
  }

  // Consume
  state.player.inventory[item.id] = count - 1;

  if (item.type === "heal") {
    const healed = Math.min(item.heal, state.player.maxHp - state.player.hp);
    state.player.hp += healed;
    refs.messageText.textContent = `HP restored: +${healed}.`;
    log(`${item.name}: restored ${healed} HP (exploration).`);
    showDamage(`+${healed}`, "player");
    playTone(330, 0.14, "sine", 0.04);
  } else if (item.type === "mp") {
    const restored = restoreMp(item.restoreMp);
    refs.messageText.textContent = `MP restored: +${restored}.`;
    playTone(390, 0.14, "sine", 0.04);
  } else if (item.type === "permhp") {
    state.player.maxHp += item.hpBonus;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.hpBonus);
    refs.messageText.textContent = `The Ancient Core pulses... Max HP permanently +${item.hpBonus}.`;
    log(`Ancient Core: Max HP +${item.hpBonus} (exploration).`);
    showDamage(`+${item.hpBonus} MaxHP`, "player");
    playTone(440, 0.2, "sine", 0.05);
  }

  // Per-item cooldown
  state.itemCooldowns[item.id] = Date.now() + ITEM_COOLDOWN_MS;

  // Brief movement freeze so usage feels intentional
  state.itemUseLock = true;
  window.setTimeout(() => {
    state.itemUseLock = false;
  }, ITEM_USE_LOCK_MS);

  updateHud();
  renderInventoryMenu(); // re-render to reflect updated counts and cooldowns
}
