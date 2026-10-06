/**
 * Global back navigation stack for mobile hardware/gesture Back button and Escape key.
 * Modals and subviews register dismissal callbacks.
 * If no modals are open, the app navigates back to previous screen or default tab.
 */

type BackHandler = () => boolean; // return true if handled/dismissed, false to pass through

const backHandlers: BackHandler[] = [];

/**
 * Registers a dismiss callback. Call the returned cleanup function to unregister.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const index = backHandlers.lastIndexOf(handler);
    if (index !== -1) {
      backHandlers.splice(index, 1);
    }
  };
}

/**
 * Attempts to handle the back action by invoking the topmost handler in LIFO order.
 * Returns true if an action was handled.
 */
export function triggerBackAction(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    const handler = backHandlers[i];
    if (handler && handler()) {
      return true;
    }
  }
  return false;
}

