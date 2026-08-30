jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));


describe('Supabase Client', () => {
  it('should initialize without crashing', () => {
    const { supabase } = require('../src/services/supabase/client');
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
