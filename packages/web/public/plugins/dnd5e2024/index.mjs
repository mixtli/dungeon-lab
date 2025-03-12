console.log('D&D 5E PLUGIN LOADED SUCCESSFULLY - FROM PUBLIC DIR');

// Export a basic plugin object
export default {
  name: 'dnd5e2024',
  version: '0.1.0',
  type: 'gameSystem',
  config: {
    id: 'dnd5e2024',
    name: 'D&D 5e 2024 Edition',
    version: '0.1.0'
  },
  gameSystem: {
    name: 'D&D 5e 2024 Edition',
    actorTypes: [],
    itemTypes: []
  },
  onLoad: async () => {
    console.log('D&D 5e Plugin loaded from public directory!');
    return Promise.resolve();
  },
  onUnload: async () => Promise.resolve(),
  onRegister: async () => Promise.resolve(),
  getActorSheet: () => null,
  getItemSheet: () => null,
  validateActorData: () => ({ success: true }),
  validateItemData: () => ({ success: true })
}; 