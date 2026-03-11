/**
 * Haptics utility for PWA vibration feedback.
 * All patterns are [vibrate, pause, vibrate, pause, ...] in milliseconds.
 */

export const haptics = {
  /**
   * A very short, sharp tick. Good for button presses.
   */
  light: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * A medium pulse. Good for primary actions.
   */
  medium: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Three quick ticks. The custom pattern for NFC taps.
   */
  nfcTap: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([15, 30, 15, 30, 15]);
    }
  },

  /**
   * Two quick pulses. Good for successful actions (e.g., saved, uploaded).
   */
  success: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([35, 65, 35]);
    }
  },

  /**
   * Two long pulses. Good for errors or warnings.
   */
  error: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },

  /**
   * A heavier mechanical "clunk" feel.
   */
  heavy: () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(60);
    }
  },

  /**
   * Custom vibration pattern.
   */
  custom: (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }
};
