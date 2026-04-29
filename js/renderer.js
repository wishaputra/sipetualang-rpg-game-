import { cave } from "./data.js";
import { state } from "./gameState.js";
import { drawOverlays } from "./effects.js";
import { randomInt } from "./utils.js";

let ctx;

export function initRenderer(canvasContext) {
  ctx = canvasContext;
}

export function drawCave() {
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

export function drawExit() {
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

export function drawEvents() {
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

export function drawMemories() {
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

export function drawKnight() {
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

export function drawMonster(monster) {
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

export function drawLighting() {
  if (state.phase === "battle" || state.phase === "ending") return;

  ctx.save();
  const light = ctx.createRadialGradient(
    state.player.x,
    state.player.y,
    28,
    state.player.x,
    state.player.y,
    state.torchLit ? 245 : 155
  );
  light.addColorStop(0, "rgba(0, 0, 0, 0)");
  light.addColorStop(1, state.torchLit ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, cave.width, cave.height);
  ctx.restore();
}

export function drawBattleScene() {
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

export function draw() {
  const shake = state.flash.shake > 0 ? state.flash.shake * 6 : 0;
  if (shake > 0) {
    ctx.save();
    ctx.translate(randomInt(-shake, shake), randomInt(-shake, shake));
  }

  if (state.phase === "battle") {
    drawBattleScene();
    drawOverlays(ctx);
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
    ctx.fillText(
      state.memoryFragments >= 3 ? "Now You Remember" : "You Were Never The Hero",
      state.memoryFragments >= 3 ? 230 : 198,
      248
    );
  }

  if (state.phase === "alt_ending") {
    ctx.fillStyle = state.endingStage === 1 ? "rgba(74, 4, 4, 0.45)" : "rgba(74, 4, 4, 0.70)";
    ctx.fillRect(0, 0, cave.width, cave.height);
    ctx.fillStyle = "#f2f4f8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("The New Guardian", 240, 248);
  }

  if (state.phase === "defeat") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, cave.width, cave.height);
    ctx.fillStyle = "#f2f4f8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("Defeat", 318, 248);
  }

  drawOverlays(ctx);
  if (shake > 0) ctx.restore();
}
