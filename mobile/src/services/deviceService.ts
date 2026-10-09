import { Platform } from 'react-native';

export interface DeviceInfo {
  brand: string;
  model: string;
  osName: string;
  osVersion: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
}

export const getDeviceInfo = (): DeviceInfo => {
  if (Platform.OS === 'android') {
    const constants = (Platform.constants || {}) as any;
    const brand = constants.Brand ? constants.Brand.charAt(0).toUpperCase() + constants.Brand.slice(1) : 'Android';
    const model = constants.Model || 'Device';
    const release = constants.Release || Platform.Version;
    return {
      brand,
      model,
      osName: 'Android',
      osVersion: `${release}`,
      deviceName: `${brand} ${model}`.trim(),
      platform: 'android',
    };
  }

  if (Platform.OS === 'ios') {
    return {
      brand: 'Apple',
      model: 'iPhone / iPad',
      osName: 'iOS',
      osVersion: `${Platform.Version}`,
      deviceName: 'Apple iOS Device',
      platform: 'ios',
    };
  }

  return {
    brand: 'Generic',
    model: 'Device',
    osName: Platform.OS,
    osVersion: `${Platform.Version}`,
    deviceName: `${Platform.OS} Device`,
    platform: 'unknown',
  };
};
