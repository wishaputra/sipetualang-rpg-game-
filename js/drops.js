import { itemCatalog } from "./data.js";
import { state } from "./gameState.js";

/**
 * Roll a random drop from a drop table using cumulative weighted selection.
 * Includes a ~30% global miss chance and a light pity system.
 * @param {Array} dropTable  - Array of { id, weight }
 * @param {boolean} isBoss   - If true, always returns the first entry (guaranteed)
 * @returns {string|null}    - Item id or null (no drop)
 */
export function rollDrop(dropTable, isBoss = false) {
  if (!dropTable || dropTable.length === 0) return null;

  // Boss always drops its guaranteed item
  if (isBoss) {
    state.battlesWonSinceDrop = 0;
    return dropTable[0].id;
  }

  const totalWeight = dropTable.reduce((sum, e) => sum + e.weight, 0);
  // Roll over a range 43% larger than total weight to create a miss chance
  const roll = Math.random() * (totalWeight * 1.43);

  let cumulative = 0;
  for (const entry of dropTable) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      state.battlesWonSinceDrop = 0;
      return entry.id;
    }
  }

  // Miss — check pity threshold (3 battles without drop)
  if (state.battlesWonSinceDrop >= 2) {
    state.battlesWonSinceDrop = 0;
    // Force the lowest-weight item (rarest, but still a reward)
    const sorted = [...dropTable].sort((a, b) => a.weight - b.weight);
    return sorted[0].id;
  }

  state.battlesWonSinceDrop += 1;
  return null;
}

/**
 * Add a dropped item to the player's inventory.
 * Does NOT show message — message staging is handled in combat.js winBattle().
 * @param {string} itemId
 */
export function applyDrop(itemId) {
  if (!itemId) return;
  if (state.player.inventory[itemId] === undefined) {
    state.player.inventory[itemId] = 0;
  }
  state.player.inventory[itemId] += 1;
}

/**
 * Resolve a display name for an item id.
 * @param {string} itemId
 * @returns {string}
 */
export function getItemName(itemId) {
  const item = itemCatalog.find((i) => i.id === itemId);
  return item ? item.name : itemId;
}
