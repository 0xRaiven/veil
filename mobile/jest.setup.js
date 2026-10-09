/* eslint-env jest */

// Polyfill url
jest.mock('react-native-url-polyfill/auto', () => ({}));

// EncryptedStorage native bridge shim
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// NetInfo native bridge shim
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

// SQLite native bridge shim
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(() => ({ rows: { _array: [], length: 0 } })),
    executeAsync: jest.fn().mockResolvedValue({ rows: { _array: [], length: 0 } }),
    close: jest.fn(),
  })),
}));

// Firebase Messaging native bridge shim
jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    getToken: jest.fn().mockResolvedValue(null),
    requestPermission: jest.fn().mockResolvedValue(1),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  });
  return {
    __esModule: true,
    default: messaging,
    getMessaging: messaging,
    requestPermission: jest.fn().mockResolvedValue(1),
    getToken: jest.fn().mockResolvedValue(null),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  };
});

// Safe Area Context native bridge shim
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/lib/commonjs/jest/mock').default
);

// React Native Screens native bridge shim
jest.mock('react-native-screens', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    enableScreens: jest.fn(),
    screensEnabled: jest.fn(() => true),
    Screen: View,
    ScreenContainer: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackItem: ({ children }) => React.createElement(View, null, children),
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderTitleView: View,
    ScreenStackHeaderCenterView: View,
    SearchBar: View,
    compatibilityFlags: {},
  };
});

// File system shims using real node fs & os
jest.mock('react-native-fs', () => {
  const nodeFs = require('fs');
  const nodeOs = require('os');
  const nodePath = require('path');
  const docs = nodePath.join(nodeOs.tmpdir(), 'veil_docs');
  const cache = nodePath.join(nodeOs.tmpdir(), 'veil_cache');
  return {
    mkdir: jest.fn().mockImplementation((dir) => nodeFs.promises.mkdir(dir, { recursive: true })),
    moveFile: jest.fn().mockImplementation((src, dest) => nodeFs.promises.rename(src, dest)),
    copyFile: jest.fn().mockImplementation((src, dest) => nodeFs.promises.copyFile(src, dest)),
    unlink: jest.fn().mockImplementation((filepath) => nodeFs.promises.unlink(filepath).catch(() => {})),
    exists: jest.fn().mockImplementation((filepath) => Promise.resolve(nodeFs.existsSync(filepath))),
    DocumentDirectoryPath: docs,
    CachesDirectoryPath: cache,
  };
});

// SVG shims
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Image picker shims
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
  launchCamera: jest.fn().mockResolvedValue({ didCancel: true }),
}));

// Contacts shims
jest.mock('react-native-contacts', () => ({
  getAll: jest.fn().mockResolvedValue([]),
  checkPermission: jest.fn().mockResolvedValue('authorized'),
  requestPermission: jest.fn().mockResolvedValue('authorized'),
}));

// Lucide icon components
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const View = require('react-native').View;
  return new Proxy(
    {},
    {
      get: () => {
        return (props) => React.createElement(View, props);
      },
    }
  );
});

// Real Node.js cryptographic hashing and UUID generation
jest.mock('react-native-quick-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    createHash: (algorithm) => nodeCrypto.createHash(algorithm),
    randomUUID: () => nodeCrypto.randomUUID(),
  };
});
