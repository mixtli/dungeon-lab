/**
 * D&D 5e Initiative Tracker Component
 * 
 * Combat initiative tracker with D&D 5e rules
 */

import { defineComponent, ref, computed } from 'vue';
import { PluginButton, PluginInput, PluginCard } from '@dungeon-lab/shared/components/ui-library.mjs';
import type { CharacterData } from '@dungeon-lab/shared/types/game-data.mjs';

interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  type: 'player' | 'npc' | 'monster';
  character?: CharacterData;
  conditions?: string[];
  notes?: string;
}

interface Encounter {
  id: string;
  name: string;
  status: 'setup' | 'active' | 'finished';
  round: number;
  currentTurn: number;
}

export const DnD5eInitiativeTracker = defineComponent({
  name: 'DnD5eInitiativeTracker',
  
  props: {
    characters: {
      type: Array as () => CharacterData[],
      required: true
    },
    encounter: {
      type: Object as () => Encounter,
      required: true
    }
  },
  
  emits: {
    'roll-initiative': (characterId: string) => true,
    'set-initiative': (characterId: string, initiative: number) => true,
    'next-turn': () => true,
    'previous-turn': () => true,
    'start-encounter': () => true,
    'end-encounter': () => true,
    'add-condition': (characterId: string, condition: string) => true,
    'remove-condition': (characterId: string, condition: string) => true
  },
  
  setup(props, { emit }) {
    const initiativeList = ref<InitiativeEntry[]>([]);
    const newNpcName = ref('');
    const newNpcInitiative = ref(0);
    
    // Initialize initiative list from characters
    const initializeInitiative = () => {
      initiativeList.value = props.characters.map(character => ({
        id: character.id,
        name: character.name,
        initiative: 0,
        type: 'player' as const,
        character,
        conditions: [],
        notes: ''
      }));
    };
    
    // Sort initiative list by initiative value (descending)
    const sortedInitiativeList = computed(() => {
      return [...initiativeList.value].sort((a, b) => b.initiative - a.initiative);
    });
    
    const currentEntry = computed(() => {
      if (props.encounter.status !== 'active') return null;
      return sortedInitiativeList.value[props.encounter.currentTurn] || null;
    });
    
    const isCurrentTurn = (entryId: string) => {
      return currentEntry.value?.id === entryId;
    };
    
    const rollInitiative = (entry: InitiativeEntry) => {
      if (entry.character) {
        emit('roll-initiative', entry.character.id);
      }
    };
    
    const setInitiative = (entry: InitiativeEntry, initiative: number) => {
      entry.initiative = initiative;
      emit('set-initiative', entry.id, initiative);
    };
    
    const nextTurn = () => {
      emit('next-turn');
    };
    
    const previousTurn = () => {
      emit('previous-turn');
    };
    
    const startEncounter = () => {
      emit('start-encounter');
    };
    
    const endEncounter = () => {
      emit('end-encounter');
    };
    
    const addNpc = () => {
      if (newNpcName.value.trim()) {
        const npc: InitiativeEntry = {
          id: `npc-${Date.now()}`,
          name: newNpcName.value.trim(),
          initiative: newNpcInitiative.value,
          type: 'npc',
          conditions: [],
          notes: ''
        };
        
        initiativeList.value.push(npc);
        newNpcName.value = '';
        newNpcInitiative.value = 0;
      }
    };
    
    const removeEntry = (entryId: string) => {
      initiativeList.value = initiativeList.value.filter(entry => entry.id !== entryId);
    };
    
    const addCondition = (entry: InitiativeEntry, condition: string) => {
      if (condition && !entry.conditions?.includes(condition)) {
        entry.conditions = [...(entry.conditions || []), condition];
        emit('add-condition', entry.id, condition);
      }
    };
    
    const removeCondition = (entry: InitiativeEntry, condition: string) => {
      entry.conditions = entry.conditions?.filter(c => c !== condition) || [];
      emit('remove-condition', entry.id, condition);
    };
    
    // Initialize on mount
    initializeInitiative();
    
    return {
      initiativeList,
      sortedInitiativeList,
      currentEntry,
      newNpcName,
      newNpcInitiative,
      isCurrentTurn,
      rollInitiative,
      setInitiative,
      nextTurn,
      previousTurn,
      startEncounter,
      endEncounter,
      addNpc,
      removeEntry,
      addCondition,
      removeCondition,
      PluginButton,
      PluginInput,
      PluginCard
    };
  },
  
  template: `
    <div class="dnd5e-initiative-tracker">
      <PluginCard title="Initiative Tracker">
        <!-- Encounter Status -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-medium">{{ encounter.name }}</h3>
              <p class="text-sm text-gray-600">
                Status: {{ encounter.status }}
                <span v-if="encounter.status === 'active'">
                  | Round {{ encounter.round }}
                </span>
              </p>
            </div>
            <div class="flex space-x-2">
              <PluginButton
                v-if="encounter.status === 'setup'"
                variant="primary"
                @click="startEncounter"
              >
                Start
              </PluginButton>
              <PluginButton
                v-if="encounter.status === 'active'"
                variant="secondary"
                @click="endEncounter"
              >
                End
              </PluginButton>
            </div>
          </div>
        </div>
        
        <!-- Turn Controls -->
        <div v-if="encounter.status === 'active'" class="mb-4 flex justify-center space-x-4">
          <PluginButton @click="previousTurn">Previous</PluginButton>
          <PluginButton variant="primary" @click="nextTurn">Next Turn</PluginButton>
        </div>
        
        <!-- Initiative List -->
        <div class="space-y-2">
          <div
            v-for="entry in sortedInitiativeList"
            :key="entry.id"
            class="initiative-entry p-3 rounded-lg border-2 transition-colors"
            :class="{
              'border-blue-500 bg-blue-50': isCurrentTurn(entry.id),
              'border-gray-200 bg-gray-50': !isCurrentTurn(entry.id)
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="initiative-value text-xl font-bold w-12 text-center">
                  {{ entry.initiative }}
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h4 class="font-medium">{{ entry.name }}</h4>
                    <span class="px-2 py-1 text-xs rounded-full"
                          :class="{
                            'bg-green-200 text-green-800': entry.type === 'player',
                            'bg-blue-200 text-blue-800': entry.type === 'npc',
                            'bg-red-200 text-red-800': entry.type === 'monster'
                          }">
                      {{ entry.type }}
                    </span>
                  </div>
                  <div v-if="entry.conditions && entry.conditions.length > 0" class="mt-1">
                    <span
                      v-for="condition in entry.conditions"
                      :key="condition"
                      class="inline-block px-2 py-1 mr-1 text-xs bg-yellow-200 text-yellow-800 rounded-full"
                    >
                      {{ condition }}
                      <button
                        @click="removeCondition(entry, condition)"
                        class="ml-1 text-yellow-600 hover:text-yellow-800"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <PluginButton
                  v-if="entry.character"
                  variant="ghost"
                  size="sm"
                  @click="rollInitiative(entry)"
                >
                  Roll
                </PluginButton>
                <PluginInput
                  type="number"
                  :modelValue="entry.initiative"
                  @update:modelValue="setInitiative(entry, Number($event))"
                  class="w-16"
                />
                <PluginButton
                  v-if="entry.type !== 'player'"
                  variant="ghost"
                  size="sm"
                  @click="removeEntry(entry.id)"
                  class="text-red-600"
                >
                  Remove
                </PluginButton>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Add NPC -->
        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 class="font-medium mb-2">Add NPC/Monster</h4>
          <div class="flex space-x-2">
            <PluginInput
              placeholder="Name"
              v-model="newNpcName"
            />
            <PluginInput
              type="number"
              placeholder="Initiative"
              v-model="newNpcInitiative"
            />
            <PluginButton @click="addNpc">Add</PluginButton>
          </div>
        </div>
      </PluginCard>
    </div>
  `
});