/**
 * Document Cache
 * 
 * A caching service for D&D 5e 2024 game documents like classes, backgrounds, and species.
 * This improves performance by loading documents once and providing synchronous access.
 */

import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';

// Import schemas for API data validation
// These schemas represent the structure of document data returned by the API
import { 
  vttDocumentTypes,
} from '../shared/types/vttdocument.mjs';

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

// Initialize with null API but allow auto-initialization on first use
let initializationPromise: Promise<void> | null = null;

/**
 * Auto-initialize the document cache if needed
 * @param pluginApi Optional API to use for initialization
 */
async function ensureInitialized(pluginApi?: IPluginAPI): Promise<void> {
  // If already initialized, return immediately
  if (api !== null) {
    return;
  }
  
  // If no API provided but already auto-initializing, wait for that to finish
  if (!pluginApi && initializationPromise) {
    await initializationPromise;
    return;
  }
  
  // If no API provided and not initializing, we can't proceed
  if (!pluginApi) {
    throw new Error('Document cache not initialized and no API provided for auto-initialization');
  }
  
  // Start initialization
  console.log('Auto-initializing document cache with API');
  
  const promise = (async () => {
    // Initialize the cache with the API
    initDocumentCache(pluginApi);
    
    // Preload documents
    try {
      await preloadAllDocuments();
    } catch (error) {
      console.error('Error during auto-initialization of document cache:', error);
      // Don't throw, we've logged the error and the cache is still usable for direct fetches
    } finally {
    }
  })();
  
  initializationPromise = promise;
  await promise;
  initializationPromise = null;
}

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

export function getAllSpecies(): Record<string, unknown>[] {
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

/**
 * Check if the document cache is initialized
 */
function isDocumentCacheInitialized(): boolean {
  return api !== null;
}

/**
 * Preload all documents into the cache from the API
 */
export async function preloadDocuments(pluginApi: IPluginAPI, resetCache: boolean = false): Promise<void> {
  console.log(`Preloading documents for plugin (reset: ${resetCache})`);
  
  // Initialize the cache if not already initialized
  if (!isDocumentCacheInitialized()) {
    initDocumentCache(pluginApi);
  }
  
  // Reset the cache if requested
  if (resetCache) {
    console.log('Resetting document cache');
    // Create new objects instead of modifying constants
    Object.keys(cache).forEach(key => {
      cache[key as DocumentType] = [];
    });
    
    Object.keys(loaded).forEach(key => {
      loaded[key as string] = false;
    });
  }
  
  // Load each document type
  try {
    // Load classes
    if (!isLoaded('class')) {
      await loadDocuments('class');
    }
    
    // Load backgrounds
    if (!isLoaded('background')) {
      await loadDocuments('background');
    }
    
    // Load species
    if (!isLoaded('species')) {
      await loadDocuments('species');
    }
    
    console.log('All documents preloaded successfully');
    
    // Log document counts in cache
    console.log('Document counts:', {
      classes: cache.class.length,
      backgrounds: cache.background.length,
      species: cache.species.length
    });
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

/**
 * Enhanced version of getClassByName that will fetch from API if not in cache
 * Also handles validation of the document structure against the API schema
 * @param name The class name to get
 * @param api Optional API instance for fetching if needed
 * @returns The class document, with proper validation
 */
export async function getClass(name: string, api?: IPluginAPI): Promise<Record<string, unknown>> {
  console.log(`Enhanced getClass called for "${name}"`);
  
  if (!name) {
    console.warn('No class name provided');
    throw new Error('No class name provided');
  }
  
  // Ensure the cache is initialized
  await ensureInitialized(api);
  
  // First check if we have it in cache
  const cachedDoc = getClassByName(name);
  if (cachedDoc) {
    console.log(`Found class "${name}" in cache`);
    
    // Validate the document against the API schema
    // We validate the "data" field against the characterClassSchema
    const dataField = cachedDoc.data || cachedDoc;
    const validation = vttDocumentTypes.characterClass.safeParse(dataField);
    if (!validation.success) {
      console.error(`Validation failed for cached class ${name}:`, validation.error);
      throw new Error(`Invalid class document format: ${validation.error.message}`);
    }
    
    return extractDocumentData(cachedDoc);
  }
  
  // If not in cache and API provided, try to fetch it
  if (api) {
    console.log(`Class "${name}" not in cache, fetching from API`);
    try {
      // Try to load the class documents
      await loadDocuments('class');
      
      // Check cache again after loading
      const reloadedDoc = getClassByName(name);
      if (reloadedDoc) {
        // Validate the document against the API schema
        const dataField = reloadedDoc.data || reloadedDoc;
        const validation = vttDocumentTypes.characterClass.safeParse(dataField);
        if (!validation.success) {
          console.error(`Validation failed for reloaded class ${name}:`, validation.error);
          throw new Error(`Invalid class document format: ${validation.error.message}`);
        }
        
        return extractDocumentData(reloadedDoc);
      }
      
      // If still not found, make a direct API call for this specific class
      const response = await api.getDocument('dnd-5e-2024', 'class', name);
      if (!response) {
        throw new Error(`Class ${name} not found`);
      }
      
      console.log(`Successfully fetched class "${name}" from API directly`);
      
      // Validate the API response against the schema
      const dataField = (response as any).data || response;
      const validation = vttDocumentTypes.characterClass.safeParse(dataField);
      if (!validation.success) {
        console.error(`Validation failed for API class ${name}:`, validation.error);
        throw new Error(`Invalid class document format: ${validation.error.message}`);
      }
      
      return extractDocumentData(response as Record<string, unknown>);
    } catch (error) {
      console.error(`Error fetching class "${name}" from API:`, error);
      throw error;
    }
  }
  
  // If we get here, we couldn't find it in cache and no API was provided
  console.error(`Class "${name}" not found in cache and no API provided for fetching`);
  throw new Error(`Class ${name} not found and no API provided for fetching`);
}

/**
 * Enhanced version of getSpeciesByName that will fetch from API if not in cache
 * Also handles validation of the document structure against the API schema
 * @param name The species name to get
 * @param api Optional API instance for fetching if needed
 * @returns The species document, with proper validation
 */
export async function getSpecies(name: string, api?: IPluginAPI): Promise<Record<string, unknown>> {
  console.log(`Enhanced getSpecies called for "${name}"`);
  
  if (!name) {
    console.warn('No species name provided');
    throw new Error('No species name provided');
  }
  
  // Ensure the cache is initialized
  await ensureInitialized(api);
  
  // First check if we have it in cache
  const cachedDoc = getSpeciesByName(name);
  if (cachedDoc) {
    console.log(`Found species "${name}" in cache`);
    
    // Validate the document against the API schema
    const dataField = cachedDoc.data || cachedDoc;
    const validation = vttDocumentTypes.species.safeParse(dataField);
    if (!validation.success) {
      console.error(`Validation failed for cached species ${name}:`, validation.error);
      throw new Error(`Invalid species document format: ${validation.error.message}`);
    }
    
    return extractDocumentData(cachedDoc);
  }
  
  // If not in cache and API provided, try to fetch it
  if (api) {
    console.log(`Species "${name}" not in cache, fetching from API`);
    try {
      // Try to load the species documents
      await loadDocuments('species');
      
      // Check cache again after loading
      const reloadedDoc = getSpeciesByName(name);
      if (reloadedDoc) {
        // Validate the document against the API schema
        const dataField = reloadedDoc.data || reloadedDoc;
        const validation = vttDocumentTypes.species.safeParse(dataField);
        if (!validation.success) {
          console.error(`Validation failed for reloaded species ${name}:`, validation.error);
          throw new Error(`Invalid species document format: ${validation.error.message}`);
        }
        
        return extractDocumentData(reloadedDoc);
      }
      
      // If still not found, make a direct API call for this specific species
      const response = await api.getDocument('dnd-5e-2024', 'species', name);
      if (!response) {
        throw new Error(`Species ${name} not found`);
      }
      
      console.log(`Successfully fetched species "${name}" from API directly`);
      
      // Validate the API response against the schema
      const dataField = (response as any).data || response;
      const validation = vttDocumentTypes.species.safeParse(dataField);
      if (!validation.success) {
        console.error(`Validation failed for API species ${name}:`, validation.error);
        throw new Error(`Invalid species document format: ${validation.error.message}`);
      }
      
      return extractDocumentData(response as Record<string, unknown>);
    } catch (error) {
      console.error(`Error fetching species "${name}" from API:`, error);
      throw error;
    }
  }
  
  // If we get here, we couldn't find it in cache and no API was provided
  console.error(`Species "${name}" not found in cache and no API provided for fetching`);
  throw new Error(`Species ${name} not found and no API provided for fetching`);
}

/**
 * Enhanced version of getBackgroundByName that will fetch from API if not in cache
 * Also handles validation of the document structure against the API schema
 * @param name The background name to get
 * @param api Optional API instance for fetching if needed
 * @returns The background document, with proper validation
 */
export async function getBackground(name: string, api?: IPluginAPI): Promise<Record<string, unknown>> {
  console.log(`Enhanced getBackground called for "${name}"`);
  
  if (!name) {
    console.warn('No background name provided');
    throw new Error('No background name provided');
  }
  
  // Ensure the cache is initialized
  await ensureInitialized(api);
  
  // First check if we have it in cache
  const cachedDoc = getBackgroundByName(name);
  if (cachedDoc) {
    console.log(`Found background "${name}" in cache`);
    
    // Validate the document against the API schema
    const dataField = cachedDoc.data || cachedDoc;
    const validation = vttDocumentTypes.background.safeParse(dataField);
    if (!validation.success) {
      console.error(`Validation failed for cached background ${name}:`, validation.error);
      throw new Error(`Invalid background document format: ${validation.error.message}`);
    }
    
    return extractDocumentData(cachedDoc);
  }
  
  // If not in cache and API provided, try to fetch it
  if (api) {
    console.log(`Background "${name}" not in cache, fetching from API`);
    try {
      // Try to load the background documents
      await loadDocuments('background');
      
      // Check cache again after loading
      const reloadedDoc = getBackgroundByName(name);
      if (reloadedDoc) {
        // Validate the document against the API schema
        const dataField = reloadedDoc.data || reloadedDoc;
        const validation = vttDocumentTypes.background.safeParse(dataField);
        if (!validation.success) {
          console.error(`Validation failed for reloaded background ${name}:`, validation.error);
          throw new Error(`Invalid background document format: ${validation.error.message}`);
        }
        
        return extractDocumentData(reloadedDoc);
      }
      
      // If still not found, make a direct API call for this specific background
      const response = await api.getDocument('dnd-5e-2024', 'background', name);
      if (!response) {
        throw new Error(`Background ${name} not found`);
      }
      
      console.log(`Successfully fetched background "${name}" from API directly`);
      
      // Validate the API response against the schema
      const dataField = (response as any).data || response;
      const validation = vttDocumentTypes.background.safeParse(dataField);
      if (!validation.success) {
        console.error(`Validation failed for API background ${name}:`, validation.error);
        throw new Error(`Invalid background document format: ${validation.error.message}`);
      }
      
      return extractDocumentData(response as Record<string, unknown>);
    } catch (error) {
      console.error(`Error fetching background "${name}" from API:`, error);
      throw error;
    }
  }
  
  // If we get here, we couldn't find it in cache and no API was provided
  console.error(`Background "${name}" not found in cache and no API provided for fetching`);
  throw new Error(`Background ${name} not found and no API provided for fetching`);
} 