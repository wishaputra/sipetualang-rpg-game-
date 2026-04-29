import { cave, finalBoss, punishmentBoss } from "./data.js";
import { state } from "./gameState.js";
import { playFootstep } from "./audio.js";
import { startBattle, startEndingSequence, startAlternateEndingSequence } from "./combat.js";
import { triggerDialogue } from "./dialogue.js";
import { collectMemory, startEvent } from "./events.js";
import { circleCollision, circleRectCollision } from "./utils.js";
import { toggleInventoryMenu, closeInventoryMenu } from "./inventory.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENEMY_SPEED = 0.55; // px per frame — visibly slower than player (2.45)
const DIR_MIN_FRAMES = 45; // minimum frames before direction can change (anti-jitter)
const DIR_MAX_FRAMES = 150; // maximum frames before forced direction re-pick

/** All 8 movement directions (cardinal + diagonal, pre-normalized). */
const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 0.707, dy: 0.707 },
  { dx: -0.707, dy: 0.707 },
  { dx: 0.707, dy: -0.707 },
  { dx: -0.707, dy: -0.707 },
];

// ---------------------------------------------------------------------------
// Player movement helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Enemy movement helpers
// ---------------------------------------------------------------------------

/** Check whether a monster can stand at (x, y) without overlapping walls/rocks. */
function canMonsterMoveTo(monster, x, y) {
  const candidate = { x, y, radius: monster.radius };
  return (
    !cave.walls.some((wall) => circleRectCollision(candidate, wall)) &&
    !cave.rocks.some((rock) => circleCollision(candidate, rock))
  );
}

/**
 * Pick a new movement direction for a monster.
 * Biases toward patrol origin when the monster has drifted out of range.
 * Falls back to null (pause) if all directions are blocked.
 */
function pickNewDirection(monster) {
  const ox = monster.patrolOrigin.x - monster.x;
  const oy = monster.patrolOrigin.y - monster.y;
  const distToOrigin = Math.hypot(ox, oy);

  let dirs = [...DIRECTIONS];

  if (distToOrigin > monster.patrolRange) {
    // Sort directions by how well they aim back toward origin
    const biasDx = ox / distToOrigin;
    const biasDy = oy / distToOrigin;
    dirs.sort(
      (a, b) =>
        b.dx * biasDx + b.dy * biasDy - (a.dx * biasDx + a.dy * biasDy)
    );
  } else {
    // Shuffle randomly
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
  }

  for (const dir of dirs) {
    const nx = monster.x + dir.dx * ENEMY_SPEED;
    const ny = monster.y + dir.dy * ENEMY_SPEED;
    const inRange =
      Math.hypot(nx - monster.patrolOrigin.x, ny - monster.patrolOrigin.y) <=
      monster.patrolRange;
    if (canMonsterMoveTo(monster, nx, ny) && inRange) {
      return dir;
    }
  }

  return null; // all blocked — monster will pause this tick
}

/**
 * Advance every non-defeated monster by one frame of patrol movement.
 * Direction is persistent; changes only on wall collision, range overflow,
 * or timer expiry. Anti-jitter: minimum DIR_MIN_FRAMES between direction picks.
 */
export function updateEnemyMovement() {
  if (state.phase !== "explore") return;
  // Freeze enemy movement while inventory is open or item-use lock is active
  if (state.inventoryOpen || state.itemUseLock) return;

  state.monsters
    .filter((m) => !m.defeated)
    .forEach((monster) => {
      monster.moveDirTimer -= 1;

      const nx = monster.x + monster.moveDir.dx * ENEMY_SPEED;
      const ny = monster.y + monster.moveDir.dy * ENEMY_SPEED;

      const hitWall = !canMonsterMoveTo(monster, nx, ny);
      const outOfRange =
        Math.hypot(nx - monster.patrolOrigin.x, ny - monster.patrolOrigin.y) >
        monster.patrolRange;
      const timerExpired = monster.moveDirTimer <= 0;

      if (!hitWall && !outOfRange && !timerExpired) {
        // Happy path — just move
        monster.x = nx;
        monster.y = ny;
        return;
      }

      // ── Wall collision: try axis-sliding before re-picking direction ─────
      if (hitWall && !timerExpired) {
        // Try sliding along X axis
        const slideNy = monster.y + monster.moveDir.dy * ENEMY_SPEED;
        const slideNx = monster.x + monster.moveDir.dx * ENEMY_SPEED;

        const canSlideY =
          Math.abs(monster.moveDir.dy) > 0 &&
          canMonsterMoveTo(monster, monster.x, slideNy) &&
          Math.hypot(monster.x - monster.patrolOrigin.x, slideNy - monster.patrolOrigin.y) <=
            monster.patrolRange;

        const canSlideX =
          Math.abs(monster.moveDir.dx) > 0 &&
          canMonsterMoveTo(monster, slideNx, monster.y) &&
          Math.hypot(slideNx - monster.patrolOrigin.x, monster.y - monster.patrolOrigin.y) <=
            monster.patrolRange;

        if (canSlideY) {
          monster.y = slideNy;
          return;
        }
        if (canSlideX) {
          monster.x = slideNx;
          return;
        }
        // Both slides blocked — fall through to direction re-pick
      }

      // ── Pick a new direction ─────────────────────────────────────────────
      const newDir = pickNewDirection(monster);

      if (newDir) {
        monster.moveDir = newDir;
        // Randomize next timer to prevent all monsters syncing direction changes
        monster.moveDirTimer =
          Math.floor(Math.random() * (DIR_MAX_FRAMES - DIR_MIN_FRAMES)) +
          DIR_MIN_FRAMES;

        // Move in the new direction this frame (avoids a wasted frame of standing still)
        const nnx = monster.x + newDir.dx * ENEMY_SPEED;
        const nny = monster.y + newDir.dy * ENEMY_SPEED;
        if (canMonsterMoveTo(monster, nnx, nny)) {
          monster.x = nnx;
          monster.y = nny;
        }
      } else {
        // Completely blocked — pause for a short duration then retry
        monster.moveDirTimer = 30;
      }
    });
}

// ---------------------------------------------------------------------------
// Main exploration update (called every frame)
// ---------------------------------------------------------------------------

export function updateExploration() {
  if (state.phase !== "explore") return;

  // ── Enemy patrol movement ────────────────────────────────────────────────
  updateEnemyMovement();

  // ── Player movement (blocked while inventory open or item lock active) ───
  if (!state.inventoryOpen && !state.itemUseLock) {
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
  }

  // ── Collision checks (skipped when inventory open) ───────────────────────
  if (state.inventoryOpen) return;

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

  if (circleRectCollision(state.player, cave.exit)) {
    const isRushing =
      state.monsters.some((m) => !m.defeated) || state.events.some((e) => !e.resolved);

    if (isRushing) {
      if (!state.punishmentStarted) {
        state.punishmentStarted = true;
        startBattle(punishmentBoss, "punishment");
      } else if (state.punishmentDefeated) {
        startAlternateEndingSequence();
      }
      return;
    }

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

// ---------------------------------------------------------------------------
// Key binding
// ---------------------------------------------------------------------------

export function bindMovementKeys() {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const movementKeys = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"];

    if (movementKeys.includes(key)) {
      event.preventDefault();
      state.keys.add(key);
    }

    // [I] — toggle inventory (explore phase only)
    if (key === "i") {
      event.preventDefault();
      if (state.phase === "explore") {
        toggleInventoryMenu();
      }
    }

    // [Esc] — close inventory if open
    if (key === "escape" && state.inventoryOpen) {
      event.preventDefault();
      closeInventoryMenu();
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.toLowerCase());
  });
}
