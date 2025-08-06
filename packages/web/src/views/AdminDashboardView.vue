<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store.mjs';
import { useRouter } from 'vue-router';
import { CompendiumsClient, DocumentsClient } from '@dungeon-lab/client/index.mjs';

const authStore = useAuthStore();
const router = useRouter();
const compendiumsClient = new CompendiumsClient();
const documentsClient = new DocumentsClient();

// Bulk operations state
const bulkOperations = ref({
  generating: false,
  success: false,
  error: null as string | null,
  results: {
    total: 0,
    successful: 0,
    updated: 0,
    failed: 0,
    details: [] as Array<{ entryName: string; success: boolean; wasUpdate?: boolean; error?: string; documentId?: string }>
  },
  referenceResolution: {
    resolving: false,
    processed: 0,
    resolved: 0,
    created: 0,
    errors: 0
  }
});

// Character bulk operations state
const characterBulkOperations = ref({
  generating: false,
  success: false,
  error: null as string | null,
  results: {
    total: 0,
    successful: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    details: [] as Array<{ entryName: string; success: boolean; wasSkipped?: boolean; error?: string; documentId?: string }>
  },
  referenceResolution: {
    resolving: false,
    processed: 0,
    resolved: 0,
    created: 0,
    errors: 0
  }
});

// Computed to check if user is admin
const isAdmin = computed(() => authStore.user?.isAdmin);

// Redirect if not admin
onMounted(() => {
  if (!isAdmin.value) {
    router.push('/');
  }
});

// Placeholder data for admin stats
const adminStats = [
  { title: 'Total Users', value: '---', icon: 'fas fa-users', color: 'bg-blue-500' },
  { title: 'Active Campaigns', value: '---', icon: 'fas fa-dragon', color: 'bg-green-500' },
  { title: 'Total Documents', value: '---', icon: 'fas fa-file-alt', color: 'bg-purple-500' },
  { title: 'System Status', value: 'Healthy', icon: 'fas fa-heartbeat', color: 'bg-red-500' }
];

const adminTools = [
  { title: 'User Management', description: 'Manage user accounts, permissions, and roles', icon: 'fas fa-user-cog', comingSoon: true },
  { title: 'System Monitoring', description: 'Monitor system performance and health', icon: 'fas fa-chart-line', comingSoon: true },
  { title: 'Database Tools', description: 'Database maintenance and analytics', icon: 'fas fa-database', comingSoon: true },
  { title: 'Configuration', description: 'System configuration and settings', icon: 'fas fa-cogs', comingSoon: true },
  { title: 'Content Moderation', description: 'Review and moderate user-generated content', icon: 'fas fa-shield-alt', comingSoon: true },
  { title: 'Backup & Recovery', description: 'System backup and recovery tools', icon: 'fas fa-save', comingSoon: true }
];

// Function to generate documents for all VTT-document entries
async function generateAllVTTDocuments() {
  if (!isAdmin.value) return;
  
  try {
    bulkOperations.value.generating = true;
    bulkOperations.value.error = null;
    bulkOperations.value.success = false;
    bulkOperations.value.results = {
      total: 0,
      successful: 0,
      updated: 0,
      failed: 0,
      details: []
    };

    // Fetch all VTT-document entries from all compendiums
    const response = await compendiumsClient.getAllCompendiumEntries({
      documentType: 'vtt-document',
      limit: 1000 // High limit to get all entries
    });

    const vttEntries = response.entries;
    bulkOperations.value.results.total = vttEntries.length;

    if (vttEntries.length === 0) {
      bulkOperations.value.error = 'No VTT-document entries found in compendiums';
      return;
    }

    console.log(`Found ${vttEntries.length} VTT-document entries to process`);

    // First, create a mapping of compendium ObjectId to slug
    // Get all compendiums to create the mapping
    const allCompendiums = await compendiumsClient.getCompendiums();
    const compendiumMap = new Map<string, string>();
    allCompendiums.forEach(comp => {
      compendiumMap.set(comp.id, comp.slug);
    });

    console.log(`Created mapping for ${compendiumMap.size} compendiums`);

    // Process each entry
    for (const entry of vttEntries) {
      try {
        // Get the compendium slug from our mapping
        const compendiumSlug = compendiumMap.get(entry.compendiumId);
        console.log('compendiumSlug', compendiumSlug);
        console.log('compendiumMap', compendiumMap);
        if (!compendiumSlug) {
          throw new Error(`Could not find compendium slug for ID: ${entry.compendiumId}`);
        }
        
        // Instantiate the template (create or update - service handles the logic)
        const document = await compendiumsClient.instantiateTemplate(compendiumSlug, entry.id);
        
        // Detect if this was an update by checking if createdAt and updatedAt are different
        // (This is a simple heuristic - newly created documents have the same timestamps)
        const wasUpdate = document && 
                          typeof document === 'object' && 
                          'createdAt' in document && 
                          'updatedAt' in document &&
                          new Date(document.createdAt as string).getTime() !== new Date(document.updatedAt as string).getTime();
        
        bulkOperations.value.results.successful++;
        if (wasUpdate) {
          bulkOperations.value.results.updated++;
        }
        
        bulkOperations.value.results.details.push({
          entryName: entry.entry.name,
          success: true,
          wasUpdate: !!wasUpdate,
          documentId: document && typeof document === 'object' && 'id' in document ? (document as Record<string, unknown>).id as string : undefined
        });
        
        console.log(`✓ ${wasUpdate ? 'Updated' : 'Created'} document for: ${entry.entry.name}`);
      } catch (error) {
        bulkOperations.value.results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        bulkOperations.value.results.details.push({
          entryName: entry.entry.name,
          success: false,
          error: errorMessage
        });
        
        console.error(`✗ Failed to generate document for: ${entry.entry.name}`, error);
      }
    }

    // Phase 2: Resolve document references
    console.log('Starting reference resolution phase...');
    bulkOperations.value.referenceResolution.resolving = true;
    
    try {
      // Get all document IDs that were successfully created/updated
      const documentIds = bulkOperations.value.results.details
        .filter(detail => detail.success && detail.documentId)
        .map(detail => detail.documentId!);

      if (documentIds.length > 0) {
        const resolutionResult = await documentsClient.resolveDocumentReferences(documentIds);
        
        bulkOperations.value.referenceResolution.processed = resolutionResult.processed;
        bulkOperations.value.referenceResolution.resolved = resolutionResult.resolved;
        bulkOperations.value.referenceResolution.created = resolutionResult.created;
        bulkOperations.value.referenceResolution.errors = resolutionResult.errors;
        
        console.log(`Reference resolution completed: ${resolutionResult.resolved} resolved, ${resolutionResult.created} auto-created, ${resolutionResult.errors} errors`);
      }
    } catch (error) {
      console.error('Reference resolution failed:', error);
      bulkOperations.value.referenceResolution.errors = 1;
    } finally {
      bulkOperations.value.referenceResolution.resolving = false;
    }

    bulkOperations.value.success = true;
    console.log(`Bulk operation completed: ${bulkOperations.value.results.successful} successful, ${bulkOperations.value.results.failed} failed`);
    
  } catch (error) {
    console.error('Error in bulk document generation:', error);
    bulkOperations.value.error = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    bulkOperations.value.generating = false;
  }
}

// Function to generate documents for all character entries
async function generateAllCharacterDocuments() {
  if (!isAdmin.value) return;
  
  try {
    characterBulkOperations.value.generating = true;
    characterBulkOperations.value.error = null;
    characterBulkOperations.value.success = false;
    characterBulkOperations.value.results = {
      total: 0,
      successful: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Fetch all character entries from all compendiums
    const response = await compendiumsClient.getAllCompendiumEntries({
      documentType: 'character',
      limit: 1000 // High limit to get all entries
    });

    const characterEntries = response.entries;
    characterBulkOperations.value.results.total = characterEntries.length;

    if (characterEntries.length === 0) {
      characterBulkOperations.value.error = 'No character entries found in compendiums';
      return;
    }

    console.log(`Found ${characterEntries.length} character entries to process`);

    // Create a mapping of compendium ObjectId to slug
    const allCompendiums = await compendiumsClient.getCompendiums();
    const compendiumMap = new Map<string, string>();
    allCompendiums.forEach(comp => {
      compendiumMap.set(comp.id, comp.slug);
    });

    console.log(`Created mapping for ${compendiumMap.size} compendiums`);

    // Process each entry with create-only (skip if exists) workflow
    for (const entry of characterEntries) {
      try {
        // Get the compendium slug from our mapping
        const compendiumSlug = compendiumMap.get(entry.compendiumId);
        if (!compendiumSlug) {
          throw new Error(`Could not find compendium slug for ID: ${entry.compendiumId}`);
        }
        
        // Instantiate the template with skipIfExists: true (create-only workflow)
        const document = await compendiumsClient.instantiateTemplate(compendiumSlug, entry.id, {}, { skipIfExists: true });
        
        if (document === null) {
          // Document was skipped because it already exists
          characterBulkOperations.value.results.skipped++;
          characterBulkOperations.value.results.details.push({
            entryName: entry.entry.name,
            success: true,
            wasSkipped: true
          });
          console.log(`↪ Skipped existing character: ${entry.entry.name}`);
        } else {
          // Document was created
          characterBulkOperations.value.results.created++;
          characterBulkOperations.value.results.details.push({
            entryName: entry.entry.name,
            success: true,
            wasSkipped: false,
            documentId: document && typeof document === 'object' && 'id' in document ? (document as Record<string, unknown>).id as string : undefined
          });
          console.log(`✓ Created character document for: ${entry.entry.name}`);
        }
        
        characterBulkOperations.value.results.successful++;
        
      } catch (error) {
        characterBulkOperations.value.results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        characterBulkOperations.value.results.details.push({
          entryName: entry.entry.name,
          success: false,
          error: errorMessage
        });
        
        console.error(`✗ Failed to generate character document for: ${entry.entry.name}`, error);
      }
    }

    // Phase 2: Resolve document references
    console.log('Starting character reference resolution phase...');
    characterBulkOperations.value.referenceResolution.resolving = true;
    
    try {
      // Get all document IDs that were successfully created (not skipped)
      const documentIds = characterBulkOperations.value.results.details
        .filter(detail => detail.success && !detail.wasSkipped && detail.documentId)
        .map(detail => detail.documentId!);

      if (documentIds.length > 0) {
        const resolutionResult = await documentsClient.resolveDocumentReferences(documentIds);
        
        characterBulkOperations.value.referenceResolution.processed = resolutionResult.processed;
        characterBulkOperations.value.referenceResolution.resolved = resolutionResult.resolved;
        characterBulkOperations.value.referenceResolution.created = resolutionResult.created;
        characterBulkOperations.value.referenceResolution.errors = resolutionResult.errors;
        
        console.log(`Character reference resolution completed: ${resolutionResult.resolved} resolved, ${resolutionResult.created} auto-created, ${resolutionResult.errors} errors`);
      }
    } catch (error) {
      console.error('Character reference resolution failed:', error);
      characterBulkOperations.value.referenceResolution.errors = 1;
    } finally {
      characterBulkOperations.value.referenceResolution.resolving = false;
    }

    characterBulkOperations.value.success = true;
    console.log(`Character bulk operation completed: ${characterBulkOperations.value.results.created} created, ${characterBulkOperations.value.results.skipped} skipped, ${characterBulkOperations.value.results.failed} failed`);
    
  } catch (error) {
    console.error('Error in character bulk document generation:', error);
    characterBulkOperations.value.error = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    characterBulkOperations.value.generating = false;
  }
}

// Function to clear results
function clearBulkResults() {
  bulkOperations.value.success = false;
  bulkOperations.value.error = null;
  bulkOperations.value.results = {
    total: 0,
    successful: 0,
    updated: 0,
    failed: 0,
    details: []
  };
  bulkOperations.value.referenceResolution = {
    resolving: false,
    processed: 0,
    resolved: 0,
    created: 0,
    errors: 0
  };
}

// Function to clear character results
function clearCharacterBulkResults() {
  characterBulkOperations.value.success = false;
  characterBulkOperations.value.error = null;
  characterBulkOperations.value.results = {
    total: 0,
    successful: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  characterBulkOperations.value.referenceResolution = {
    resolving: false,
    processed: 0,
    resolved: 0,
    created: 0,
    errors: 0
  };
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Only show if user is admin -->
    <div v-if="isAdmin" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <div class="mt-2 flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <i class="fas fa-shield-alt mr-1"></i>
            Administrator
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {{ authStore.user?.username }}
          </span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div 
          v-for="stat in adminStats" 
          :key="stat.title"
          class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
        >
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div :class="`${stat.color} p-3 rounded-md`">
                  <i :class="`${stat.icon} text-white`"></i>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ stat.title }}
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ stat.value }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Operations Section -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Bulk Operations
        </h2>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Generate VTT Documents
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Creates documents for all VTT-document entries found in compendiums. This populates the global document library with rules, spells, backgrounds, and other game content.
              </p>
            </div>
            <button
              @click="generateAllVTTDocuments"
              :disabled="bulkOperations.generating"
              class="btn btn-primary"
            >
              <i :class="bulkOperations.generating ? 'fas fa-spinner fa-spin' : 'fas fa-magic'" class="mr-2"></i>
              {{ bulkOperations.generating ? 'Generating...' : 'Generate All VTT Documents' }}
            </button>
          </div>

          <!-- Progress/Results Display -->
          <div v-if="bulkOperations.generating || bulkOperations.success || bulkOperations.error" class="mt-6 border-t pt-4">
            <!-- Error State -->
            <div v-if="bulkOperations.error" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="fas fa-exclamation-circle text-red-400 mr-2"></i>
                <span class="text-sm font-medium text-red-800">Error:</span>
              </div>
              <p class="text-sm text-red-700 mt-1">{{ bulkOperations.error }}</p>
              <button @click="clearBulkResults" class="mt-2 text-sm text-red-600 hover:text-red-800">
                Clear
              </button>
            </div>

            <!-- Success State -->
            <div v-else-if="bulkOperations.success" class="space-y-4">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center mb-2">
                  <i class="fas fa-check-circle text-green-400 mr-2"></i>
                  <span class="text-sm font-medium text-green-800">Bulk Operation Completed</span>
                </div>
                <div class="text-sm text-green-700 space-y-1">
                  <div>Total entries processed: {{ bulkOperations.results.total }}</div>
                  <div>Successful: {{ bulkOperations.results.successful }}</div>
                  <div v-if="bulkOperations.results.updated > 0">Updated existing: {{ bulkOperations.results.updated }}</div>
                  <div>Created new: {{ bulkOperations.results.successful - bulkOperations.results.updated }}</div>
                  <div v-if="bulkOperations.results.failed > 0" class="text-red-600">Failed: {{ bulkOperations.results.failed }}</div>
                  
                  <!-- Reference Resolution Status -->
                  <div v-if="bulkOperations.referenceResolution.processed > 0" class="pt-2 border-t border-green-200">
                    <div class="font-medium text-green-800 mb-1">Reference Resolution:</div>
                    <div>Documents processed: {{ bulkOperations.referenceResolution.processed }}</div>
                    <div>References resolved: {{ bulkOperations.referenceResolution.resolved }}</div>
                    <div v-if="bulkOperations.referenceResolution.created > 0">Documents auto-created: {{ bulkOperations.referenceResolution.created }}</div>
                    <div v-if="bulkOperations.referenceResolution.errors > 0" class="text-red-600">Resolution errors: {{ bulkOperations.referenceResolution.errors }}</div>
                  </div>
                </div>
                <button @click="clearBulkResults" class="mt-2 text-sm text-green-600 hover:text-green-800">
                  Clear Results
                </button>
              </div>

              <!-- Detailed Results (if there were failures) -->
              <div v-if="bulkOperations.results.failed > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-yellow-800 mb-2">Failed Operations:</h4>
                <div class="max-h-32 overflow-y-auto space-y-1">
                  <div 
                    v-for="detail in bulkOperations.results.details.filter(d => !d.success)" 
                    :key="detail.entryName"
                    class="text-xs text-yellow-700"
                  >
                    <strong>{{ detail.entryName }}:</strong> {{ detail.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Progress State -->
            <div v-else-if="bulkOperations.generating" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="fas fa-spinner fa-spin text-blue-400 mr-2"></i>
                <span class="text-sm font-medium text-blue-800">
                  {{ bulkOperations.referenceResolution.resolving ? 'Resolving document references...' : 'Processing VTT-document entries...' }}
                </span>
              </div>
              <div v-if="bulkOperations.results.total > 0" class="mt-2 text-sm text-blue-700">
                <div v-if="!bulkOperations.referenceResolution.resolving">
                  Document Creation: {{ bulkOperations.results.successful + bulkOperations.results.failed }} / {{ bulkOperations.results.total }}
                </div>
                <div v-else>
                  Reference Resolution: {{ bulkOperations.referenceResolution.processed }} documents processed
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generate Character Documents -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Generate Character Documents
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Creates character documents for all character entries found in compendiums. If a character already exists (based on compendium entry ID), it will be skipped.
              </p>
            </div>
            <button
              @click="generateAllCharacterDocuments"
              :disabled="characterBulkOperations.generating"
              class="btn btn-primary"
            >
              <i :class="characterBulkOperations.generating ? 'fas fa-spinner fa-spin' : 'fas fa-users'" class="mr-2"></i>
              {{ characterBulkOperations.generating ? 'Generating...' : 'Generate All Characters' }}
            </button>
          </div>

          <!-- Progress/Results Display -->
          <div v-if="characterBulkOperations.generating || characterBulkOperations.success || characterBulkOperations.error" class="mt-6 border-t pt-4">
            <!-- Error State -->
            <div v-if="characterBulkOperations.error" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="fas fa-exclamation-circle text-red-400 mr-2"></i>
                <span class="text-sm font-medium text-red-800">Error:</span>
              </div>
              <p class="text-sm text-red-700 mt-1">{{ characterBulkOperations.error }}</p>
              <button @click="clearCharacterBulkResults" class="mt-2 text-sm text-red-600 hover:text-red-800">
                Clear
              </button>
            </div>

            <!-- Success State -->
            <div v-else-if="characterBulkOperations.success" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center mb-2">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span class="text-sm font-medium text-green-800">Character Generation Complete</span>
              </div>
              <div class="text-sm text-green-700 space-y-1">
                <div>Total entries processed: {{ characterBulkOperations.results.total }}</div>
                <div>Successful: {{ characterBulkOperations.results.successful }}</div>
                <div>Created new: {{ characterBulkOperations.results.created }}</div>
                <div>Skipped existing: {{ characterBulkOperations.results.skipped }}</div>
                <div v-if="characterBulkOperations.results.failed > 0" class="text-red-600">
                  Failed: {{ characterBulkOperations.results.failed }}
                </div>
                
                <!-- Reference Resolution Status -->
                <div v-if="characterBulkOperations.referenceResolution.processed > 0" class="pt-2 border-t border-green-200">
                  <div class="font-medium text-green-800 mb-1">Reference Resolution:</div>
                  <div>Documents processed: {{ characterBulkOperations.referenceResolution.processed }}</div>
                  <div>References resolved: {{ characterBulkOperations.referenceResolution.resolved }}</div>
                  <div v-if="characterBulkOperations.referenceResolution.created > 0">Documents auto-created: {{ characterBulkOperations.referenceResolution.created }}</div>
                  <div v-if="characterBulkOperations.referenceResolution.errors > 0" class="text-red-600">Resolution errors: {{ characterBulkOperations.referenceResolution.errors }}</div>
                </div>
              </div>
              <button @click="clearCharacterBulkResults" class="mt-2 text-sm text-green-600 hover:text-green-800">
                Clear Results
              </button>

              <!-- Show failed operations if any -->
              <div v-if="characterBulkOperations.results.failed > 0" class="mt-3 pt-3 border-t border-green-200">
                <div class="text-xs font-medium text-red-800 mb-1">Failed Operations:</div>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  <div
                    v-for="detail in characterBulkOperations.results.details.filter(d => !d.success)"
                    :key="detail.entryName"
                    class="text-xs text-red-700"
                  >
                    <strong>{{ detail.entryName }}:</strong> {{ detail.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Progress State -->
            <div v-else-if="characterBulkOperations.generating" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="fas fa-spinner fa-spin text-blue-400 mr-2"></i>
                <span class="text-sm font-medium text-blue-800">
                  {{ characterBulkOperations.referenceResolution.resolving ? 'Resolving character references...' : 'Processing character entries...' }}
                </span>
              </div>
              <div v-if="characterBulkOperations.results.total > 0" class="mt-2 text-sm text-blue-700">
                <div v-if="!characterBulkOperations.referenceResolution.resolving">
                  Character Creation: {{ characterBulkOperations.results.successful + characterBulkOperations.results.failed }} / {{ characterBulkOperations.results.total }}
                </div>
                <div v-else>
                  Reference Resolution: {{ characterBulkOperations.referenceResolution.processed }} documents processed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Tools Grid -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Admin Tools
        </h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div 
            v-for="tool in adminTools" 
            :key="tool.title"
            class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200"
            :class="{ 'opacity-60': tool.comingSoon }"
          >
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <i :class="`${tool.icon} text-gray-600 dark:text-gray-300`"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  {{ tool.title }}
                  <span v-if="tool.comingSoon" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Coming Soon
                  </span>
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ tool.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Section -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Recent Admin Activity
          </h3>
        </div>
        <div class="p-6">
          <div class="text-center py-8">
            <i class="fas fa-clock text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p class="text-gray-500 dark:text-gray-400">
              Activity logging will be implemented in a future update
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Access Denied for non-admins -->
    <div v-else class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-shield-alt text-6xl text-red-500 mb-4"></i>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          You don't have administrator privileges to access this page.
        </p>
        <router-link to="/" class="btn btn-primary">
          Return Home
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500;
}
</style>