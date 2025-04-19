/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImport } from './import-utils.mjs';
import { convert5eToolsMonster } from './convert-5etools-monster.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { uploadFile, getPublicUrl } from '@dungeon-lab/server/src/services/storage.service.mjs';
import * as mimeTypes from 'mime-types';
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function uploadMonsterImage(imagePath: string): Promise<string | undefined> {
    try {
        const fullPath = join(__dirname, '../../submodules/5etools-img', imagePath);
        const buffer = await readFile(fullPath);
        const contentType = mimeTypes.lookup(imagePath) || 'image/jpeg';
        const fileName = imagePath.split('/').pop() || 'monster.jpg';
        
        const { key } = await uploadFile(buffer, fileName, contentType, 'monsters');
        return getPublicUrl(key);
    } catch (error) {
        console.error(`Failed to upload image ${imagePath}:`, error);
        return undefined;
    }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
    // First read the fluff data
    const fluffData = JSON.parse(
        await readFile(join(__dirname, '../../data/fluff-bestiary-xmm.json'), 'utf-8')
    );
    
    // Create a map of monster names to their fluff data
    const fluffMap = new Map();
    for (const fluff of fluffData.monsterFluff) {
        fluffMap.set(fluff.name, fluff);
    }
    
    // Run the import with the fluff data
    runImport({
        documentType: 'monster',
        dataFile: 'bestiary-xmm.json',
        dataKey: 'monster',
        converter: async (data: any) => {
            const { monster, imagePath } = convert5eToolsMonster(data, fluffMap.get(data.name));
            let token: string | undefined;
            
            if (imagePath) {
                token = await uploadMonsterImage(imagePath);
            }
            
            return {
                name: monster.name,
                type: 'monster',
                pluginId: config.id,
                gameSystemId: config.id,
                data: monster,
                token
            };
        },
        dirPath: join(__dirname, '../../data'),
        isActor: true // Specify that we're importing an actor
    }).catch(console.error);
} 