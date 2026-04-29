import { state } from "./gameState.js";
import { log, refs } from "./ui.js";

export function triggerDialogue(kind) {
  if (state.dialogueFlags[kind]) return;

  const lines = {
    lowHp: "My body... it's failing...",
    whisper: "This presence... it feels familiar...",
    exit: "Why does the light feel... wrong?",
  };

  const line = lines[kind];
  if (!line) return;

  state.dialogueFlags[kind] = true;
  refs.messageText.textContent = line;
  log(`Voice: ${line}`);
}
