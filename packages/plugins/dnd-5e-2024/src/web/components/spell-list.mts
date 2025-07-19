/**
 * D&D 5e Spell List Component
 * 
 * Spell list and management component for D&D 5e characters
 */

import { defineComponent, ref, computed } from 'vue';
import { PluginButton, PluginInput, PluginSelect, PluginCard } from '@dungeon-lab/shared/components/ui-library.mjs';
import type { CharacterData, Spell } from '@dungeon-lab/shared/types/game-data.mjs';

export const DnD5eSpellList = defineComponent({
  name: 'DnD5eSpellList',
  
  props: {
    character: {
      type: Object as () => CharacterData,
      required: true
    },
    spells: {
      type: Array as () => Spell[],
      required: true
    }
  },
  
  emits: {
    'cast-spell': (spell: Spell, level: number) => true,
    'prepare-spell': (spell: Spell, prepared: boolean) => true
  },
  
  setup(props, { emit }) {
    const selectedLevel = ref(0);
    const searchTerm = ref('');
    
    // Filter spells by level and search term
    const filteredSpells = computed(() => {
      return props.spells.filter(spell => {
        const matchesLevel = selectedLevel.value === 0 || spell.level === selectedLevel.value;
        const matchesSearch = !searchTerm.value || 
          spell.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
          spell.school.toLowerCase().includes(searchTerm.value.toLowerCase());
        return matchesLevel && matchesSearch;
      });
    });
    
    const spellLevels = computed(() => {
      const levels = [{ value: 0, label: 'All Levels' }];
      for (let i = 1; i <= 9; i++) {
        levels.push({ value: i, label: `Level ${i}` });
      }
      return levels;
    });
    
    const castSpell = (spell: Spell, level: number) => {
      emit('cast-spell', spell, level);
    };
    
    const togglePrepared = (spell: Spell) => {
      const prepared = !spell.prepared;
      emit('prepare-spell', spell, prepared);
    };
    
    return {
      selectedLevel,
      searchTerm,
      filteredSpells,
      spellLevels,
      castSpell,
      togglePrepared,
      PluginButton,
      PluginInput,
      PluginSelect,
      PluginCard
    };
  },
  
  template: `
    <div class="dnd5e-spell-list">
      <PluginCard title="Spell List">
        <div class="mb-4 flex space-x-4">
          <PluginSelect
            label="Spell Level"
            :options="spellLevels"
            v-model="selectedLevel"
          />
          <PluginInput
            label="Search Spells"
            v-model="searchTerm"
            placeholder="Search by name or school..."
          />
        </div>
        
        <div class="space-y-2">
          <div
            v-for="spell in filteredSpells"
            :key="spell.id"
            class="spell-item flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="font-medium">{{ spell.name }}</h3>
                <span class="text-sm text-gray-500">Level {{ spell.level }}</span>
                <span class="text-sm text-gray-500">{{ spell.school }}</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ spell.description }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <PluginButton
                variant="ghost"
                size="sm"
                @click="togglePrepared(spell)"
                :class="spell.prepared ? 'text-green-600' : 'text-gray-400'"
              >
                {{ spell.prepared ? '★' : '☆' }}
              </PluginButton>
              <PluginButton
                variant="primary"
                size="sm"
                @click="castSpell(spell, spell.level)"
                :disabled="!spell.prepared"
              >
                Cast
              </PluginButton>
            </div>
          </div>
        </div>
      </PluginCard>
    </div>
  `
});