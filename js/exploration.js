import { cave, finalBoss } from "./data.js";
import { state } from "./gameState.js";
import { playFootstep } from "./audio.js";
import { startBattle, startEndingSequence } from "./combat.js";
import { triggerDialogue } from "./dialogue.js";
import { collectMemory, startEvent } from "./events.js";
import { circleCollision, circleRectCollision } from "./utils.js";

export function keyDirection() {
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

export function canMoveTo(x, y) {
  const candidate = { x, y, radius: state.player.radius };
  const hitsWall = cave.walls.some((wall) => circleRectCollision(candidate, wall));
  const hitsRock = cave.rocks.some((rock) => circleCollision(candidate, rock));
  return !hitsWall && !hitsRock;
}

export function updateExploration() {
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

export function bindMovementKeys() {
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
}
