import type { Settings, SettingsStore } from './app';

const KEY = 'bgm-mixer-settings';

/** The browser's localStorage, or null where reaching it throws (blocked site data). */
export function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps the settings in `storage`. Remembering them is a convenience: when storage
 * is missing or refuses, the app simply starts from the defaults.
 */
export function storageSettingsStore(storage: Storage | null): SettingsStore {
  return {
    load() {
      try {
        const value: unknown = JSON.parse(storage?.getItem(KEY) ?? '{}');
        return typeof value === 'object' && value !== null ? value : {};
      } catch {
        return {};
      }
    },
    save(settings: Settings) {
      try {
        storage?.setItem(KEY, JSON.stringify(settings));
      } catch {
        // Not remembering the settings is fine.
      }
    },
  };
}
