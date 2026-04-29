import { cave } from "./data.js";
import { state } from "./gameState.js";

export function triggerFlash(type, amount = 1) {
  state.flash[type] = Math.max(state.flash[type] || 0, amount);
}

export function drawOverlays(ctx) {
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
