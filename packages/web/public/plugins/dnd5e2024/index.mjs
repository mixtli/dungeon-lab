
// Export a basic plugin object
export default {
  name: 'dnd5e2024',
  version: '0.1.0',
  author: 'Ron McClain',
  description: 'A plugin for the D&D 5e system',
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
    return Promise.resolve();
  },
  onUnload: async () => Promise.resolve(),
  onRegister: async () => Promise.resolve(),
  getActorSheet: () => null,
  getItemSheet: () => null,
  validateActorData: () => ({ success: true }),
  validateItemData: () => ({ success: true })
}; 