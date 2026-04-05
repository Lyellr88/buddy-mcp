import type { KeyEvent } from '@opentui/core';
import type { KeyHandler } from '@opentui/core';

type Mode = 'browse' | 'confirmApply' | 'confirmDelete';

export interface GalleryKeyboardCallbacks {
  onApply: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onModeChange: (mode: Mode) => void;
}

export interface GalleryKeyboardController {
  mode: () => Mode;
  destroy: () => void;
}

export function setupGalleryKeyboard(
  keyInput: KeyHandler,
  canDelete: () => boolean,
  callbacks: GalleryKeyboardCallbacks,
): GalleryKeyboardController {
  let current: Mode = 'browse';

  function setMode(next: Mode): void {
    current = next;
    callbacks.onModeChange(current);
  }

  function handleKeyPress(key: KeyEvent): void {
    if (key.ctrl && key.name === 'c') {
      callbacks.onCancel();
      return;
    }

    if (current !== 'browse') {
      if (key.name === 'return' || key.name === 'y') {
        const action = current === 'confirmApply' ? callbacks.onApply : callbacks.onDelete;
        setMode('browse');
        action();
      } else if (key.name === 'escape' || key.name === 'n') {
        setMode('browse');
      }
      return;
    }

    if (key.name === 'return') {
      setMode('confirmApply');
    } else if (key.name === 'd' && canDelete()) {
      setMode('confirmDelete');
    } else if (key.name === 'escape') {
      callbacks.onCancel();
    }
  }

  keyInput.on('keypress', handleKeyPress);

  return {
    mode: () => current,
    destroy: () => {
      keyInput.removeListener('keypress', handleKeyPress);
    },
  };
}
