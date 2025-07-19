/**
 * Document Cache
 * 
 * A caching service for D&D 5e 2024 game documents like classes, backgrounds, species, and feats.
 * This improves performance by loading documents once and providing synchronous access.
 */

import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';

// Import schemas and types for API data validation
import { 
  IBackgroundDocument,
  ISpeciesDocument,
  IFeatDocument
} from '../shared/types/vttdocument.mjs';
import { ICharacterClassDocument } from '../shared/types/character-class.mjs';

// Define document types 
export type DocumentType = 'class' | 'background' | 'species' | 'feat';

// Map cache types to their document interfaces
interface DocumentTypeMap {
  'class': ICharacterClassDocument;
  'background': IBackgroundDocument;
  'species': ISpeciesDocument;
  'feat': IFeatDocument;
}

// Singleton cache instance
let api: IPluginAPI | null = null;
const PLUGIN_ID = 'dnd-5e-2024';

// Simplified cache structure
const cache = {
  'class': [] as ICharacterClassDocument[],
  'background': [] as IBackgroundDocument[],
  'species': [] as ISpeciesDocument[],
  'feat': [] as IFeatDocument[]
};

// Loading state tracking
const loaded = {
  'class': false,
  'background': false,
  'species': false,
  'feat': false
};

// API type mapping
const API_TYPE_MAP = {
  'class': 'characterClass',
  'background': 'background',
  'species': 'species',
  'feat': 'feat'
} as const;

/**
 * Initialize the document cache with an API instance
 */
export function initializeCache(apiInstance: IPluginAPI) {
  api = apiInstance;
  // We don't clear the cache here - let it maintain its state
}

// Type guard for checking document type
function hasDocumentType(obj: unknown): obj is { documentType: string } {
  return typeof obj === 'object' && obj !== null && 'documentType' in obj;
}

/**
 * Fetch documents from the API with proper filtering by type
 * This is only used internally by preloadDocuments
 */
async function fetchDocuments(type: DocumentType): Promise<unknown[]> {
  if (!api) {
    console.error('Document cache not initialized');
    return [];
  }
  
  try {
    console.log(`Fetching ${type} documents from API`);
    const apiType = API_TYPE_MAP[type];
    
    console.log(`Making searchDocuments API call for ${apiType}`);
    const documents = await api.searchDocuments({
      pluginId: PLUGIN_ID,
      documentType: apiType
    });
    
    // Filter documents by their specific type using type guard
    const filteredDocuments = documents.filter(doc => 
      hasDocumentType(doc) && doc.documentType === apiType
    );
    
    // Store in cache
    if (type === 'class') {
      cache.class = filteredDocuments as ICharacterClassDocument[];
    } else if (type === 'background') {
      cache.background = filteredDocuments as IBackgroundDocument[];
    } else if (type === 'species') {
      cache.species = filteredDocuments as ISpeciesDocument[];
    } else if (type === 'feat') {
      cache.feat = filteredDocuments as IFeatDocument[];
    }
    
    loaded[type] = true;
    return filteredDocuments;
  } catch (error) {
    console.error(`Error fetching ${type} documents:`, error);
    return [];
  }
}

/**
 * Preload all document types in the background
 * This improves application performance by loading documents ahead of time
 */
export async function preloadAllDocuments(): Promise<void> {
  if (!api) {
    console.error('Document cache not initialized, cannot preload documents');
    return;
  }
  
  console.log('Preloading all document types...');
  
  try {
    // Start loading all document types in parallel
    const loadPromises = [
      fetchDocuments('class'),
      fetchDocuments('background'), 
      fetchDocuments('species'),
      fetchDocuments('feat')
    ];
    
    // Wait for all documents to load
    await Promise.all(loadPromises);
    
    console.log('All documents preloaded successfully');
  } catch (error) {
    console.error('Error preloading documents:', error);
  }
}

/**
 * Check if documents of a specific type are loaded
 */
export function isLoaded(type: DocumentType): boolean {
  return loaded[type];
}

/**
 * Synchronously get all documents of a specific type
 * Returns empty array if not loaded
 */
export function getDocuments<T extends DocumentType>(type: T): DocumentTypeMap[T][] {
  if (!loaded[type]) {
    return [] as unknown as DocumentTypeMap[T][];
  }
  
  if (type === 'class') {
    return cache.class as DocumentTypeMap[T][];
  } else if (type === 'background') {
    return cache.background as DocumentTypeMap[T][];
  } else if (type === 'species') {
    return cache.species as DocumentTypeMap[T][];
  } else {
    return cache.feat as DocumentTypeMap[T][];
  }
}

/**
 * Synchronously get a specific document by name
 * Returns null if not found or not loaded
 */
export function getDocumentByName<T extends DocumentType>(
  type: T, 
  name: string
): DocumentTypeMap[T] | null {
  const documents = getDocuments(type);
  return documents.find(doc => doc.name === name) || null;
}

/**
 * Synchronously get a specific document by ID
 * Returns null if not found or not loaded
 */
export function getDocumentById<T extends DocumentType>(
  type: T,
  id: string
): DocumentTypeMap[T] | null {
  const documents = getDocuments(type);

  return documents.find(doc => 
    // Check both id and _id since the server might use either
    (doc as { id?: string; _id?: string }).id === id || (doc as { id?: string; _id?: string })._id === id
  ) || null;
}

/**
 * Synchronously get a class document by ID
 */
export function getClass(id: string): ICharacterClassDocument | null {
  return getDocumentById('class', id);
}

/**
 * Synchronously get a species document by ID
 */
export function getSpecies(id: string): ISpeciesDocument | null {
  return getDocumentById('species', id);
}

/**
 * Synchronously get a background document by ID
 */
export function getBackground(id: string): IBackgroundDocument | null {
  return getDocumentById('background', id);
}

/**
 * Synchronously get a feat document by ID
 */
export function getFeat(id: string): IFeatDocument | null {
  return getDocumentById('feat', id);
}

/**
 * Maintain backward compatibility - get document by name
 */
export function getClassByName(name: string): ICharacterClassDocument | null {
  return getDocumentByName('class', name);
}

/**
 * Maintain backward compatibility - get document by name
 */
export function getSpeciesByName(name: string): ISpeciesDocument | null {
  return getDocumentByName('species', name);
}

/**
 * Maintain backward compatibility - get document by name
 */
export function getBackgroundByName(name: string): IBackgroundDocument | null {
  return getDocumentByName('background', name);
}

/**
 * Maintain backward compatibility - get document by name
 */
export function getFeatByName(name: string): IFeatDocument | null {
  return getDocumentByName('feat', name);
}

/**
 * Synchronously get all class documents
 */
export function getAllClasses(): ICharacterClassDocument[] {
  return getDocuments('class');
}

/**
 * Synchronously get all background documents
 */
export function getAllBackgrounds(): IBackgroundDocument[] {
  return getDocuments('background');
}

/**
 * Synchronously get all species documents
 */
export function getAllSpecies(): ISpeciesDocument[] {
  return getDocuments('species');
}

/**
 * Synchronously get all feat documents
 */
export function getAllFeats(): IFeatDocument[] {
  return getDocuments('feat');
} 