// Haptics via navigator.vibrate (web standard). Respects the global haptic
// toggle from lib/sounds. `react-haptic-feedback` isn't on npm (404), so we
// use the native Vibrate API directly — same effect, zero dependency.
import { getSoundSettings } from "./sounds";

export const HAPTIC = {
  TAP: 3,
  CORRECT: 5,
  WRONG: [10, 40, 10] as number[],
  COMPLETE: 50,
  NODE: 20,
};

export function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (!getSoundSettings().haptic) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}