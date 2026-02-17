import "@testing-library/jest-dom/vitest";

// Mock chrome API
const storageMock: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    sync: {
      get: vi.fn((keys: string | string[]) => {
        if (typeof keys === "string") {
          return Promise.resolve({ [keys]: storageMock[keys] });
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = storageMock[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storageMock, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keyArr = typeof keys === "string" ? [keys] : keys;
        for (const key of keyArr) {
          delete storageMock[key];
        }
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as unknown as typeof chrome;
