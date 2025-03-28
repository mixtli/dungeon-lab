/**
 * Document Cache
 * 
 * A caching service for D&D 5e 2024 game documents like classes, backgrounds, and species.
 * This improves performance by loading documents once and providing synchronous access.
 */

import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';

// Document types that we cache
export type DocumentType = 'class' | 'background' | 'species' | 'subclass';

// Singleton cache instance
let api: IPluginAPI | null = null;
const PLUGIN_ID = 'dnd-5e-2024';

// Document cache storage
const cache: Record<DocumentType, Record<string, unknown>[]> = {
  class: [],
  background: [],
  species: [],
  subclass: []
};

// Loading state tracking
const loaded: Record<string, boolean> = {};
const loadingPromises: Partial<Record<DocumentType, Promise<Record<string, unknown>[]>>> = {};

/**
 * Initialize the document cache with the plugin API
 */
export function initDocumentCache(pluginApi: IPluginAPI): void {
  console.log('Document cache initialization called with API:', pluginApi);
  api = pluginApi;
  console.log('Document cache initialized for DnD 5e 2024 plugin');
  
  // Set up cache for each document type
  ['class', 'background', 'species', 'subclass'].forEach(type => {
    cache[type as DocumentType] = [];
    loaded[type] = false;
  });
  
  console.log('Document cache structure initialized:', { 
    cache, 
    loaded, 
    loadingPromises 
  });
}

/**
 * Preload all document types
 */
export async function preloadAllDocuments(): Promise<void> {
  console.log('Preload all documents called');
  
  if (!api) {
    console.error('Document cache not initialized. Call initDocumentCache() first.');
    throw new Error('Document cache not initialized. Call initDocumentCache() first.');
  }
  
  console.log('Preloading all game documents for DnD 5e 2024...');
  const documentTypes: DocumentType[] = ['class', 'background', 'species', 'subclass'];
  
  try {
    console.log('Starting document preload for types:', documentTypes);
    await Promise.all(
      documentTypes.map(type => 
        loadDocuments(type)
          .then(docs => {
            console.log(`Loaded ${docs.length} ${type} documents. First document:`, docs[0]);
            return docs;
          })
          .catch(err => {
            console.error(`Error loading ${type} documents:`, err);
            throw err;
          })
      )
    );
    console.log('All documents preloaded successfully. Cache state:', {
      cache,
      loaded
    });
  } catch (error) {
    console.error('Error preloading documents:', error);
    throw error;
  }
}

/**
 * Load all documents of a specified type
 */
export async function loadDocuments(type: DocumentType): Promise<Record<string, unknown>[]> {
  if (!api) {
    throw new Error('Document cache not initialized. Call initDocumentCache() first.');
  }
  
  // If already loading, return existing promise
  if (loadingPromises[type]) {
    return loadingPromises[type]!;
  }
  
  // If already loaded, return from cache
  if (loaded[type]) {
    return cache[type];
  }
  
  // Start loading
  console.log(`Loading ${type} documents`);
  const loadPromise = fetchDocuments(type);
  loadingPromises[type] = loadPromise;
  
  try {
    const documents = await loadPromise;
    cache[type] = documents;
    loaded[type] = true;
    return documents;
  } catch (error) {
    console.error(`Error loading ${type} documents:`, error);
    delete loadingPromises[type];
    throw error;
  }
}

/**
 * Get all documents of a specific type (must be loaded first)
 */
export function getDocuments(type: DocumentType): Record<string, unknown>[] {
  if (!isLoaded(type)) {
    console.warn(`Documents of type ${type} are not loaded yet`);
    return [];
  }
  return cache[type];
}

/**
 * Get a specific document by name
 */
export function getDocumentByName(type: DocumentType, name: string): Record<string, unknown> | undefined {
  console.log(`getDocumentByName called for ${type} "${name}"`);
  
  // Check if loaded
  if (!isLoaded(type)) {
    console.warn(`Documents of type ${type} are not loaded yet`);
    return undefined;
  }
  
  // Get all documents of the requested type
  const documents = cache[type];
  
  // Find the document by name (case-insensitive)
  const normalizedName = name.toLowerCase();
  const document = documents.find((doc: Record<string, unknown>) => {
    const docName = (doc.name as string || '').toLowerCase();
    return docName === normalizedName;
  });
  
  console.log(`Document found for ${type} "${name}": ${document ? 'Yes' : 'No'}`);
  
  if (document) {
    // Log the full document structure
    console.log(`Full document for ${type} "${name}":`, JSON.stringify(document, null, 2));
  }
  
  return document;
}

/**
 * Check if documents of a specific type are loaded
 */
export function isLoaded(type: DocumentType): boolean {
  const loadedStatus = !!loaded[type];
  console.log(`isLoaded check for ${type}: ${loadedStatus}`);
  return loadedStatus;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  for (const type of Object.keys(cache) as DocumentType[]) {
    cache[type] = [];
  }
  for (const key in loaded) {
    loaded[key] = false;
  }
  
  // Clear all loading promises
  Object.keys(loadingPromises).forEach(key => {
    delete loadingPromises[key as DocumentType];
  });
}

/**
 * Fetch documents from the API
 */
async function fetchDocuments(type: DocumentType): Promise<Record<string, unknown>[]> {
  if (!api) {
    console.error('Document cache not initialized');
    throw new Error('Document cache not initialized');
  }
  
  try {
    console.log(`Fetching ${type} documents from API`);
    const documentType = type === 'class' ? 'characterClass' : type;
    
    console.log(`Making searchDocuments API call for ${documentType}`);
    const documents = await api.searchDocuments({
      pluginId: PLUGIN_ID,
      documentType
    }) as Record<string, unknown>[];
    
    console.log(`Fetched ${documents.length} ${type} documents. Result:`, documents);
    return documents;
  } catch (error) {
    console.error(`Error fetching ${type} documents:`, error);
    throw error;
  }
}

// Helper functions for getting specific document types
export function getClasses(): Record<string, unknown>[] {
  return getDocuments('class');
}

export function getBackgrounds(): Record<string, unknown>[] {
  return getDocuments('background');
}

export function getSpecies(): Record<string, unknown>[] {
  return getDocuments('species');
}

export function getSubclasses(): Record<string, unknown>[] {
  return getDocuments('subclass');
}

export function getClassByName(name: string): Record<string, unknown> | undefined {
  console.log(`getClassByName called for "${name}"`);
  
  if (!name) {
    console.log('No class name provided');
    return undefined;
  }
  
  // For debugging, let's log the cache state
  console.log(`Cache state for classes:`, {
    numClasses: cache.class.length,
    isLoaded: isLoaded('class'),
    classNames: cache.class.map(c => (c as any).name)
  });
  
  const result = getDocumentByName('class', name);
  console.log(`getClassByName result for "${name}":`, result ? 'Found' : 'Not found');
  
  if (result) {
    console.log(`Class document for "${name}" found:`, { 
      name: (result as any).name,
      hitDie: (result as any).hitDie,
      description: (result as any).description?.substring(0, 50) + '...'
    });
  } else {
    console.warn(`Class document for "${name}" not found!`);
  }
  
  return result;
}

export function getBackgroundByName(name: string): Record<string, unknown> | undefined {
  return getDocumentByName('background', name);
}

export function getSpeciesByName(name: string): Record<string, unknown> | undefined {
  return getDocumentByName('species', name);
}

export function getSubclassByName(name: string): Record<string, unknown> | undefined {
  return getDocumentByName('subclass', name);
}

export async function preloadDocuments(pluginApi: IPluginAPI, resetCache: boolean = false): Promise<void> {
  console.log(`Preloading documents for plugin (reset: ${resetCache})`);
  
  // Reset the cache if requested
  if (resetCache) {
    console.log('Resetting document cache');
    cache = {
      class: [],
      background: [],
      species: []
    };
    loaded = {
      class: false,
      background: false,
      species: false
    };
  }
  
  // Create promises for each document type
  const promises = [
    loadClasses(pluginApi),
    loadBackgrounds(pluginApi),
    loadSpecies(pluginApi)
  ];
  
  try {
    // Wait for all document types to load
    await Promise.all(promises);
    console.log('All documents preloaded successfully');
    
    // Log document counts in cache
    console.log('Document counts:', {
      classes: cache.class.length,
      backgrounds: cache.background.length,
      species: cache.species.length
    });
    
    // Log the structure of a sample class document for debugging
    if (cache.class.length > 0) {
      console.log('Sample class document structure:');
      const sampleClass = cache.class[0];
      
      // Log the properties and their types 
      const props = Object.keys(sampleClass).map(key => {
        const value = (sampleClass as any)[key];
        const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
        const sample = Array.isArray(value) && value.length > 0 
          ? (typeof value[0] === 'object' ? '(complex)' : value[0]) 
          : (typeof value === 'object' ? '(complex)' : value);
        
        return { key, type, sample };
      });
      
      console.table(props);
      
      // If the data has a 'data' property, also check that
      if ((sampleClass as any).data && typeof (sampleClass as any).data === 'object') {
        console.log('Class data property structure:');
        const dataProps = Object.keys((sampleClass as any).data).map(key => {
          const value = (sampleClass as any).data[key];
          const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
          return { key, type };
        });
        
        console.table(dataProps);
      }
    }
  } catch (error) {
    console.error('Error preloading documents:', error);
    throw error;
  }
}

/**
 * Extract class data from API response document
 */
export function extractDocumentData(document: Record<string, unknown>): Record<string, unknown> {
  console.log('Extracting data from document:', document);
  
  // If there's a data property that's an object, that contains the actual data
  if (document.data && typeof document.data === 'object') {
    console.log('Document has data property, extracting data from it');
    
    // Create a merged object with both top-level properties and data properties
    const extractedData = {
      // Include id and name from the top level
      id: document.id,
      name: document.name || (document.data as Record<string, unknown>).name,
      // Spread all properties from the data object
      ...(document.data as Record<string, unknown>)
    };
    
    console.log('Extracted data:', extractedData);
    return extractedData;
  }
  
  // If there's no data property, just return the document as is
  console.log('Document does not have data property, using as is');
  return document;
} 