import type { KeyEvent } from '@opentui/core';
import type { KeyHandler } from '@opentui/core';
import { getVisibleFields, type BuilderField, type BuilderState } from './state.ts';

export interface KeyboardController {
  currentField: () => BuilderField | undefined;
  isConfirming: () => boolean;
  destroy: () => void;
}

export interface KeyboardCallbacks {
  getState: () => BuilderState;
  focusField: (field: BuilderField) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onEnterConfirmMode: () => void;
  onExitConfirmMode: () => void;
}

export function setupKeyboard(
  keyInput: KeyHandler,
  callbacks: KeyboardCallbacks,
): KeyboardController {
  let currentFieldIndex = 0;
  let confirmMode = false;

  function getFields(): BuilderField[] {
    return getVisibleFields(callbacks.getState());
  }

  function focusCurrent(): void {
    const fields = getFields();
    if (fields.length === 0) return;
    if (currentFieldIndex >= fields.length) {
      currentFieldIndex = fields.length - 1;
    }
    if (currentFieldIndex < 0) currentFieldIndex = 0;
    callbacks.focusField(fields[currentFieldIndex]);
  }

  function enterConfirmMode(): void {
    confirmMode = true;
    callbacks.onEnterConfirmMode();
  }

  function exitConfirmMode(): void {
    confirmMode = false;
    callbacks.onExitConfirmMode();
    focusCurrent();
  }

  function handleKeyPress(key: KeyEvent): void {
    if (confirmMode) {
      if (key.name === 'return' || key.name === 'y') {
        callbacks.onConfirm();
      } else if (key.name === 'escape' || key.name === 'n') {
        exitConfirmMode();
      }
      return;
    }

    const fields = getFields();
    if (fields.length === 0) return;

    if (key.name === 'tab' && !key.shift) {
      currentFieldIndex = (currentFieldIndex + 1) % fields.length;
      focusCurrent();
    } else if (key.name === 'tab' && key.shift) {
      currentFieldIndex = (currentFieldIndex - 1 + fields.length) % fields.length;
      focusCurrent();
    } else if (key.name === 'return') {
      if (currentFieldIndex < fields.length - 1) {
        currentFieldIndex++;
        focusCurrent();
      } else {
        enterConfirmMode();
      }
    } else if (key.name === 'escape') {
      callbacks.onCancel();
    }
  }

  keyInput.on('keypress', handleKeyPress);

  // Focus the first field
  focusCurrent();

  return {
    currentField: () => {
      const fields = getFields();
      return fields[currentFieldIndex];
    },
    isConfirming: () => confirmMode,
    destroy: () => {
      keyInput.removeListener('keypress', handleKeyPress);
    },
  };
}
