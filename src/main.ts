import './ui/styles.css';
import dialogsJson from './content/generated/dialogs.json';
import giftsJson from './content/generated/gifts.json';
import type { DialogDef, GiftsData } from './content/schema';
import { Game } from './app/Game';
import { initStorage, loadSave } from './engine/saveStorage';
import { freshState } from './gameplay/GameState';
import { showStart } from './ui/StartScreen';
import { runFinale } from './ui/Finale';
import { showFallback, showMobileWarning } from './ui/Fallback';

const dialogs = dialogsJson as unknown as DialogDef[];
const gifts = giftsJson as unknown as GiftsData;

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  const ui = document.getElementById('ui')!;
  const params = new URLSearchParams(location.search);
  if (params.has('epilogue')) {
    void runFinale(ui, null, null);
    return;
  }
  if (!hasWebGL2()) {
    showFallback(ui);
    return;
  }
  initStorage();
  await showMobileWarning(ui);
  const saved = loadSave();
  const debug = !!import.meta.env.VITE_DEBUG_TOKEN && params.get('debug') === import.meta.env.VITE_DEBUG_TOKEN;
  const choice = await showStart(ui, gifts, { hasSave: !!saved?.started, gatePassed: !!saved?.startGatePassed, skipAfterSec: debug ? 0 : undefined }, () => {});
  const state = choice.action === 'continue' && saved ? saved : freshState(saved?.settings);
  state.startGatePassed = state.startGatePassed || choice.gatePassed;
  const game = new Game(state, gifts, dialogs);
  if (state.settings.ambient !== false) void game.audio.start();
  if (import.meta.env.VITE_DEBUG_TOKEN && debug) (await import('./app/debug')).installDebug(game);
  await game.start();
}

void boot();
