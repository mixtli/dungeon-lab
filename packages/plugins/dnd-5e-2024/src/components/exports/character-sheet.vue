<template>
  <div v-if="character" class="dnd5e-sheet dnd5e-character-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          <img 
            v-if="character.tokenImage?.url" 
            :src="character.tokenImage.url" 
            :alt="character.name"
            class="token-image"
          />
          <div v-else class="letter-avatar">
            {{ character.name.charAt(0) }}
          </div>
        </div>
        <div class="character-details">
          <h1 v-if="!editMode || readonly" class="character-name">{{ character.name }}</h1>
          <input 
            v-else-if="characterCopy"
            v-model="characterCopy.name"
            class="character-name-input"
            type="text"
          />
          <p class="character-subtitle">
            Level {{ (character.pluginData?.progression as any)?.level || (character.pluginData as any)?.level || 1 }} {{ speciesDisplayName }} {{ classDisplayName }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button 
          v-if="!readonly"
          @click="toggleEditMode" 
          class="edit-toggle-btn"
          :title="editMode ? 'Switch to View Mode' : 'Switch to Edit Mode'"
        >
          {{ editMode ? '👁️' : '✏️' }}
        </button>
        <button 
          v-if="editMode && !readonly" 
          @click="saveCharacter" 
          class="save-btn"
        >
          💾
        </button>
        <button @click="closeSheet" class="close-btn">
          ✕
        </button>
      </div>
    </header>
    
    <!-- Tab Navigation -->
    <nav class="tab-nav">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="switchTab(tab.id)"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        :title="tab.name"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </nav>
    
    <!-- Tab Content -->
    <main class="tab-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-pane overview-tab">
        <div class="stats-grid">
          <div class="stat-card" @click="rollInitiative" :title="editMode && !readonly ? 'Initiative Bonus' : 'Click to roll initiative'">
            <div class="stat-label">Initiative</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ initiativeBonus }}</div>
            <input 
              v-else-if="characterCopy?.pluginData && (characterCopy.pluginData as any)?.attributes?.initiative"
              v-model.number="(characterCopy.pluginData as any).attributes.initiative.bonus"
              class="stat-input"
              type="number"
              min="-10"
              max="20"
              @click.stop
            />
          </div>
          <div class="stat-card">
            <div class="stat-label">Armor Class</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ armorClassDisplay }}</div>
            <input 
              v-else-if="characterCopy?.pluginData && (characterCopy.pluginData as any)?.attributes?.armorClass"
              v-model.number="(characterCopy.pluginData as any).attributes.armorClass.value"
              class="stat-input"
              type="number"
              min="1"
              max="30"
            />
          </div>
          <div class="stat-card">
            <div class="stat-label">Hit Points</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ hitPointsDisplay }}</div>
            <div v-else class="hit-points-edit">
              <input 
                v-model.number="hitPointsCurrent"
                class="stat-input hp-current"
                type="number"
                min="0"
                :max="hitPointsMax"
              />
              <span class="hp-separator">/</span>
              <input 
                v-model.number="hitPointsMax"
                class="stat-input hp-max"
                type="number"
                min="1"
                max="999"
              />
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Speed</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ speedDisplay }}</div>
            <div v-else class="speed-edit">
              <input 
                v-model.number="speedValue"
                class="stat-input speed-input"
                type="number"
                min="0"
                max="999"
              />
              <span class="speed-unit">ft</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Prof. Bonus</div>
            <div class="stat-value">+{{ proficiencyBonus }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Passive Perception</div>
            <div class="stat-value">{{ passivePerception }}</div>
          </div>
        </div>
        
        <div v-if="(character.pluginData?.attributes as any)?.inspiration || (character.pluginData as any)?.inspiration" class="inspiration-section">
          <div class="inspiration-indicator">
            ⭐ Inspiration
          </div>
        </div>
      </div>
      
      <!-- Conditions Tab -->
      <div v-if="activeTab === 'conditions'" class="tab-pane conditions-tab">
        <div 
          class="conditions-container"
          :class="{ 'drag-over': isConditionDragOver }"
          @dragenter="handleConditionDragEnter"
          @dragover="handleConditionDragOver"
          @dragleave="handleConditionDragLeave"
          @drop="handleConditionDrop"
        >
          <div class="conditions-header">
            <h3>Active Conditions</h3>
            <span class="condition-count">{{ activeConditions.length }}</span>
          </div>
          
          <div class="conditions-list">
            <div 
              v-for="condition in activeConditions" 
              :key="`${condition.conditionId}-${condition.addedAt}`"
              class="condition-card"
            >
              <div class="condition-icon">
                <img 
                  v-if="getConditionImageUrl(condition.conditionId)" 
                  :src="getConditionImageUrl(condition.conditionId)" 
                  :alt="getConditionName(condition.conditionId)"
                  class="condition-image"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <span v-else class="condition-emoji">🎯</span>
              </div>
              
              <div class="condition-info">
                <div class="condition-name">{{ getConditionName(condition.conditionId) }}</div>
                <div class="condition-details">
                  <span v-if="condition.level && condition.level > 1" class="condition-level">Level {{ condition.level }}</span>
                  <span v-if="condition.source" class="condition-source">from {{ condition.source }}</span>
                </div>
              </div>
              
              <button 
                class="remove-condition-btn"
                @click="removeCondition(condition.conditionId)"
                title="Remove condition"
                :disabled="readonly"
              >
                <i class="mdi mdi-close"></i>
              </button>
            </div>
          </div>
          
          <div v-if="activeConditions.length === 0" class="no-conditions">
            <p>No active conditions</p>
            <p class="no-conditions-hint">Drag conditions from the Documents tab to add them</p>
          </div>
        </div>
      </div>
      
      <!-- Abilities Tab -->
      <div v-if="activeTab === 'abilities'" class="tab-pane abilities-tab">
        <div class="abilities-grid">
          <div 
            v-for="(_, abilityName) in finalAbilities" 
            :key="abilityName"
            class="ability-card"
            @click="!editMode || readonly ? rollAbilityCheck(abilityName as string) : null"
            :title="editMode && !readonly ? abilityName + ' score' : 'Click to roll ' + abilityName + ' check'"
            :class="{ 'non-clickable': editMode && !readonly }"
          >
            <div class="ability-name">{{ (abilityName as string).slice(0, 3).toUpperCase() }}</div>
            <div v-if="!editMode || readonly" class="ability-score">{{ finalAbilities[abilityName as string] }}</div>
            <input 
              v-else
              :value="finalAbilities[abilityName as string]"
              @input="updateAbilityScore(abilityName as string, ($event.target as HTMLInputElement).valueAsNumber)"
              class="ability-score-input"
              type="number"
              min="1"
              max="30"
              @click.stop
            />
            <div class="ability-modifier">{{ formatModifier(abilityModifiers[abilityName as string] || 0) }}</div>
          </div>
        </div>
        
        <div class="saving-throws">
          <h3>Saving Throws</h3>
          <div class="saves-grid">
            <div 
              v-for="(_, abilityName) in finalAbilities" 
              :key="abilityName"
              class="save-item"
              @click="rollSavingThrow(abilityName as string)"
              :title="'Click to roll ' + abilityName + ' save'"
            >
              <div class="save-prof" :class="{ proficient: savingThrowProficiencies[abilityName as string] }">
                {{ savingThrowProficiencies[abilityName as string] ? '●' : '○' }}
              </div>
              <div class="save-name">{{ (abilityName as string).slice(0, 3).toUpperCase() }}</div>
              <div class="save-bonus">{{ formatModifier(savingThrowBonuses[abilityName as string] || 0) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Skills Tab -->
      <div v-if="activeTab === 'skills'" class="tab-pane skills-tab">
        <div class="skills-list">
          <div 
            v-for="(skill, skillName) in characterSkills" 
            :key="skillName"
            class="skill-item"
            @click="!editMode || readonly ? rollSkillCheck(skillName as string) : undefined"
            :title="!editMode || readonly ? ('Click to roll ' + skillName + ' (' + skill.ability + ')') : 'Click proficiency circle to change proficiency level'"
            :class="{ 'editable': editMode && !readonly }"
          >
            <div 
              class="skill-prof" 
              :class="skill.proficiency"
              @click.stop="editMode && !readonly ? toggleSkillProficiency(skillName as string) : undefined"
              :title="editMode && !readonly ? 'Click to change proficiency level' : undefined"
            >
              {{ skill.proficiency === 'expert' ? '◆' : skill.proficiency === 'proficient' ? '●' : '○' }}
            </div>
            <div class="skill-name">{{ skillName }}</div>
            <div class="skill-ability">({{ skill.ability.slice(0, 3) }})</div>
            <div class="skill-bonus">{{ formatModifier(skillBonuses[skillName] || 0) }}</div>
          </div>
        </div>
      </div>
      
      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="tab-pane settings-tab">
        <div class="settings-section">
          <h3>Character Settings</h3>
          
          <div class="settings-group">
            <h4>Combat & Automation</h4>
            <div class="setting-item">
              <div class="setting-label">Combat Automation</div>
              <div class="setting-description">Automatically resolve attack rolls and apply damage during combat</div>
              <div v-if="!editMode || readonly" class="setting-value">
                {{ character.pluginData?.automateAttacks ? 'Enabled' : 'Disabled' }}
              </div>
              <label v-else class="setting-toggle">
                <input
                  v-model="automateAttacksValue"
                  type="checkbox"
                  class="checkbox-input"
                />
                <span class="checkbox-label">Enable automatic attack resolution</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'spells'" class="tab-pane spells-tab">
        <div 
          class="spells-section"
          :class="{ 'drag-over': isSpellDragOver }"
          @dragenter="handleSpellDragEnter"
          @dragover="handleSpellDragOver"
          @dragleave="handleSpellDragLeave"
          @drop="handleSpellDrop"
        >
          <!-- Spells Header -->
          <div class="spells-header">
            <h3 class="section-title">Spellcasting</h3>
            <div class="spell-count">
              {{ characterSpells.length + characterCantrips.length }} spell{{ (characterSpells.length + characterCantrips.length) !== 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Spell Slots (if character has spellcasting) -->
          <div v-if="hasSpellcasting" class="spell-slots-section">
            <h4 class="spell-slots-title">Spell Slots</h4>
            <div class="spell-slots-grid">
              <div 
                v-for="(slots, level) in spellSlots" 
                :key="level"
                class="spell-slot-level"
              >
                <div class="slot-level-label">Level {{ level }}</div>
                <div class="slot-counter">
                  <span class="slots-used">{{ slots.used }}</span>
                  <span class="slots-separator">/</span>
                  <span class="slots-total">{{ slots.total }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Spells List -->
          <div v-if="characterSpells.length || characterCantrips.length" class="spells-list">
            <div 
              v-for="spellLevel in sortedSpellLevels" 
              :key="spellLevel"
              class="spell-level-group"
            >
              <h4 class="spell-level-header">
                {{ spellLevel === 0 ? 'Cantrips' : `Level ${spellLevel}` }}
                <span class="spell-level-count">({{ getSpellsAtLevel(spellLevel).length }})</span>
              </h4>
              
              <div class="spell-level-list">
                <div 
                  v-for="spellData in getSpellsAtLevel(spellLevel)" 
                  :key="spellData.spell"
                  class="spell-item"
                  :class="{
                    'prepared': spellData.prepared,
                    'always-prepared': spellData.alwaysPrepared,
                    'cantrip': spellLevel === 0
                  }"
                  @dblclick="openSpellSheet(spellData)"
                >
                  <div class="spell-main">
                    <div class="spell-header">
                      <h5 class="spell-name">
                        {{ spellData.name || 'Unknown Spell' }}
                      </h5>
                      <div class="spell-prepared-control">
                        <div v-if="spellData.alwaysPrepared" class="spell-badge always-prepared">Always Prepared</div>
                        <label v-else-if="spellLevel > 0" class="prepared-checkbox-label">
                          <input 
                            type="checkbox" 
                            v-model="spellData.prepared"
                            @change="updateSpellPrepared(spellData)"
                            class="prepared-checkbox"
                            :disabled="readonly"
                          />
                          Prepared
                        </label>
                        <span v-else class="cantrip-label">Cantrip</span>
                      </div>
                    </div>
                  </div>

                  <!-- Spell Actions -->
                  <div class="spell-actions">
                    <button 
                      v-if="spellData.prepared || spellData.alwaysPrepared || spellLevel === 0"
                      @click="castSpell(spellData)" 
                      class="spell-action-btn cast-btn"
                      title="Cast this spell"
                    >
                      ✨ Cast
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <p>No spells assigned to this character.</p>
            <p class="empty-hint">Drag spells from the Documents tab to assign them.</p>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'gear'" class="tab-pane gear-tab">
        <div 
          class="equipment-section"
          :class="{ 'drag-over': isDragOver }"
          @dragenter="handleDragEnter"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <!-- Equipment Header -->
          <div class="equipment-header">
            <h3 class="section-title">Equipment</h3>
            <div class="item-count">
              {{ props.items?.value?.length || 0 }} item{{ (props.items?.value?.length || 0) !== 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Grouped Equipment Lists -->
          <div v-if="props.items?.value?.length" class="equipment-groups">
            
            <!-- Weapons Section -->
            <div v-if="groupedItems.weapons.length" class="item-group">
              <div class="group-header">
                <h4 class="group-title">⚔️ Weapons</h4>
                <span class="group-count">{{ groupedItems.weapons.length }}</span>
              </div>
              <div class="item-list">
                <div 
                  v-for="item in groupedItems.weapons" 
                  :key="item.id"
                  class="item-row"
                >
                  <div class="item-icon">
                    <img 
                      v-if="(item as any).image?.url || (item.imageId && itemImageUrls[item.imageId])" 
                      :src="(item as any).image?.url || (item.imageId ? itemImageUrls[item.imageId] : '')" 
                      :alt="item.name"
                      class="item-image"
                      @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                    />
                    <span v-else class="item-emoji">{{ getItemIcon(item) }}</span>
                  </div>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-actions">
                    <button 
                      @click="initiateWeaponAttack(item)" 
                      class="compact-action-btn attack-btn"
                      title="Attack"
                    >
                      ⚔️
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Armor Section -->
            <div v-if="groupedItems.armor.length" class="item-group">
              <div class="group-header">
                <h4 class="group-title">🛡️ Armor</h4>
                <span class="group-count">{{ groupedItems.armor.length }}</span>
              </div>
              <div class="item-list">
                <div 
                  v-for="item in groupedItems.armor" 
                  :key="item.id"
                  class="item-row"
                >
                  <div class="item-icon">
                    <img 
                      v-if="(item as any).image?.url || (item.imageId && itemImageUrls[item.imageId])" 
                      :src="(item as any).image?.url || (item.imageId ? itemImageUrls[item.imageId] : '')" 
                      :alt="item.name"
                      class="item-image"
                      @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                    />
                    <span v-else class="item-emoji">{{ getItemIcon(item) }}</span>
                  </div>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-actions">
                    <!-- Armor doesn't have action buttons -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Gear Section -->
            <div v-if="groupedItems.gear.length" class="item-group">
              <div class="group-header">
                <h4 class="group-title">🎒 Gear</h4>
                <span class="group-count">{{ groupedItems.gear.length }}</span>
              </div>
              <div class="item-list">
                <div 
                  v-for="item in groupedItems.gear" 
                  :key="item.id"
                  class="item-row"
                >
                  <div class="item-icon">
                    <img 
                      v-if="(item as any).image?.url || (item.imageId && itemImageUrls[item.imageId])" 
                      :src="(item as any).image?.url || (item.imageId ? itemImageUrls[item.imageId] : '')" 
                      :alt="item.name"
                      class="item-image"
                      @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                    />
                    <span v-else class="item-emoji">{{ getItemIcon(item) }}</span>
                  </div>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-actions">
                    <!-- General gear doesn't have action buttons -->
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="equipment-empty">
            <div class="empty-icon">🎒</div>
            <div class="empty-title">No Equipment</div>
            <div class="empty-description">
              This character doesn't have any equipment yet. Items can be added from the compendium.
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'background'" class="tab-pane background-tab">
        <div class="character-basics-section">
          <h3 class="section-title">Character Basics</h3>
          
          <!-- Class Selection -->
          <div class="basic-field">
            <label class="field-label">Class</label>
            <div v-if="!editMode || readonly" class="field-display">
              {{ classDisplayName }}
            </div>
            <select 
              v-else-if="characterCopy"
              :value="(characterCopy.pluginData as any)?.classes?.[0]?.class || ''"
              @change="updateCharacterClass(($event.target as HTMLSelectElement).value)"
              class="field-select"
            >
              <option value="">Select a class...</option>
              <option 
                v-for="cls in availableClasses" 
                :key="cls.id" 
                :value="cls.id"
              >
                {{ cls.name }}
              </option>
            </select>
          </div>

          <!-- Species Selection -->
          <div class="basic-field">
            <label class="field-label">Species</label>
            <div v-if="!editMode || readonly" class="field-display">
              {{ speciesDisplayName }}
            </div>
            <select 
              v-else-if="characterCopy"
              :value="characterCopy.pluginData?.species || ''"
              @change="updateCharacterSpecies(($event.target as HTMLSelectElement).value)"
              class="field-select"
            >
              <option value="">Select a species...</option>
              <option 
                v-for="species in availableSpecies" 
                :key="species.id" 
                :value="species.id"
              >
                {{ species.name }}
              </option>
            </select>
          </div>

          <!-- Background Selection -->
          <div class="basic-field">
            <label class="field-label">Background</label>
            <div v-if="!editMode || readonly" class="field-display">
              {{ backgroundDocument?.name || 'No background selected' }}
            </div>
            <select 
              v-else-if="characterCopy"
              :value="characterCopy.pluginData?.background || ''"
              @change="updateCharacterBackground(($event.target as HTMLSelectElement).value)"
              class="field-select"
            >
              <option value="">Select a background...</option>
              <option 
                v-for="background in availableBackgrounds" 
                :key="background.id" 
                :value="background.id"
              >
                {{ background.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Background Details (Read-only display) -->
        <div v-if="backgroundDocument" class="background-details-section">
          <h3 class="section-title">Background Details</h3>
          <div class="background-description">
            <p>{{ backgroundDocument.pluginData?.description || 'No description available.' }}</p>
          </div>
          
          <div v-if="(backgroundDocument.pluginData as any)?.features" class="background-features">
            <h4>Features</h4>
            <div 
              v-for="feature in (backgroundDocument.pluginData as any).features" 
              :key="feature.name"
              class="feature-item"
            >
              <strong>{{ feature.name }}:</strong> {{ feature.description }}
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'features'" class="tab-pane features-tab">
        <div class="empty-state">Features coming soon...</div>
      </div>
      
      <div v-if="activeTab === 'notes'" class="tab-pane notes-tab">
        <div class="notes-section">
          <h3>Character Notes</h3>
          <div class="notes-editor">
            <textarea 
              v-model="characterNotes" 
              :readonly="readonly || !editMode"
              class="notes-textarea" 
              placeholder="Write your character notes here..."
              rows="8"
            ></textarea>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Roll Dialog -->
  <AdvantageRollDialog
    v-model="showRollDialog"
    :ability="currentRollAbility"
    :skill="currentRollSkill"
    :base-modifier="currentRollSkill && currentRollSkill !== '' ? (skillBonuses[currentRollSkill] || 0) : (abilityModifiers[currentRollAbility] || 0)"
    :character-name="character.name"
    @roll="handleRollSubmission"
  />

  <!-- Saving Throw Roll Dialog -->
  <AdvantageRollDialog
    v-model="showSavingThrowDialog"
    :ability="currentRollAbility"
    :saving-throw="currentSavingThrow"
    :base-modifier="currentSavingThrow ? (savingThrowBonuses[currentSavingThrow] || 0) : 0"
    :character-name="character?.name"
    @roll="handleSavingThrowSubmission"
  />

  <!-- Initiative Roll Dialog -->
  <AdvantageRollDialog
    v-model="showInitiativeDialog"
    :ability="currentRollAbility"
    :base-modifier="initiativeBonus ? parseInt(initiativeBonus.replace('+', '')) : 0"
    :character-name="character?.name"
    @roll="handleInitiativeSubmission"
  />

  <!-- Weapon dialogs removed - now using unified action handlers -->
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, markRaw, type Ref } from 'vue';
import type { ICharacter, IItem, BaseDocument, IToken } from '@dungeon-lab/shared/types/index.mjs';
import type { DndCharacterClassDocument } from '../../types/dnd/character-class.mjs';
import type { DndSpeciesDocument } from '../../types/dnd/species.mjs';
import type { DndBackgroundDocument } from '../../types/dnd/background.mjs';
import type { AssignItemParameters } from '@dungeon-lab/shared/types/index.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';
import AdvantageRollDialog, { type RollDialogData } from '../internal/common/AdvantageRollDialog.vue';
// Weapon dialogs removed - now using unified action handlers

// All web package functionality is now accessed through PluginContext
// This maintains proper plugin architecture and prevents build issues

// Utility function to generate unique roll IDs
function generateUniqueId(): string {
  return `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Props - enhanced interface with container-provided document copy
interface Props {
  document: Ref<BaseDocument>;           // Original document (for view mode)
  documentCopy: Ref<BaseDocument | null>; // Editable copy (for edit mode)
  items: Ref<IItem[]>;
  editMode: boolean;
  hasUnsavedChanges: boolean;
  readonly?: boolean;
  // Methods provided by container
  save?: () => Promise<void>;
  cancel?: () => void;
  reset?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Get plugin context once for use throughout the component
const pluginContext = getPluginContext();
if (!pluginContext) {
  throw new Error('[CharacterSheet] Plugin context not available - this should never happen');
}

// Type-safe character accessor with validation
const character = computed(() => {
  return props.document.value as ICharacter;
});

// Debug logging for props
console.log('[CharacterSheet] Component received props:', {
  document: props.document,
  documentValue: props.document.value,
  documentName: props.document.value.name,
  documentType: props.document.value.documentType,
  items: props.items,
  editMode: props.editMode,
  readonly: props.readonly
});

// Debug logging for character ref
console.log('[CharacterSheet] Character ref:', character);
console.log('[CharacterSheet] Character value:', character.value);
console.log('[CharacterSheet] Character name:', character.value.name);
console.log('[CharacterSheet] Character armor class:', 
  (character.value.pluginData as Record<string, unknown>)?.attributes && 
  ((character.value.pluginData as Record<string, unknown>).attributes as Record<string, unknown>)?.armorClass);


// Compendium document data
const speciesDocument = ref<DndSpeciesDocument | null>(null);
const classDocument = ref<DndCharacterClassDocument | null>(null);
const backgroundDocument = ref<DndBackgroundDocument | null>(null);
const compendiumLoading = ref(false);
const compendiumError = ref<string | null>(null);

// Available options for character creation/editing
const availableClasses = ref<DndCharacterClassDocument[]>([]);
const availableSpecies = ref<DndSpeciesDocument[]>([]);
const availableBackgrounds = ref<DndBackgroundDocument[]>([]);

// Spell resolution storage
const resolvedSpells = ref<Map<string, any>>(new Map());

// All store functionality is now handled through PluginContext methods

// Emits - unified event interface
const emit = defineEmits<{
  'update:document': [document: BaseDocument];
  'save': [document: BaseDocument];
  'roll': [rollType: string, data: Record<string, unknown>];
  'close': [];
  'toggle-edit-mode': [];
  'drag-start': [event: MouseEvent];
}>();

// Component state
const activeTab = ref('overview');

// Roll dialog state
const showRollDialog = ref(false);
const showSavingThrowDialog = ref(false);
const showInitiativeDialog = ref(false);
const currentRollAbility = ref<string>('');
const currentRollSkill = ref<string>('');
const currentSavingThrow = ref<string>('');

// Weapon dialog state
// Weapon dialog refs removed - now using unified action handlers

// Drag and drop state
const isDragOver = ref(false);
const dragCounter = ref(0);

// Spell drag and drop state
const isSpellDragOver = ref(false);
const spellDragCounter = ref(0);
// Condition drag and drop state
const isConditionDragOver = ref(false);
const conditionDragCounter = ref(0);

// Item image URL cache (for dynamic loading from imageId)
const itemImageUrls = ref<Record<string, string>>({});

// Inject target context from encounter (with fallbacks)
const encounterTargetTokenIds = inject<Ref<string[]>>('encounterTargetTokenIds', () => ref([]), true);

// Inject selected token context from encounter (with fallbacks)
const encounterSelectedToken = inject<Ref<IToken | null>>('encounterSelectedToken', () => ref(null), true);

// Use container-provided document copy - no local state management needed!
// The container handles copy creation, change detection, and save/cancel logic

// Type-safe character copy accessor for edit mode
const characterCopy = computed(() => {
  const copy = props.documentCopy?.value;
  if (!copy) return null;
  if (copy.documentType !== 'character') {
    console.warn('[CharacterSheet] Document copy is not a character:', copy.documentType);
    return null;
  }
  return copy as ICharacter;
});

// Debug logging for document copy (moved after characterCopy declaration to avoid hoisting issues)
console.log('=== DEBUGGING DOCUMENT COPY ===');
console.log('props.documentCopy:', props.documentCopy);
console.log('props.documentCopy.value:', props.documentCopy?.value);
console.log('characterCopy:', characterCopy);
console.log('characterCopy.value:', characterCopy.value);
if (characterCopy.value) {
  console.log('characterCopy.value.pluginData:', characterCopy.value.pluginData);
  console.log('characterCopy.value.pluginData?.attributes:', characterCopy.value.pluginData?.attributes);
  console.log('characterCopy.value.pluginData?.attributes?.initiative:', (characterCopy.value.pluginData as any)?.attributes?.initiative);
}

// Direct v-model computed properties for character editing

// Hit points current - prioritize state.currentHitPoints for runtime HP, fallback to pluginData
const hitPointsCurrent = computed({
  get() {
    // First check state for runtime current HP
    if (typeof character.value!.state?.currentHitPoints === 'number') {
      return character.value!.state.currentHitPoints;
    }
    
    // Fallback to pluginData (baseline HP)
    const attributes = character.value!.pluginData?.attributes as any;
    const baselineHp = attributes?.hitPoints?.current || (character.value!.pluginData as any)?.hitPoints?.current || 8;
    
    // Initialize state if missing
    if (!character.value!.state) character.value!.state = {};
    character.value!.state.currentHitPoints = baselineHp;
    
    return baselineHp;
  },
  set(value: number) {
    // Always update state for runtime HP
    if (!character.value!.state) character.value!.state = {};
    character.value!.state.currentHitPoints = value;
    
    // Also update pluginData for persistence
    if (!character.value!.pluginData) character.value!.pluginData = {};
    if (!(character.value!.pluginData as any).attributes) (character.value!.pluginData as any).attributes = {};
    if (!(character.value!.pluginData as any).attributes.hitPoints) (character.value!.pluginData as any).attributes.hitPoints = {};
    (character.value!.pluginData as any).attributes.hitPoints.current = value;
    // Also update legacy format
    if (!(character.value!.pluginData as any).hitPoints) (character.value!.pluginData as any).hitPoints = {};
    (character.value!.pluginData as any).hitPoints.current = value;
  }
});

// Hit points max - direct binding to character.pluginData.attributes.hitPoints.maximum
const hitPointsMax = computed({
  get() {
    const attributes = character.value!.pluginData?.attributes as any;
    return attributes?.hitPoints?.maximum || (character.value!.pluginData as any)?.hitPoints?.maximum || 8;
  },
  set(value: number) {
    if (!character.value!.pluginData) character.value!.pluginData = {};
    if (!(character.value!.pluginData as any).attributes) (character.value!.pluginData as any).attributes = {};
    if (!(character.value!.pluginData as any).attributes.hitPoints) (character.value!.pluginData as any).attributes.hitPoints = {};
    (character.value!.pluginData as any).attributes.hitPoints.maximum = value;
    // Also update legacy format
    if (!(character.value!.pluginData as any).hitPoints) (character.value!.pluginData as any).hitPoints = {};
    (character.value!.pluginData as any).hitPoints.maximum = value;
  }
});

// Speed - direct binding to character.pluginData.attributes.movement.walk
const speedValue = computed({
  get() {
    const attributes = character.value!.pluginData?.attributes as any;
    return attributes?.movement?.walk || (character.value!.pluginData as any)?.speed || 30;
  },
  set(value: number) {
    if (!character.value!.pluginData) character.value!.pluginData = {};
    if (!(character.value!.pluginData as any).attributes) (character.value!.pluginData as any).attributes = {};
    if (!(character.value!.pluginData as any).attributes.movement) (character.value!.pluginData as any).attributes.movement = {};
    (character.value!.pluginData as any).attributes.movement.walk = value;
    // Also update legacy format
    (character.value!.pluginData as any).speed = value;
  }
});

// Automate attacks checkbox - direct binding to character.pluginData.automateAttacks
const automateAttacksValue = computed({
  get() {
    return character.value!.pluginData?.automateAttacks || false;
  },
  set(value: boolean) {
    if (!character.value!.pluginData) character.value!.pluginData = {};
    (character.value!.pluginData as any).automateAttacks = value;
  }
});

// Tab definitions
const tabs = [
  { id: 'overview', name: 'Main', icon: '📋' },
  { id: 'conditions', name: 'Conditions', icon: '🎯' },
  { id: 'abilities', name: 'Abilities', icon: '💪' },
  { id: 'skills', name: 'Skills', icon: '🏹' },
  { id: 'spells', name: 'Spells', icon: '✨' },
  { id: 'gear', name: 'Equipment', icon: '🎒' },
  { id: 'background', name: 'Background', icon: '📜' },
  { id: 'features', name: 'Features', icon: '⭐' },
  { id: 'notes', name: 'Notes', icon: '📝' },
  { id: 'settings', name: 'Settings', icon: '⚙️' }
];

// Process ability scores from proper D&D schema
const finalAbilities = computed(() => {
  const abilities = (character.value!.pluginData as any)?.abilities || {};
  const finalScores: Record<string, number> = {};
  
  // Standard ability names in order
  const abilityNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  
  for (const abilityName of abilityNames) {
    const ability = abilities[abilityName];
    if (ability && typeof ability === 'object') {
      // New D&D schema format: { base, racial, enhancement, override }
      if (ability.override !== undefined) {
        finalScores[abilityName] = ability.override;
      } else {
        finalScores[abilityName] = (ability.base || 10) + (ability.racial || 0) + (ability.enhancement || 0);
      }
    } else {
      // Fallback for legacy format or simple numbers
      finalScores[abilityName] = typeof ability === 'number' ? ability : 10;
    }
  }
  
  return finalScores;
});

// Ability score update method - updates characterCopy.pluginData.abilities[ability].override for proper change detection
const updateAbilityScore = (abilityName: string, newScore: number) => {
  if (isNaN(newScore) || newScore < 1 || newScore > 30) return;
  
  // Only allow updates in edit mode
  if (!props.editMode || props.readonly) {
    console.warn('[CharacterSheet] Cannot update ability scores outside of edit mode');
    return;
  }
  
  // Must have a character copy to edit
  if (!characterCopy.value) {
    console.warn('[CharacterSheet] No character copy available for editing');
    return;
  }
  
  // Ensure abilities structure exists in the character COPY (not original)
  if (!characterCopy.value.pluginData) characterCopy.value.pluginData = {};
  if (!(characterCopy.value.pluginData as any).abilities) (characterCopy.value.pluginData as any).abilities = {};
  if (!(characterCopy.value.pluginData as any).abilities[abilityName]) (characterCopy.value.pluginData as any).abilities[abilityName] = {};
  
  // Set the override value in the copy (this will be detected by patch generation)
  (characterCopy.value.pluginData as any).abilities[abilityName].override = newScore;
  
  console.log('[CharacterSheet] Updated ability score in copy:', { abilityName, newScore, copyId: characterCopy.value.id });
};

// Computed properties for D&D 5e mechanics
const abilityModifiers = computed(() => {
  const modifiers: Record<string, number> = {};
  for (const [abilityName, abilityValue] of Object.entries(finalAbilities.value)) {
    modifiers[abilityName] = Math.floor((abilityValue - 10) / 2);
  }
  return modifiers;
});

const proficiencyBonus = computed(() => {
  // Try D&D schema first
  const progression = character.value!.pluginData?.progression as any;
  if (progression?.proficiencyBonus) {
    return progression.proficiencyBonus;
  }
  
  // Calculate from level (fallback)
  const level = progression?.level || (character.value!.pluginData as any)?.level || 1;
  return Math.ceil(level / 4) + 1;
});

// Determine saving throw proficiencies from D&D schema
const savingThrowProficiencies = computed(() => {
  const proficiencies: Record<string, boolean> = {};
  const abilities = (character.value!.pluginData as any)?.abilities || {};
  
  // Use proficiencies from the D&D schema if available
  for (const abilityName of Object.keys(finalAbilities.value)) {
    const ability = abilities[abilityName];
    if (ability && typeof ability === 'object' && 'saveProficient' in ability) {
      proficiencies[abilityName] = ability.saveProficient || false;
    } else {
      // Fallback: determine from character class (legacy logic)
      proficiencies[abilityName] = false;
      // Use fetched class document for determining save proficiencies
      if (classDocument.value?.pluginData?.proficiencies?.savingThrows?.includes(abilityName as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma')) {
        proficiencies[abilityName] = true;
      }
    }
  }
  
  return proficiencies;
});

const savingThrowBonuses = computed(() => {
  const bonuses: Record<string, number> = {};
  for (const abilityName of Object.keys(finalAbilities.value)) {
    const abilityMod = abilityModifiers.value[abilityName] || 0;
    const profBonus = savingThrowProficiencies.value[abilityName] ? proficiencyBonus.value : 0;
    bonuses[abilityName] = abilityMod + profBonus;
  }
  return bonuses;
});

// Skills structure from character data - reactive to editing
const characterSkills = computed(() => {
  // Use characterCopy in edit mode for reactivity, otherwise use read-only character
  const sourceData = (props.editMode && !props.readonly && characterCopy.value) 
    ? characterCopy.value 
    : character.value!;
  
  const skills = sourceData.pluginData?.skills || {};
  
  // Define standard D&D 5e skills with their abilities
  const standardSkills = {
    'acrobatics': 'dexterity',
    'animal handling': 'wisdom',
    'arcana': 'intelligence',
    'athletics': 'strength',
    'deception': 'charisma',
    'history': 'intelligence',
    'insight': 'wisdom',
    'intimidation': 'charisma',
    'investigation': 'intelligence',
    'medicine': 'wisdom',
    'nature': 'intelligence',
    'perception': 'wisdom',
    'performance': 'charisma',
    'persuasion': 'charisma',
    'religion': 'intelligence',
    'sleight of hand': 'dexterity',
    'stealth': 'dexterity',
    'survival': 'wisdom'
  };
  
  // Build skills from character data or standard list
  const result: Record<string, { ability: string; proficiency: string }> = {};
  
  // Use character skills if they exist, otherwise create from standard list
  if (Object.keys(skills).length > 0) {
    for (const [skillName, skillData] of Object.entries(skills)) {
      if (typeof skillData === 'object' && skillData !== null) {
        const skill = skillData as { ability?: string; proficient?: boolean; expert?: boolean }; // Type assertion for plugin data
        result[skillName] = {
          ability: skill.ability || standardSkills[skillName as keyof typeof standardSkills] || 'wisdom',
          proficiency: skill.expert ? 'expert' : 
                      skill.proficient ? 'proficient' : 'none'
        };
      }
    }
  } else {
    // Create from standard list with no proficiencies if character has no skills defined
    for (const [skillName, ability] of Object.entries(standardSkills)) {
      result[skillName] = {
        ability,
        proficiency: 'none'
      };
    }
  }
  
  return result;
});

const skillBonuses = computed(() => {
  const bonuses: Record<string, number> = {};
  
  for (const [skillName, skill] of Object.entries(characterSkills.value)) {
    const abilityMod = abilityModifiers.value[skill.ability] || 0;
    let profBonus = 0;
    
    if (skill.proficiency === 'expert') {
      profBonus = proficiencyBonus.value * 2;
    } else if (skill.proficiency === 'proficient') {
      profBonus = proficiencyBonus.value;
    }
    
    bonuses[skillName] = abilityMod + profBonus;
  }
  
  return bonuses;
});

const passivePerception = computed(() => {
  const perceptionBonus = skillBonuses.value.perception || 0;
  return 10 + perceptionBonus;
});

const armorClassDisplay = computed(() => {
  const attributes = character.value!.pluginData?.attributes as any;
  if (attributes?.armorClass?.value) {
    return attributes.armorClass.value;
  }
  return (character.value!.pluginData as any)?.armorClass || 10;
});

const hitPointsDisplay = computed(() => {
  const attributes = character.value!.pluginData?.attributes as any;
  if (attributes?.hitPoints) {
    return `${attributes.hitPoints.current}/${attributes.hitPoints.maximum}`;
  }
  const hitPoints = (character.value!.pluginData as any)?.hitPoints || { current: 8, maximum: 8 };
  return `${hitPoints.current}/${hitPoints.maximum}`;
});

const speedDisplay = computed(() => {
  const attributes = character.value!.pluginData?.attributes as any;
  if (attributes?.movement?.walk) {
    return `${attributes.movement.walk} ft`;
  }
  const speed = (character.value!.pluginData as any)?.speed || 30;
  return `${speed} ft`;
});

const initiativeBonus = computed(() => {
  const dexMod = abilityModifiers.value.dexterity || 0;
  const attributes = character.value!.pluginData?.attributes as any;
  let initBonus = 0;
  
  if (attributes?.initiative?.bonus !== undefined) {
    initBonus = attributes.initiative.bonus;
  } else {
    initBonus = (character.value!.pluginData as any)?.initiative || 0;
  }
  
  const bonus = dexMod + initBonus;
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
});

// Display names from fetched compendium documents
const speciesDisplayName = computed(() => {
  if (compendiumLoading.value) return 'Loading...';
  if (compendiumError.value) return 'Error loading species';
  return speciesDocument.value?.name || 'Unknown Species';
});

const classDisplayName = computed(() => {
  if (compendiumLoading.value) return 'Loading...';
  if (compendiumError.value) return 'Error loading class';
  return classDocument.value?.name || 'Unknown Class';
});

// Spell-related computed properties (context-aware for edit mode)
const characterSpells = computed(() => {
  // In edit mode, use characterCopy (editable); in view mode, use character (read-only)
  const sourceCharacter = props.editMode && !props.readonly && characterCopy.value 
    ? characterCopy.value 
    : character.value;
    
  const spellcastingData = (sourceCharacter?.pluginData as any)?.spellcasting;
  if (!spellcastingData?.spells) {
    console.log('[CharacterSheet] No spells found in spellcasting data:', spellcastingData);
    return [];
  }
  console.log('[CharacterSheet] Found spells:', spellcastingData.spells);
  return spellcastingData.spells;
});

const characterCantrips = computed(() => {
  // In edit mode, use characterCopy (editable); in view mode, use character (read-only)
  const sourceCharacter = props.editMode && !props.readonly && characterCopy.value 
    ? characterCopy.value 
    : character.value;
    
  const spellcastingData = (sourceCharacter?.pluginData as any)?.spellcasting;
  if (!spellcastingData?.cantrips) {
    console.log('[CharacterSheet] No cantrips found in spellcasting data:', spellcastingData);
    return [];
  }
  
  console.log('[CharacterSheet] Found cantrips:', spellcastingData.cantrips);
  
  // Transform cantrip data to match spell data structure for UI compatibility
  return spellcastingData.cantrips.map((cantrip: any) => ({
    ...cantrip,
    level: 0,
    prepared: true, // Cantrips are always "prepared"
    alwaysPrepared: true
  }));
});

const hasSpellcasting = computed(() => {
  const spellcastingData = (character.value?.pluginData as any)?.spellcasting;
  return !!spellcastingData;
});

const spellSlots = computed(() => {
  const spellcastingData = (character.value?.pluginData as any)?.spellcasting;
  if (!spellcastingData?.spellSlots) return {};
  return spellcastingData.spellSlots;
});

const sortedSpellLevels = computed(() => {
  const levels = new Set<number>();
  
  // Add levels from regular spells
  characterSpells.value.forEach((spell: any) => {
    levels.add(spell.level || 0);
  });
  
  // Add level 0 if character has cantrips
  if (characterCantrips.value.length > 0) {
    levels.add(0);
  }
  
  const sortedLevels = Array.from(levels).sort((a, b) => a - b);
  console.log('[CharacterSheet] Sorted spell levels:', sortedLevels, 'spells:', characterSpells.value.length, 'cantrips:', characterCantrips.value.length);
  
  return sortedLevels;
});

// Equipment grouping for compact display
const groupedItems = computed(() => {
  if (!props.items?.value?.length) {
    return { weapons: [], armor: [], gear: [] };
  }
  return groupItemsByType(props.items.value);
});

// Conditions - accessing character state conditions
const activeConditions = computed(() => {
  const conditions = character.value?.state?.conditions;
  if (!Array.isArray(conditions)) return [];
  return conditions;
});

// Notes - direct binding to character.pluginData.roleplay.backstory
const characterNotes = computed({
  get() {
    // Try D&D schema format first, then fallback to legacy
    return (character.value!.pluginData as any)?.roleplay?.backstory || 
           (character.value!.pluginData as any)?.notes || '';
  },
  set(value: string) {
    if (!character.value!.pluginData) character.value!.pluginData = {};
    if (!(character.value!.pluginData as any).roleplay) (character.value!.pluginData as any).roleplay = {};
    (character.value!.pluginData as any).roleplay.backstory = value;
    // Also update legacy format
    (character.value!.pluginData as any).notes = value;
  }
});


// Weapon identification and actions
const isWeapon = (item: IItem): boolean => {
  const pluginData = item.pluginData as any;
  const itemType = pluginData?.type || pluginData?.category || pluginData?.weaponType;
  const weaponTypes = ['weapon', 'simple-weapon', 'martial-weapon', 'melee', 'ranged', 'melee-weapon', 'ranged-weapon'];
  
  return weaponTypes.some(type => 
    itemType === type || 
    (typeof itemType === 'string' && itemType.toLowerCase().includes('weapon'))
  ) || !!(pluginData?.damage?.dice);
};

const isArmor = (item: IItem): boolean => {
  const pluginData = item.pluginData as any;
  const itemType = pluginData?.type || pluginData?.category || pluginData?.armorType;
  const armorTypes = ['armor', 'light-armor', 'medium-armor', 'heavy-armor', 'shield'];
  
  return armorTypes.some(type => 
    itemType === type || 
    (typeof itemType === 'string' && itemType.toLowerCase().includes('armor')) ||
    (typeof itemType === 'string' && itemType.toLowerCase().includes('shield'))
  ) || !!(pluginData?.armorClass);
};

const groupItemsByType = (items: IItem[]) => {
  const weapons: IItem[] = [];
  const armor: IItem[] = [];
  const gear: IItem[] = [];
  
  items.forEach(item => {
    if (isWeapon(item)) {
      weapons.push(item);
    } else if (isArmor(item)) {
      armor.push(item);
    } else {
      gear.push(item);
    }
  });
  
  return { weapons, armor, gear };
};

const getItemIcon = (item: IItem): string => {
  // Use type-based emojis for now (will be replaced with images when image population is working)
  if (isWeapon(item)) {
    const pluginData = item.pluginData as any;
    const weaponType = pluginData?.weaponType || pluginData?.category;
    if (typeof weaponType === 'string') {
      if (weaponType.includes('ranged') || weaponType.includes('bow') || weaponType.includes('crossbow')) {
        return '🏹';
      }
      if (weaponType.includes('sword')) return '⚔️';
      if (weaponType.includes('axe')) return '🪓';
      if (weaponType.includes('hammer') || weaponType.includes('mace')) return '🔨';
      if (weaponType.includes('spear') || weaponType.includes('javelin')) return '🗡️';
    }
    return '⚔️'; // Default weapon icon
  }
  
  if (isArmor(item)) {
    const pluginData = item.pluginData as any;
    const armorType = pluginData?.armorType || pluginData?.category;
    if (typeof armorType === 'string' && armorType.includes('shield')) {
      return '🛡️';
    }
    return '🦺'; // Default armor icon
  }
  
  // Default gear icon
  return '🎒';
};

const initiateWeaponAttack = async (weapon: IItem) => {
  console.log('[CharacterSheet] Initiating weapon attack:', weapon.name);

  if (!character.value) {
    console.error('Character not available');
    return;
  }

  try {
    const result = await pluginContext.requestAction(
      'dnd5e-2024:weapon-attack',
      character.value.id,                    // actorId
      { weaponId: weapon.id },               // parameters
      encounterSelectedToken.value?.id,      // actorTokenId
      encounterTargetTokenIds.value || [],   // targetTokenIds
      { description: `Attack with ${weapon.name}` }
    );
    
    if (result.success) {
      console.log('[CharacterSheet] Weapon attack request submitted successfully:', result);
    } else {
      console.error('[CharacterSheet] Weapon attack request failed:', result.error);
      pluginContext.showNotification(`Failed to attack with ${weapon.name}: ${result.error || 'Unknown error'}`, 'error', 5000);
    }
  } catch (error) {
    console.error('Weapon attack failed:', error);
    pluginContext.showNotification(`Failed to attack with ${weapon.name}: Unable to process attack at this time`, 'error', 5000);
  }
};

// Weapon damage now handled automatically by unified weapon attack action


// Methods
const formatModifier = (value: number): string => {
  return value >= 0 ? `+${value}` : `${value}`;
};


// Updated roll handling - opens dialog instead of direct rolling
const rollAbilityCheck = (ability: string) => {
  currentRollAbility.value = ability;
  showRollDialog.value = true;
};

// Handle roll submission from dialog
const handleRollSubmission = (rollData: RollDialogData) => {

  // Generate unique roll ID
  const rollId = generateUniqueId();
  
  // Determine if this is a skill check or ability check
  const isSkillCheck = !!rollData.skill;
  
  // Create roll object following the established schema
  const roll = {
    rollId: rollId,
    rollType: 'ability-check',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: 20, 
      quantity: rollData.advantageMode === 'normal' ? 1 : 2 
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier,
      pluginArgs: isSkillCheck ? {
        skill: rollData.skill,
        ability: rollData.ability,
        advantageMode: rollData.advantageMode
      } : { 
        ability: rollData.ability,
        advantageMode: rollData.advantageMode
      }
    },
    modifiers: [
      { 
        type: isSkillCheck ? 'skill' : 'ability', 
        value: rollData.baseModifier, 
        source: isSkillCheck ? `${rollData.skill} skill` : `${rollData.ability} modifier` 
      }
    ],
    metadata: {
      title: isSkillCheck 
        ? `${rollData.skill!.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (${rollData.ability.slice(0, 3).toUpperCase()})`
        : `${rollData.ability.charAt(0).toUpperCase()}${rollData.ability.slice(1)} Check`,
      characterName: character.value!.name
    }
  };

  // Submit roll via plugin context
  pluginContext.submitRoll(roll);
  console.log(`[CharacterSheet] Submitted ${isSkillCheck ? rollData.skill + ' skill' : rollData.ability + ' ability'} roll:`, roll);
};

// Handle saving throw roll submission
const handleSavingThrowSubmission = (rollData: RollDialogData) => {

  // Generate unique roll ID
  const rollId = generateUniqueId();
  
  // Create roll object following the established schema
  const roll = {
    rollId: rollId,
    rollType: 'saving-throw',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: 20, 
      quantity: rollData.advantageMode === 'normal' ? 1 : 2 
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier,
      pluginArgs: {
        ability: rollData.ability,
        advantageMode: rollData.advantageMode
      }
    },
    modifiers: [
      { 
        type: 'saving-throw', 
        value: rollData.baseModifier, 
        source: `${rollData.ability} saving throw` 
      }
    ],
    metadata: {
      title: `${rollData.ability.charAt(0).toUpperCase()}${rollData.ability.slice(1)} Saving Throw`,
      characterName: character.value?.name
    }
  };

  // Submit roll via plugin context
  pluginContext.submitRoll(roll);
  console.log(`[CharacterSheet] Submitted ${rollData.ability} saving throw roll:`, roll);
  showSavingThrowDialog.value = false;
};

// Handle initiative roll submission
const handleInitiativeSubmission = (rollData: RollDialogData) => {

  // Generate unique roll ID
  const rollId = generateUniqueId();
  
  // Create roll object following the established schema
  const roll = {
    rollId: rollId,
    rollType: 'initiative',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: 20, 
      quantity: rollData.advantageMode === 'normal' ? 1 : 2 
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier,
      pluginArgs: {
        advantageMode: rollData.advantageMode
      }
    },
    modifiers: [
      { 
        type: 'initiative', 
        value: rollData.baseModifier, 
        source: 'dexterity + initiative bonus' 
      }
    ],
    metadata: {
      title: 'Initiative',
      characterName: character.value?.name
    }
  };

  // Submit roll via plugin context
  pluginContext.submitRoll(roll);
  console.log('[CharacterSheet] Submitted initiative roll:', roll);
  showInitiativeDialog.value = false;
};

// Weapon attack roll submission removed - now using unified action handler

// Weapon damage roll submission removed - now handled automatically by unified action handler

const rollSavingThrow = (ability: string) => {
  currentSavingThrow.value = ability;
  currentRollAbility.value = ability;
  showSavingThrowDialog.value = true;
};

const rollSkillCheck = (skill: string) => {
  currentRollSkill.value = skill;
  currentRollAbility.value = characterSkills.value[skill]?.ability || '';
  showRollDialog.value = true;
};

const toggleSkillProficiency = (skillName: string) => {
  console.log('[Skills] toggleSkillProficiency called for:', skillName);
  console.log('[Skills] editMode:', props.editMode, 'readonly:', props.readonly);
  console.log('[Skills] characterCopy.value:', characterCopy.value);
  
  if (!characterCopy.value?.pluginData) {
    console.log('[Skills] No pluginData found on characterCopy');
    return;
  }

  // Initialize skills object if it doesn't exist
  if (!characterCopy.value.pluginData.skills) {
    console.log('[Skills] Initializing skills object');
    characterCopy.value.pluginData.skills = {};
  }

  const skills = characterCopy.value.pluginData.skills as Record<string, { proficient?: boolean; expert?: boolean }>;
  const currentSkill = skills[skillName] || { proficient: false, expert: false };
  
  console.log('[Skills] Current skill state:', currentSkill);

  // Cycle through proficiency states: none → proficient → expert → none
  if (!currentSkill.proficient) {
    // None → Proficient
    skills[skillName] = { proficient: true, expert: false };
    console.log('[Skills] Changed to proficient');
  } else if (currentSkill.proficient && !currentSkill.expert) {
    // Proficient → Expert
    skills[skillName] = { proficient: true, expert: true };
    console.log('[Skills] Changed to expert');
  } else {
    // Expert → None
    skills[skillName] = { proficient: false, expert: false };
    console.log('[Skills] Changed to none');
  }
  
  console.log('[Skills] New skill state:', skills[skillName]);
};

const rollInitiative = () => {
  currentRollAbility.value = 'dexterity'; // Initiative is based on dexterity
  showInitiativeDialog.value = true;
};

const switchTab = (tabId: string) => {
  activeTab.value = tabId;
};

// Removed updateCharacter method - direct v-model binding handles all updates

const saveCharacter = () => {
  emit('save', character.value!);
};

const toggleEditMode = () => {
  emit('toggle-edit-mode');
};

const closeSheet = () => {
  // Emit close event to parent
  emit('close');
};

// Window drag functionality - emit event for framework to handle
const startDrag = (event: MouseEvent) => {
  // Don't start drag if clicking on buttons or other interactive elements
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    return;
  }
  
  // Emit drag start event for framework to handle window positioning
  emit('drag-start', event);
  event.preventDefault();
};

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeSheet();
  } else if (event.key === 'Tab' && event.ctrlKey) {
    event.preventDefault();
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.value);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }
};

// Compendium data fetching functions using PluginContext
const loadCompendiumDocuments = async () => {
  try {
    compendiumLoading.value = true;
    compendiumError.value = null;
    
    const promises = [];
    
    // Use shared plugin context
    
    // Fetch species document if we have a species ObjectId
    const speciesId = character.value!.pluginData?.species;
    if (speciesId && typeof speciesId === 'string') {
      promises.push(
        pluginContext.getDocument(speciesId)
          .then(doc => { speciesDocument.value = markRaw(doc as DndSpeciesDocument); })
          .catch(err => { console.warn('Failed to load species:', err); })
      );
    }
    
    // Fetch class document if we have a class ObjectId
    const classes = character.value!.pluginData?.classes as any[];
    const classId = classes?.[0]?.class;
    if (classId && typeof classId === 'string') {
      promises.push(
        pluginContext.getDocument(classId)
          .then(doc => { classDocument.value = markRaw(doc as DndCharacterClassDocument); })
          .catch(err => { console.warn('Failed to load class:', err); })
      );
    }
    
    // Fetch background document if we have a background ObjectId
    const backgroundId = character.value!.pluginData?.background;
    if (backgroundId && typeof backgroundId === 'string') {
      promises.push(
        pluginContext.getDocument(backgroundId)
          .then(doc => { backgroundDocument.value = markRaw(doc as DndBackgroundDocument); })
          .catch(err => { console.warn('Failed to load background:', err); })
      );
    }
    
    // Fetch spell documents for all character spells
    const spells = characterSpells.value;
    if (spells && spells.length > 0) {
      spells.forEach((spellData: any) => {
        const spellId = spellData.spell;
        if (spellId && typeof spellId === 'string') {
          promises.push(
            pluginContext.getDocument(spellId)
              .then(doc => { 
                resolvedSpells.value.set(spellId, markRaw(doc)); 
                console.log('[CharacterSheet] Resolved spell:', doc.name);
              })
              .catch(err => { 
                console.warn('Failed to load spell:', spellId, err); 
              })
          );
        }
      });
    }
    
    // Fetch spell documents for all character cantrips
    const cantrips = characterCantrips.value;
    if (cantrips && cantrips.length > 0) {
      cantrips.forEach((cantripData: any) => {
        const spellId = cantripData.spell;
        if (spellId && typeof spellId === 'string') {
          promises.push(
            pluginContext.getDocument(spellId)
              .then(doc => { 
                resolvedSpells.value.set(spellId, markRaw(doc)); 
                console.log('[CharacterSheet] Resolved cantrip:', doc.name);
              })
              .catch(err => { 
                console.warn('Failed to load cantrip:', spellId, err); 
              })
          );
        }
      });
    }
    
    // Wait for all requests to complete
    await Promise.all(promises);
    
    console.log('[CharacterSheet] Spell resolution complete. Resolved spells:', Array.from(resolvedSpells.value.keys()));
    
  } catch (error) {
    console.error('Failed to load compendium documents:', error);
    compendiumError.value = 'Failed to load character data';
  } finally {
    compendiumLoading.value = false;
  }
};

// Load available options for character editing
const loadAvailableOptions = async () => {
  
  console.log('[CharacterSheet] Loading available character creation options');
  
  try {
    // Search for classes
    const classes = await pluginContext.searchDocuments({
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document',
      pluginDocumentType: 'character-class',
      limit: 50
    });
    availableClasses.value = classes as DndCharacterClassDocument[];
    console.log(`[CharacterSheet] Loaded ${classes.length} available classes`);
    
    // Search for species
    const species = await pluginContext.searchDocuments({
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document',
      pluginDocumentType: 'species',
      limit: 50
    });
    availableSpecies.value = species as DndSpeciesDocument[];
    console.log(`[CharacterSheet] Loaded ${species.length} available species`);
    
    // Search for backgrounds
    const backgrounds = await pluginContext.searchDocuments({
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document',
      pluginDocumentType: 'background',
      limit: 50
    });
    availableBackgrounds.value = backgrounds as DndBackgroundDocument[];
    console.log(`[CharacterSheet] Loaded ${backgrounds.length} available backgrounds`);
    
  } catch (error) {
    console.error('[CharacterSheet] Failed to load available options:', error);
    pluginContext.showNotification('Failed to load character creation options', 'error', 4000);
  }
};

// ============================================================================
// DRAG AND DROP FUNCTIONALITY  
// ============================================================================

// Spell utility functions
const getSpellsAtLevel = (level: number) => {
  if (level === 0) {
    return characterCantrips.value;
  }
  return characterSpells.value.filter((spell: any) => (spell.level || 0) === level);
};

const getResolvedSpell = (spellId: string) => {
  const spell = resolvedSpells.value.get(spellId);
  console.log('[CharacterSheet] Looking up spell:', spellId, 'Found:', !!spell, spell?.name || 'N/A');
  return spell;
};


const castSpell = async (spellData: any) => {
  const spell = getResolvedSpell(spellData.spell);
  if (!spell) {
    console.error('[CharacterSheet] Cannot cast unknown spell:', spellData);
    pluginContext.showNotification('Cannot cast spell: Spell data not found', 'error', 4000);
    return;
  }
  
  console.log('[CharacterSheet] Casting spell:', spell.name, spellData);
  

  if (!character.value) {
    console.error('[CharacterSheet] No character available for spell casting');
    return;
  }

  // Check if a token is selected (required for spell casting)
  if (!encounterSelectedToken.value?.id) {
    console.error('[CharacterSheet] No token selected for spell casting');
    pluginContext.showNotification('Cannot cast spell: Please select a token on the map to cast spells', 'error', 4000);
    return;
  }

  try {
    const result = await pluginContext.requestAction(
      'dnd5e-2024:cast-spell',
      character.value.id,                    // actorId
      {
        spellId: spell.id,
        spellSlotLevel: spellData.level,     // Required: 0 for cantrips, 1-9 for leveled spells
        castingTime: 'action'                // Default casting time
      },                                     // parameters
      encounterSelectedToken.value.id,      // actorTokenId
      encounterTargetTokenIds.value,        // targetTokenIds
      { description: `Cast ${spell.name}` }
    );
    
    if (result.success) {
      console.log('[CharacterSheet] Spell casting request submitted successfully:', result);
    } else {
      console.error('[CharacterSheet] Spell casting request failed:', result.error);
      pluginContext.showNotification(`Failed to cast ${spell.name}: ${result.error || 'Unknown error'}`, 'error', 5000);
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Error casting spell:', error);
    pluginContext.showNotification(`Failed to cast ${spell.name}: Unable to process spell casting at this time`, 'error', 5000);
  }
};

// Character class/species/background change handlers
const updateCharacterClass = async (classId: string) => {
  if (!characterCopy.value || props.readonly) {
    console.warn('[CharacterSheet] Cannot update class: no character copy or readonly mode');
    return;
  }
  
  console.log('[CharacterSheet] Updating character class to:', classId);
  
  // Update the character data
  if (!characterCopy.value.pluginData.classes) {
    (characterCopy.value.pluginData as any).classes = [];
  }
  
  // Ensure the first class entry exists
  if (!(characterCopy.value.pluginData as any).classes[0]) {
    (characterCopy.value.pluginData as any).classes[0] = {};
  }
  
  (characterCopy.value.pluginData as any).classes[0].class = classId;
  
  // Reload class document for display
  if (classId) {
    try {
      const doc = await pluginContext.getDocument(classId);
      classDocument.value = markRaw(doc as DndCharacterClassDocument);
      console.log('[CharacterSheet] Loaded new class document:', doc.name);
    } catch (error) {
      console.error('[CharacterSheet] Failed to load new class document:', error);
      pluginContext.showNotification('Failed to load class information', 'error', 4000);
    }
  } else {
    classDocument.value = null;
  }
};

const updateCharacterSpecies = async (speciesId: string) => {
  if (!characterCopy.value || props.readonly) {
    console.warn('[CharacterSheet] Cannot update species: no character copy or readonly mode');
    return;
  }
  
  console.log('[CharacterSheet] Updating character species to:', speciesId);
  
  (characterCopy.value.pluginData as any).species = speciesId;
  
  // Reload species document for display
  if (speciesId) {
    try {
      const doc = await pluginContext.getDocument(speciesId);
      speciesDocument.value = markRaw(doc as DndSpeciesDocument);
      console.log('[CharacterSheet] Loaded new species document:', doc.name);
    } catch (error) {
      console.error('[CharacterSheet] Failed to load new species document:', error);
      pluginContext.showNotification('Failed to load species information', 'error', 4000);
    }
  } else {
    speciesDocument.value = null;
  }
};

const updateCharacterBackground = async (backgroundId: string) => {
  if (!characterCopy.value || props.readonly) {
    console.warn('[CharacterSheet] Cannot update background: no character copy or readonly mode');
    return;
  }
  
  console.log('[CharacterSheet] Updating character background to:', backgroundId);
  
  (characterCopy.value.pluginData as any).background = backgroundId;
  
  // Reload background document for display
  if (backgroundId) {
    try {
      const doc = await pluginContext.getDocument(backgroundId);
      backgroundDocument.value = markRaw(doc as DndBackgroundDocument);
      console.log('[CharacterSheet] Loaded new background document:', doc.name);
    } catch (error) {
      console.error('[CharacterSheet] Failed to load new background document:', error);
      pluginContext.showNotification('Failed to load background information', 'error', 4000);
    }
  } else {
    backgroundDocument.value = null;
  }
};

// Update spell prepared status
const updateSpellPrepared = (spellData: any) => {
  console.log('[CharacterSheet] Updating spell prepared status:', spellData.name, spellData.prepared);
  
  if (props.readonly) {
    return;
  }
  
  // In edit mode, the v-model should be automatically updating the characterCopy data
  // since our characterSpells computed property now returns data from characterCopy
  if (props.editMode && characterCopy.value) {
    // Ensure the characterCopy has the spellcasting structure
    if (!characterCopy.value.pluginData) {
      characterCopy.value.pluginData = {};
    }
    if (!(characterCopy.value.pluginData as any).spellcasting) {
      (characterCopy.value.pluginData as any).spellcasting = { spells: [], cantrips: [], spellSlots: {} };
    }
    
    console.log('[CharacterSheet] Spell prepared status updated in character copy');
    // The actual data update is handled by v-model since characterSpells now points to characterCopy
  } else {
    console.warn('[CharacterSheet] Not in edit mode or no characterCopy available - spell changes may not persist');
  }
};


// Open spell sheet on double-click
const openSpellSheet = (spellData: any) => {
  console.log('[CharacterSheet] Opening spell sheet for:', spellData.name);
  
  // Use PluginContext to open the spell sheet
  pluginContext.openDocumentSheet(spellData.spell, 'spell');
};

// Load item image URLs dynamically from imageId (for game state items)
const loadItemImageUrls = async () => {
  const currentItems = props.items?.value || [];
  for (const item of currentItems) {
    if (item.imageId && !itemImageUrls.value[item.imageId]) {
      try {
        const url = await pluginContext.getAssetUrl(item.imageId);
        itemImageUrls.value[item.imageId] = url;
        console.log(`[CharacterSheet] Loaded image URL for item ${item.name} (${item.imageId}):`, url);
      } catch (error) {
        console.error(`[CharacterSheet] Failed to load image for item ${item.id}:`, error);
      }
    }
  }
};

// Spell drag and drop handlers
const handleSpellDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  spellDragCounter.value++;
  if (spellDragCounter.value === 1) {
    isSpellDragOver.value = true;
  }
};

const handleSpellDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

const handleSpellDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  spellDragCounter.value--;
  if (spellDragCounter.value === 0) {
    isSpellDragOver.value = false;
  }
};

const handleSpellDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Reset drag state
  isSpellDragOver.value = false;
  spellDragCounter.value = 0;
  
  if (!event.dataTransfer) {
    console.warn('[CharacterSheet] No drag data available');
    return;
  }
  
  if (!character.value) {
    console.warn('[CharacterSheet] No character available for spell assignment');
    return;
  }
  
  try {
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.warn('[CharacterSheet] No drag data found');
      return;
    }
    
    const dragData = JSON.parse(dragDataStr);
    console.log('[CharacterSheet] Processing spell drop data:', dragData);
    
    // Validate drag data format for spells
    if (dragData.type !== 'document-token' || dragData.documentType !== 'vtt-document' || dragData.pluginDocumentType !== 'spell') {
      console.warn('[CharacterSheet] Invalid spell drag data:', dragData);
      return;
    }
    
    if (!pluginContext) {
      console.error('[CharacterSheet] Plugin context not available for spell assignment');
      return;
    }
    
    // Fetch the spell document to get spell level
    let spellDocument;
    try {
      spellDocument = await pluginContext.getDocument(dragData.documentId);
      console.log('[CharacterSheet] Fetched spell document:', spellDocument);
    } catch (error) {
      console.error('[CharacterSheet] Failed to fetch spell document:', error);
      return;
    }
    
    // Extract spell level from the document
    const spellLevel = (spellDocument.pluginData as any)?.level || 0;
    
    // Create spell assignment action parameters
    const actionParams = {
      spellId: dragData.documentId,
      targetCharacterId: character.value.id,
      spellName: dragData.name || spellDocument.name || 'Unknown Spell',
      targetCharacterName: character.value.name || 'Unknown Character',
      spellLevel
    };
    
    console.log('[CharacterSheet] Requesting spell assignment:', actionParams);
    
    // Request the spell assignment action through the plugin context
    const result = await pluginContext.requestAction(
      'dnd5e-2024:assign-spell',
      actionParams.targetCharacterId, // actorId - the character receiving the spell
      actionParams,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Assign ${actionParams.spellName} to ${actionParams.targetCharacterName}`
      }
    );
    
    if (result.success) {
      console.log('[CharacterSheet] Spell assignment request submitted successfully:', result);
    } else {
      console.error('[CharacterSheet] Spell assignment request failed:', result.error);
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Error processing spell drop:', error);
  }
};

// Condition drag and drop handlers
const handleConditionDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  conditionDragCounter.value++;
  if (conditionDragCounter.value === 1) {
    isConditionDragOver.value = true;
  }
};

const handleConditionDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

const handleConditionDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  conditionDragCounter.value--;
  if (conditionDragCounter.value === 0) {
    isConditionDragOver.value = false;
  }
};

const handleConditionDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Reset drag state
  isConditionDragOver.value = false;
  conditionDragCounter.value = 0;
  
  if (!event.dataTransfer) {
    console.warn('[CharacterSheet] No drag data available');
    return;
  }
  
  if (!character.value) {
    console.warn('[CharacterSheet] No character available for condition assignment');
    return;
  }
  
  try {
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.warn('[CharacterSheet] No drag data found');
      return;
    }
    
    const dragData = JSON.parse(dragDataStr);
    console.log('[CharacterSheet] Processing condition drop data:', dragData);
    
    // Validate drag data format for conditions
    if (dragData.type !== 'document-token' || dragData.documentType !== 'vtt-document' || dragData.pluginDocumentType !== 'condition') {
      console.warn('[CharacterSheet] Invalid condition drag data:', dragData);
      return;
    }
    
    if (!pluginContext) {
      console.error('[CharacterSheet] Plugin context not available for condition assignment');
      return;
    }
    
    // Prepare condition assignment parameters
    const actionParams = {
      conditionId: dragData.documentId,
      targetId: character.value.id, // Use targetId instead of targetCharacterId to match handler expectations
      source: 'Manual Assignment',
      level: 1 // Default level for manually assigned conditions
    };
    
    console.log('[CharacterSheet] Requesting condition assignment:', actionParams);
    
    // Request the condition assignment action through the plugin context
    const result = await pluginContext.requestAction(
      'dnd5e-2024:add-condition',
      actionParams.targetId, // actorId - the character receiving the condition
      actionParams,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Add condition ${dragData.name || 'Unknown Condition'} to ${character.value.name || 'Unknown Character'}`
      }
    );
    
    if (result.success) {
      console.log('[CharacterSheet] Condition assignment request submitted successfully:', result);
    } else {
      console.error('[CharacterSheet] Condition assignment request failed:', result.error);
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Error processing condition drop:', error);
  }
};

// Condition helper methods
const conditionImageUrls = ref<Record<string, string>>({});
const conditionNames = ref<Record<string, string>>({});

// Get condition image URL
const getConditionImageUrl = (conditionId: string): string | undefined => {
  return conditionImageUrls.value[conditionId];
};

// Get condition name
const getConditionName = (conditionId: string): string => {
  return conditionNames.value[conditionId] || 'Unknown Condition';
};

// Remove condition action
const removeCondition = async (conditionId: string) => {

  try {
    await pluginContext.requestAction(
      'dnd5e-2024:remove-condition',
      character.value.id, // actorId - the character losing the condition
      { 
        conditionId,
        targetId: character.value.id
      },
      undefined, // actorTokenId
      undefined, // targetTokenIds
      { description: `Remove condition: ${getConditionName(conditionId)}` }
    );
  } catch (error) {
    console.error('Failed to remove condition:', error);
    pluginContext.showNotification('Failed to remove condition: Unable to remove condition at this time', 'error', 4000);
  }
};

/**
 * Handle drag enter event - increment counter for nested elements
 */
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  dragCounter.value++;
  if (dragCounter.value === 1) {
    isDragOver.value = true;
  }
};

/**
 * Handle drag over event - necessary to allow drop
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Set drop effect to indicate items can be assigned
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

/**
 * Handle drag leave event - decrement counter for nested elements  
 */
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  dragCounter.value--;
  if (dragCounter.value === 0) {
    isDragOver.value = false;
  }
};

/**
 * Handle drop event - process item assignment
 */
const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Reset drag state
  isDragOver.value = false;
  dragCounter.value = 0;
  
  if (!event.dataTransfer) {
    console.warn('[CharacterSheet] No drag data available');
    return;
  }
  
  if (!character.value!) {
    console.warn('[CharacterSheet] No character available for item assignment');
    return;
  }
  
  try {
    // Parse drag data
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.warn('[CharacterSheet] No drag data found');
      return;
    }
    
    const dragData = JSON.parse(dragDataStr);
    console.log('[CharacterSheet] Processing drop data:', dragData);
    
    // Validate drag data format
    if (dragData.type !== 'document-token' || dragData.documentType !== 'item') {
      console.warn('[CharacterSheet] Invalid drag data type:', dragData.type, dragData.documentType);
      return;
    }
    
    // Prepare action parameters
    const actionParams: AssignItemParameters = {
      itemId: dragData.documentId,
      targetCharacterId: character.value!.id,
      itemName: dragData.name || 'Unknown Item',
      targetCharacterName: character.value!.name || 'Unknown Character'
    };
    
    console.log('[CharacterSheet] Requesting item assignment:', actionParams);
    
    // Check if plugin context is available
    if (!pluginContext) {
      console.error('[CharacterSheet] Plugin context not available for action request');
      return;
    }
    
    // Request the action through the plugin context
    const result = await pluginContext.requestAction(
      'assign-item',
      actionParams.targetCharacterId, // actorId - the character receiving the item
      actionParams,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Assign ${actionParams.itemName} to ${actionParams.targetCharacterName}`
      }
    );
    
    console.log('[CharacterSheet] Action request result:', result);
    
    // Handle result with console feedback
    if (result.success && result.approved) {
      console.log(`[CharacterSheet] SUCCESS: ${actionParams.itemName} has been assigned to ${actionParams.targetCharacterName}`);
    } else if (result.success && !result.approved) {
      console.warn(`[CharacterSheet] DENIED: Assignment denied - ${result.error || 'No reason provided'}`);
    } else {
      console.error(`[CharacterSheet] ERROR: Assignment failed - ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Failed to process drop:', error);
  }
};

// Load condition data for display - fetching actual condition documents
const loadConditions = async () => {
  try {
    console.log('[CharacterSheet] Loading condition documents from document collection');
    
    // Try to load condition documents from the document collection
    try {
      const conditions = await pluginContext.searchDocuments({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'condition',
        limit: 50 // Add reasonable limit
      });
      
      console.log(`[CharacterSheet] Loaded ${conditions.length} condition documents:`, conditions);
      
      // Populate condition names and image URLs from actual documents
      for (const condition of conditions) {
        conditionNames.value[condition.id] = condition.name || 'Unknown Condition';
        
        // Load image URL if the condition has an imageId
        if (condition.imageId) {
          try {
            const imageUrl = await pluginContext.getAssetUrl(condition.imageId);
            conditionImageUrls.value[condition.id] = imageUrl;
          } catch (error) {
            console.warn(`[CharacterSheet] Failed to load image for condition ${condition.name}:`, error);
          }
        }
      }
      
      console.log('[CharacterSheet] Condition names loaded:', conditionNames.value);
      console.log('[CharacterSheet] Condition images loaded:', conditionImageUrls.value);
      
    } catch (error) {
      console.error('[CharacterSheet] Failed to load condition documents:', error);
      
      // Fallback to hard-coded names if loading fails
      conditionNames.value = {
        'blinded': 'Blinded',
        'charmed': 'Charmed', 
        'deafened': 'Deafened',
        'exhaustion': 'Exhaustion',
        'frightened': 'Frightened',
        'grappled': 'Grappled',
        'incapacitated': 'Incapacitated',
        'invisible': 'Invisible',
        'paralyzed': 'Paralyzed',
        'petrified': 'Petrified',
        'poisoned': 'Poisoned',
        'prone': 'Prone',
        'restrained': 'Restrained',
        'stunned': 'Stunned',
        'unconscious': 'Unconscious'
      };
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Error in loadConditions:', error);
  }
};

// No longer using inline style injection - styles now imported from shared stylesheet

onMounted(async () => {
  document.addEventListener('keydown', handleKeyDown);
  console.log('D&D 5e Character Sheet mounted for character:', character.value!?.name || 'unknown');
  
  // Load compendium documents
  loadCompendiumDocuments();
  
  // Load available options for character editing
  await loadAvailableOptions();
  
  // Load condition data for display
  await loadConditions();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// Watch for character changes and reload compendium data
watch(() => {
  const classes = character.value!?.pluginData?.classes as any[];
  return [
    character.value!?.pluginData?.species,
    classes?.[0]?.class,
    character.value!?.pluginData?.background
  ];
}, () => {
  loadCompendiumDocuments();
}, { deep: true });

// Watch for items changes and load image URLs
watch(() => props.items?.value, () => {
  loadItemImageUrls();
}, { deep: true, immediate: true });

// Document copy is managed by container - no local watch needed
</script>

<style>
@import '../../styles/dnd-theme.css';
</style>

<style scoped>
/* Character Sheet Specific Styles */

/* Tab Navigation */
.tab-nav {
  background: var(--dnd-parchment-dark);
  border-bottom: 2px solid var(--dnd-brown-light);
  display: flex;
  padding: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tab-nav::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 1;
  min-width: 54px;
  max-width: 64px;
  background: transparent;
  border: none;
  padding: 6px 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  color: var(--dnd-gray);
  border-bottom: 3px solid transparent;
  font-size: 9px;
}

.tab-btn:hover {
  background: var(--dnd-parchment);
  color: var(--dnd-red);
}

.tab-btn.active {
  background: var(--dnd-parchment);
  color: var(--dnd-red);
  border-bottom-color: var(--dnd-red);
}

.tab-icon {
  font-size: 14px;
  line-height: 1;
}

.tab-name {
  font-weight: 500;
  line-height: 1;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--dnd-brown-light) var(--dnd-parchment);
}

.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: var(--dnd-parchment);
}

.tab-content::-webkit-scrollbar-thumb {
  background: var(--dnd-brown-light);
  border-radius: 3px;
}

.tab-pane {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Overview Tab */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
  transition: all 0.2s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--dnd-shadow);
  border-color: var(--dnd-red);
}

.stat-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  text-align: center;
}

.stat-input:focus {
  outline: none;
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.hit-points-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-current, .hp-max {
  width: 60px;
  padding: 4px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  text-align: center;
}

.speed-edit {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-input {
  width: 60px;
}

.speed-unit {
  color: var(--dnd-gray);
  font-size: 12px;
}

.inspiration-section {
  text-align: center;
  margin-top: 8px;
}

.inspiration-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dnd-gold);
  color: var(--dnd-red-dark);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
}

/* Abilities Tab - Character Sheet Specific Layout */
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.ability-score-input {
  width: 100%;
  text-align: center;
  padding: 2px 4px;
  border: 2px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  font-family: 'Cinzel', serif;
}

.ability-score-input:focus {
  outline: none;
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.non-clickable {
  cursor: default !important;
}

.saving-throws h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

.saves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.save-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-gray-light);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.save-item:hover {
  border-color: var(--dnd-red);
  background: var(--dnd-parchment);
}

.save-prof {
  font-size: 12px;
  color: var(--dnd-gray);
}

.save-prof.proficient {
  color: var(--dnd-red);
}

.save-name {
  flex: 1;
  font-weight: 500;
}

.save-bonus {
  font-weight: bold;
  color: var(--dnd-red);
}

/* Skills Tab */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-gray-light);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.skill-item:hover {
  border-color: var(--dnd-red);
  background: var(--dnd-parchment);
}

.skill-prof {
  font-size: 12px;
  color: var(--dnd-gray);
  width: 12px;
  text-align: center;
}

.skill-prof.proficient {
  color: var(--dnd-red);
}

.skill-prof.expert {
  color: var(--dnd-gold-dark);
}

.skill-item.editable .skill-prof {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.skill-item.editable:hover .skill-prof {
  transform: scale(1.2);
  cursor: pointer;
}

.skill-name {
  flex: 1;
  font-weight: 500;
  text-transform: capitalize;
}

.skill-ability {
  font-size: 10px;
  color: var(--dnd-gray);
  text-transform: uppercase;
}

.skill-bonus {
  font-weight: bold;
  color: var(--dnd-red);
  min-width: 24px;
  text-align: right;
}

/* Notes Tab */
.notes-section h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

.notes-editor {
  margin-bottom: 16px;
}

.notes-textarea {
  width: 100%;
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  padding: 8px;
  font-size: 11px;
  font-family: inherit;
  color: var(--dnd-black);
  line-height: 1.4;
  resize: vertical;
  min-height: 120px;
}

.notes-textarea:focus {
  outline: 2px solid var(--dnd-red);
  outline-offset: -2px;
  border-color: var(--dnd-red);
}

.notes-textarea:read-only {
  background: var(--dnd-parchment);
  cursor: default;
}

/* Empty States */
.empty-state {
  text-align: center;
  color: var(--dnd-gray);
  font-style: italic;
  padding: 16px;
  font-size: 12px;
}

/* Character Sheet Specific Overrides */
.character-name-input {
  background: transparent;
  border: none;
  color: var(--dnd-white);
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 1px 1px 2px var(--dnd-shadow);
  outline: none;
  width: 100%;
}

.character-name-input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 4px;
}

/* Responsive Adjustments */
@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .abilities-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .tab-pane {
    animation: none;
  }
  
  .stat-card:hover,
  .ability-card:hover {
    transform: none;
  }
}

/* Avatar Styles */
.token-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.letter-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--dnd-red-dark);
}

/* Equipment Section Styles */
.equipment-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.equipment-section.drag-over {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.equipment-section.drag-over::before {
  content: "Drop item here to assign to character";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  z-index: 10;
  pointer-events: none;
}

.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--dnd-brown-light);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--dnd-red-dark);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.item-count {
  font-size: 14px;
  color: var(--dnd-brown-dark);
  background: var(--dnd-parchment-dark);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--dnd-brown-light);
}

/* Compact Equipment Groups */
.equipment-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.item-group {
  background: var(--dnd-parchment);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--dnd-parchment-dark);
  border-bottom: 1px solid var(--dnd-brown-light);
}

.group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dnd-red-dark);
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-count {
  font-size: 12px;
  color: var(--dnd-brown-dark);
  background: var(--dnd-background);
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid var(--dnd-brown-light);
}

.item-list {
  display: flex;
  flex-direction: column;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(139, 87, 42, 0.1);
  transition: background-color 0.2s ease;
}

.item-row:last-child {
  border-bottom: none;
}

.item-row:hover {
  background: rgba(139, 87, 42, 0.05);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.item-image {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--dnd-brown-light);
}

.item-emoji {
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--dnd-red-dark);
  line-height: 1.2;
  margin: 0;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.compact-action-btn {
  width: 28px;
  height: 28px;
  background: var(--dnd-red);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.compact-action-btn:hover {
  background: var(--dnd-red-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(139, 87, 42, 0.3);
}

.compact-action-btn:active {
  transform: translateY(0);
}


.compact-action-btn:focus {
  outline: 2px solid var(--dnd-yellow);
  outline-offset: 1px;
}

.equipment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: var(--dnd-brown-dark);
  flex: 1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--dnd-red-dark);
}

.empty-description {
  font-size: 14px;
  line-height: 1.5;
  max-width: 300px;
}

/* Responsive Design */
@media (max-width: 600px) {
  .equipment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .item-row {
    padding: 8px 10px;
    gap: 8px;
  }
  
  .group-header {
    padding: 6px 10px;
  }
  
  .compact-action-btn {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
}

/* Focus Styles for Accessibility */
.tab-btn:focus,
.stat-card:focus,
.ability-card:focus,
.save-item:focus,
.skill-item:focus,
.item-row:focus {
  outline: 2px solid var(--dnd-red);
  outline-offset: 2px;
}

/* Automation Settings */
.stat-card.automation-setting {
  cursor: default;
}

.stat-card.automation-setting:hover {
  transform: none;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
  border-color: var(--dnd-brown-light);
}

.automation-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--dnd-red);
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--dnd-red);
  cursor: pointer;
}

.checkbox-label {
  user-select: none;
  font-weight: 500;
}

/* Spells Section Styles */
.spells-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.spells-section.drag-over {
  background: rgba(138, 43, 226, 0.1);
  border: 2px dashed rgba(138, 43, 226, 0.5);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
}

.spells-section.drag-over::before {
  content: "Drop spell here to assign to character";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(138, 43, 226, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  z-index: 10;
  pointer-events: none;
}

.spells-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--dnd-brown-light);
}

.spell-count {
  font-size: 14px;
  color: var(--dnd-brown-dark);
  background: var(--dnd-parchment-dark);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--dnd-brown-light);
}

/* Spell Slots */
.spell-slots-section {
  background: var(--dnd-parchment);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 16px;
}

.spell-slots-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dnd-red-dark);
}

.spell-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.spell-slot-level {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
}

.slot-level-label {
  font-size: 11px;
  color: var(--dnd-brown-dark);
  margin-bottom: 4px;
  font-weight: 600;
}

.slot-counter {
  font-size: 14px;
  font-weight: bold;
  color: var(--dnd-red-dark);
}

.slots-used {
  color: var(--dnd-red);
}

.slots-separator {
  color: var(--dnd-brown-dark);
  margin: 0 2px;
}

.slots-total {
  color: var(--dnd-brown-dark);
}

/* Spells List */
.spells-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1;
}

.spell-level-group {
  background: var(--dnd-parchment);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 16px;
}

.spell-level-header {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dnd-red-dark);
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--dnd-brown-light);
}

.spell-level-count {
  font-size: 12px;
  color: var(--dnd-brown-dark);
  font-weight: normal;
}

.spell-level-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spell-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(139, 87, 42, 0.1);
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
}

.spell-item:hover {
  box-shadow: 0 4px 8px rgba(139, 87, 42, 0.15);
}

.spell-item.prepared {
  border-left: 4px solid var(--dnd-green);
}

.spell-item.always-prepared {
  border-left: 4px solid var(--dnd-blue);
}

.spell-item.cantrip {
  border-left: 4px solid var(--dnd-purple);
}

.spell-main {
  margin-bottom: 12px;
}

.spell-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.spell-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dnd-red-dark);
  line-height: 1.3;
}

.spell-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.spell-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.spell-badge.prepared {
  background: var(--dnd-green);
  color: white;
}

.spell-badge.always-prepared {
  background: var(--dnd-blue);
  color: white;
}

.spell-badge.unprepared {
  background: var(--dnd-gray);
  color: white;
}

.spell-badge.class-badge {
  background: var(--dnd-brown-light);
  color: var(--dnd-brown-dark);
}

.spell-prepared-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.prepared-checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--dnd-black);
  cursor: pointer;
  user-select: none;
}

.prepared-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.cantrip-label {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--dnd-purple);
  color: white;
}

.spell-description {
  font-size: 13px;
  color: var(--dnd-black);
  line-height: 1.4;
}

.spell-properties {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.spell-property {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

.spell-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.spell-action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.spell-action-btn.cast-btn {
  background: linear-gradient(135deg, var(--dnd-purple), var(--dnd-blue));
  color: white;
}

.spell-action-btn.cast-btn:hover {
  background: linear-gradient(135deg, var(--dnd-purple-dark), var(--dnd-blue-dark));
  transform: translateY(-1px);
}

.empty-hint {
  font-size: 12px;
  color: var(--dnd-brown-dark);
  margin-top: 8px;
}

/* Settings Tab Styles */
.settings-section {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.settings-section h3 {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  color: var(--dnd-red);
  margin: 0 0 20px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 8px;
}

.settings-group {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(139, 87, 42, 0.1);
}

.settings-group h4 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-brown-dark);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.setting-item {
  padding: 12px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  background: rgba(139, 87, 42, 0.05);
}

.setting-label {
  font-weight: 600;
  color: var(--dnd-brown-dark);
  margin-bottom: 4px;
}

.setting-description {
  font-size: 12px;
  color: var(--dnd-brown);
  margin-bottom: 8px;
  line-height: 1.4;
}

.setting-value {
  font-size: 14px;
  color: var(--dnd-black);
  font-weight: 600;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.setting-toggle .checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-toggle .checkbox-label {
  font-size: 14px;
  color: var(--dnd-black);
}

/* Conditions Tab */
.conditions-tab {
  padding: 16px;
}

.conditions-container {
  max-width: 100%;
}

.conditions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--dnd-brown-light);
}

.conditions-header h3 {
  margin: 0;
  color: var(--dnd-black);
  font-size: 18px;
  font-weight: 600;
}

.condition-count {
  background: var(--dnd-brown-light);
  color: var(--dnd-white);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--dnd-parchment-light);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.condition-card:hover {
  background: var(--dnd-parchment);
  border-color: var(--dnd-brown);
  box-shadow: 0 2px 4px rgba(101, 67, 33, 0.1);
}

.condition-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dnd-brown-light);
  border-radius: 50%;
}

.condition-image {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 50%;
}

.condition-emoji {
  font-size: 16px;
  color: var(--dnd-white);
}

.condition-info {
  flex: 1;
  min-width: 0;
}

.condition-name {
  font-weight: 600;
  color: var(--dnd-black);
  font-size: 14px;
  margin-bottom: 2px;
}

.condition-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--dnd-brown);
}

.condition-level {
  font-weight: 500;
}

.condition-source {
  font-style: italic;
}

.remove-condition-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--dnd-brown);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-condition-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.remove-condition-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-conditions {
  text-align: center;
  padding: 32px 16px;
  color: var(--dnd-brown);
}

.no-conditions p {
  margin: 0 0 8px 0;
}

.no-conditions-hint {
  font-size: 12px;
  font-style: italic;
  opacity: 0.7;
}

/* Condition drag and drop styling */
.conditions-container {
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.conditions-container.drag-over {
  background: rgba(34, 197, 94, 0.1);
  border: 2px dashed rgba(34, 197, 94, 0.5);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.conditions-container.drag-over::before {
  content: "Drop condition here to add to character";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(34, 197, 94, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}

/* Character Basics Section */
.character-basics-section {
  padding: 16px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  margin-bottom: 16px;
  background: var(--dnd-parchment-light);
}

.basic-field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-weight: 600;
  color: var(--dnd-black);
  font-size: 14px;
}

.field-display {
  padding: 8px 12px;
  background: var(--dnd-parchment);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  color: var(--dnd-black);
}

.field-select {
  padding: 8px 12px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: white;
  color: var(--dnd-black);
  font-size: 14px;
}

.field-select:focus {
  outline: none;
  border-color: var(--dnd-brown);
  box-shadow: 0 0 0 2px rgba(139, 87, 42, 0.1);
}

.background-details-section {
  padding: 16px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  background: var(--dnd-parchment-light);
}

.background-description {
  margin-bottom: 16px;
  line-height: 1.6;
}

.background-features {
  margin-top: 16px;
}

.feature-item {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--dnd-parchment);
  border-radius: 4px;
  border: 1px solid var(--dnd-brown-light);
}
</style>
