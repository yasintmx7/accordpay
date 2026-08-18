'use client';

/**
 * Triggers subtle haptic feedback patterns on supported mobile devices.
 * Safely degrades to a no-op if the Vibration API is unsupported or blocked.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'success':
        navigator.vibrate([10, 30, 15]);
        break;
      case 'warning':
        navigator.vibrate([20, 40, 20]);
        break;
      case 'error':
        navigator.vibrate([30, 50, 30]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // Ignore any browser permission or policy restrictions
  }
}
