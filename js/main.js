import { renderIntro } from "./combat.js";
import { bindMovementKeys, updateExploration } from "./exploration.js";
import { draw, initRenderer } from "./renderer.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

initRenderer(ctx);
bindMovementKeys();

function gameLoop() {
  updateExploration();
  draw();
  requestAnimationFrame(gameLoop);
}

renderIntro();
requestAnimationFrame(gameLoop);
