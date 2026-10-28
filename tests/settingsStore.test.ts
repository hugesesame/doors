import { describe, expect, it } from 'vitest';
import { storageSettingsStore } from '../src/app/settingsStore';

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

const broken = (): Storage => ({
  ...memoryStorage(),
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
});

describe('storageSettingsStore', () => {
  it('reads back what it saved', () => {
    const store = storageSettingsStore(memoryStorage());
    store.save({ crossfade: 6, format: 'flac' });
    expect(store.load()).toEqual({ crossfade: 6, format: 'flac' });
  });

  it('reads nothing when nothing was saved or the value is not JSON', () => {
    const storage = memoryStorage();
    expect(storageSettingsStore(storage).load()).toEqual({});
    storage.setItem('bgm-mixer-settings', '{oops');
    expect(storageSettingsStore(storage).load()).toEqual({});
  });

  it('works without storage at all', () => {
    for (const storage of [broken(), null]) {
      const store = storageSettingsStore(storage);
      expect(() => store.save({ crossfade: 6, format: 'flac' })).not.toThrow();
      expect(store.load()).toEqual({});
    }
  });
});
