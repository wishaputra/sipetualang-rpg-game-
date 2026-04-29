import { eventEnemy } from "./data.js";
import { state } from "./gameState.js";
import { playTone } from "./audio.js";
import { startBattle, startExploration, nudgePlayerFromEncounter } from "./combat.js";
import { triggerDialogue } from "./dialogue.js";
import { log, refs, setActions, showDamage, updateHud } from "./ui.js";

export function startEvent(event) {
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

export function currentEvent() {
  return state.events.find((event) => event.id === state.activeEventId);
}

export function markCurrentEventResolved() {
  const event = currentEvent();
  if (event) event.resolved = true;
}

export function resolveEvent(message) {
  markCurrentEventResolved();
  nudgePlayerFromEncounter();
  startExploration(message);
}

export function collectMemory(memory) {
  memory.collected = true;
  state.memoryFragments += 1;
  refs.sceneTitle.textContent = "Memory Fragment";
  refs.messageText.textContent = memory.text;
  log(`${memory.text} (${state.memoryFragments}/3)`);
  showDamage(`MEMORY ${state.memoryFragments}/3`, "player");
  playTone(290 + state.memoryFragments * 55, 0.22, "sine", 0.045);
  updateHud();
}

export function takeSkeletonItem() {
  state.player.inventory.potion += 1;
  state.player.inventory.bomb += 1;
  playTone(420, 0.12, "triangle", 0.04);
  resolveEvent("You take a potion and a small bomb from the satchel. The fallen knight's visor turns toward you after you step away.");
}

export function respectSkeleton() {
  if (!state.player.blessing) {
    state.player.blessing = true;
    state.player.maxHp += 5;
    state.player.hp += 5;
  }
  playTone(260, 0.18, "sine", 0.04);
  resolveEvent("You lower your cracked sword in respect. A quiet warmth enters your armor: Max HP +5.");
}

export function lightTorch() {
  state.torchLit = true;
  playTone(520, 0.18, "sawtooth", 0.035);
  resolveEvent("The torch catches. The cave opens slightly around the light, and the shadows lose some of their teeth.");
}

export function investigateSound() {
  markCurrentEventResolved();
  triggerDialogue("whisper");
  startBattle(eventEnemy, "event");
}
