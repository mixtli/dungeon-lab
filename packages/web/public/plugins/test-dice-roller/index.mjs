console.log('TEST DICE ROLLER PLUGIN LOADED SUCCESSFULLY - FROM PUBLIC DIR');

// Export a basic plugin object
export default {
  name: 'test-dice-roller',
  version: '1.0.0',
  type: 'extension',
  config: {
    id: 'test-dice-roller',
    name: 'Test Dice Roller',
    version: '1.0.0'
  },
  onLoad: async () => {
    console.log('Test Dice Roller Plugin loaded from public directory!');
    return Promise.resolve();
  },
  onUnload: async () => Promise.resolve(),
  onRegister: async () => Promise.resolve()
}; 