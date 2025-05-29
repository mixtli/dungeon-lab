import { IGameSystemPlugin } from '@dungeon-lab/shared/types/index.mjs';
import { ServerPlugin } from '@dungeon-lab/shared/base/server.mjs';
import { validateActorData, validateItemData, validateVTTDocumentData } from '../shared/validation.mjs';
import config from '../../manifest.json' with { type: 'json' };

export class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  public type = 'gameSystem' as const;

  constructor() {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
  }

  validateActorData = validateActorData;
  validateItemData = validateItemData;
  validateVTTDocumentData = validateVTTDocumentData;
}

// Export an instance of the plugin
export default new DnD5e2024ServerPlugin(); 