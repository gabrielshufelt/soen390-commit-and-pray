// devMenuController.ts
// Allows the Settings screen to trigger the UsabilityDevMenu modal
// that is rendered inside UsabilityOverlay without prop drilling.

let _showDevMenu: (() => void) | null = null;

export const registerDevMenuTrigger = (fn: () => void) => {
  _showDevMenu = fn;
};

export const triggerDevMenu = () => {
  _showDevMenu?.();
};
