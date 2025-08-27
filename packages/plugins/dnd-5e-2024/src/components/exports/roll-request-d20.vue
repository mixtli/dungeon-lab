<template>
  <div class="d20-roll-request" :class="rollTypeClass">
    <div class="request-header">
      <span class="request-icon">{{ rollTypeIcon }}</span>
      <div class="request-content">
        <span class="request-text">{{ rollRequest?.message || rollTypeLabel }}</span>
      </div>
    </div>
    
    <!-- Roll Formula Display (centered like AdvantageRollDialog) -->
    <div class="roll-formula">
      <code class="dice-expression">{{ finalDiceExpression }}</code>
    </div>
    
    <div class="roll-configuration" v-if="!completed">
      <!-- Advantage/Disadvantage Selection -->
      <div class="advantage-controls">
        <div class="advantage-buttons">
          <button 
            @click="advantageMode = 'disadvantage'"
            :class="['advantage-btn', { active: advantageMode === 'disadvantage', 'has-conditions': hasDisadvantageConditions }]"
            :disabled="processing"
          >
            Disadvantage
            <span v-if="hasDisadvantageConditions" class="condition-hint">
              ({{ defaultArgs.conditionReasons?.disadvantage?.join(', ') }})
            </span>
          </button>
          
          <button 
            @click="advantageMode = 'normal'"
            :class="['advantage-btn', { active: advantageMode === 'normal' }]"
            :disabled="processing"
          >
            Normal
          </button>
          
          <button 
            @click="advantageMode = 'advantage'"
            :class="['advantage-btn', { active: advantageMode === 'advantage', 'has-conditions': hasAdvantageConditions }]"
            :disabled="processing"
          >
            Advantage
            <span v-if="hasAdvantageConditions" class="condition-hint">
              ({{ defaultArgs.conditionReasons?.advantage?.join(', ') }})
            </span>
          </button>
        </div>
      </div>

      <!-- Custom Modifier and Roll Visibility in grid layout -->
      <div class="input-grid">
        <div class="modifier-control">
          <label for="customModifier" class="control-label">Custom Modifier</label>
          <input
            id="customModifier"
            v-model.number="customModifier"
            type="number"
            class="modifier-input"
            :placeholder="defaultArgs.customModifier || '0'"
            :disabled="processing"
          />
        </div>
        
        <div class="visibility-control">
          <label for="recipients" class="control-label">Roll Visibility</label>
          <select
            id="recipients"
            v-model="recipients"
            class="visibility-select"
            :disabled="processing"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="gm">GM Only</option>
          </select>
        </div>
      </div>

    </div>
    
    <!-- Action Buttons -->
    <div class="request-actions" v-if="!completed">
      <button 
        @click="rollD20" 
        :disabled="processing"
        class="roll-btn"
      >
        {{ processing ? 'Rolling...' : rollButtonText }}
      </button>
      
      <button 
        @click="declineRollRequest" 
        :disabled="processing"
        class="decline-btn"
      >
        Cancel
      </button>
    </div>
    
    <!-- Completion Status -->
    <div class="completion-status" v-if="completed">
      <span class="completed-icon">✅</span>
      <span class="completed-text">{{ rollTypeLabel }} Rolled</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { RollRequest } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { diceArrayToExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';

interface Props {
  rollRequest: RollRequest;
}

interface RollAcceptedData {
  advantageMode: 'advantage' | 'normal' | 'disadvantage';
  customModifier: number;
  recipients: 'public' | 'private' | 'gm';
  rollData: any;
}

interface Emits {
  'roll-accepted': [rollData: RollAcceptedData];
  'roll-declined': [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const processing = ref(false);
const completed = ref(false);

// Extract default arguments from metadata
const defaultArgs = (props.rollRequest.metadata?.defaultArgs as any) || {};

// Initialize reactive state with defaults
const advantageMode = ref<'advantage' | 'normal' | 'disadvantage'>(defaultArgs.advantageMode || 'normal');
const customModifier = ref(defaultArgs.customModifier || 0);
const recipients = ref<'public' | 'private' | 'gm'>(defaultArgs.recipients || 'public');

// Roll type detection
const rollType = computed(() => {
  // Detect roll type from rollType field or metadata
  const type = props.rollRequest.rollType || 'attack';
  
  if (type.includes('spell')) return 'spell-attack';
  if (type.includes('weapon')) return 'weapon-attack';
  if (type.includes('ability')) return 'ability-check';
  if (type.includes('saving') || type.includes('save')) return 'saving-throw';
  
  return 'attack'; // Default
});

// Dynamic UI properties based on roll type
const rollTypeIcon = computed(() => {
  switch (rollType.value) {
    case 'spell-attack': return '🔮';
    case 'weapon-attack': return '⚔️';
    case 'ability-check': return '🎲';
    case 'saving-throw': return '🛡️';
    default: return '🎯';
  }
});

const rollTypeLabel = computed(() => {
  switch (rollType.value) {
    case 'spell-attack': return 'Spell Attack';
    case 'weapon-attack': return 'Weapon Attack';
    case 'ability-check': return 'Ability Check';
    case 'saving-throw': return 'Saving Throw';
    default: return 'Attack Roll';
  }
});

const rollTypeClass = computed(() => {
  return `roll-type-${rollType.value}`;
});

const rollModeLabel = computed(() => {
  switch (rollType.value) {
    case 'spell-attack': 
    case 'weapon-attack': 
      return 'Attack Mode';
    case 'ability-check':
      return 'Check Mode';
    case 'saving-throw':
      return 'Save Mode';
    default: return 'Roll Mode';
  }
});

const rollButtonText = computed(() => {
  return `🎲 Roll ${rollTypeLabel.value}`;
});

// Computed properties
const diceExpression = computed(() => {
  if (!props.rollRequest?.dice) {
    return 'Unknown dice';
  }
  
  try {
    return diceArrayToExpression(props.rollRequest.dice, 0);
  } catch (error) {
    console.error('[D20RollRequest] Failed to convert dice array to expression:', error);
    return 'Invalid dice';
  }
});

const rollInfo = computed(() => {
  const metadata = props.rollRequest.metadata;
  const characterName = metadata?.characterName;
  
  if (!characterName) return '';
  
  // Handle different roll types
  if (rollType.value === 'spell-attack' && metadata?.spellName) {
    return `${characterName} casts ${metadata.spellName}`;
  } else if (rollType.value === 'weapon-attack' && metadata?.weaponName) {
    return `${characterName} attacks with ${metadata.weaponName}`;
  } else if (rollType.value === 'ability-check' && metadata?.ability) {
    const skill = metadata?.skill;
    if (skill && typeof skill === 'string') {
      const formattedSkill = skill.split('-').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return `${characterName} makes a ${formattedSkill} check`;
    } else if (typeof metadata.ability === 'string') {
      const formattedAbility = metadata.ability.charAt(0).toUpperCase() + metadata.ability.slice(1);
      return `${characterName} makes a ${formattedAbility} check`;
    }
  } else if (rollType.value === 'saving-throw' && metadata?.ability) {
    if (typeof metadata.ability === 'string') {
      const formattedAbility = metadata.ability.charAt(0).toUpperCase() + metadata.ability.slice(1);
      return `${characterName} makes a ${formattedAbility} saving throw`;
    }
  }
  
  return `${characterName} makes a ${rollTypeLabel.value.toLowerCase()}`;
});

const hasAdvantageConditions = computed(() => {
  return defaultArgs.conditionReasons?.advantage?.length > 0;
});

const hasDisadvantageConditions = computed(() => {
  return defaultArgs.conditionReasons?.disadvantage?.length > 0;
});

const totalModifierDisplay = computed(() => {
  const baseModifier = defaultArgs.baseModifier || 0;
  const total = baseModifier + customModifier.value;
  return total >= 0 ? `+${total}` : `${total}`;
});

const finalDiceExpression = computed(() => {
  const diceCount = advantageMode.value === 'normal' ? 1 : 2;
  const diceNotation = `${diceCount}d20`;
  const total = (defaultArgs.baseModifier || 0) + customModifier.value;
  
  if (total === 0) {
    return diceNotation;
  }
  
  return `${diceNotation}${total >= 0 ? '+' : ''}${total}`;
});

// Methods
function rollD20(): void {
  if (!props.rollRequest) {
    console.error('[D20RollRequest] No roll request data available');
    return;
  }
  
  processing.value = true;
  
  try {
    // Use the existing rollId from the roll request for proper correlation
    const rollId = props.rollRequest.rollId;
    
    // Determine dice quantity based on advantage mode
    const diceQuantity = advantageMode.value === 'normal' ? 1 : 2;
    
    // Create roll object using the new roll schema format
    const roll = {
      rollId: rollId,  // Use existing rollId for promise correlation
      rollType: props.rollRequest.rollType,
      pluginId: 'dnd-5e-2024',
      dice: [{ sides: 20, quantity: diceQuantity }], // Use advantage/disadvantage dice
      recipients: recipients.value,
      arguments: { 
        customModifier: customModifier.value,
        pluginArgs: {
          advantageMode: advantageMode.value,
          baseModifier: defaultArgs.baseModifier || 0,
          ability: defaultArgs.ability,
          weaponName: defaultArgs.weaponName,
          spellName: defaultArgs.spellName,
          rollTitle: defaultArgs.rollTitle
        }
      },
      modifiers: (props.rollRequest.metadata?.modifiers as any) || [],
      metadata: {
        title: String(defaultArgs.rollTitle || rollTypeLabel.value),
        description: `${advantageMode.value} ${rollTypeLabel.value.toLowerCase()}`,
        characterName: String(props.rollRequest.metadata?.characterName || ''),
        ...props.rollRequest.metadata,
        responseToRequestId: props.rollRequest.rollId,
        enhancedRoll: {
          advantageMode: advantageMode.value,
          customModifier: customModifier.value,
          recipients: recipients.value
        }
      }
    };
    
    // Emit roll accepted event - parent component will handle the actual submission
    emit('roll-accepted', {
      advantageMode: advantageMode.value,
      customModifier: customModifier.value,
      recipients: recipients.value,
      rollData: roll
    });
    
    console.log('[D20RollRequest] Enhanced d20 roll data prepared:', rollId);
  } catch (error) {
    console.error('[D20RollRequest] Failed to prepare roll:', error);
    processing.value = false;
  }
}

function declineRollRequest(): void {
  if (!props.rollRequest) {
    console.error('[D20RollRequest] No roll request data available');
    return;
  }
  
  console.log('[D20RollRequest] Declined d20 roll request:', props.rollRequest.rollId);
  
  // Emit decline event - parent component will handle cleanup
  emit('roll-declined');
}
</script>

<style scoped>
/* Dark theme inspired by AdvantageRollDialog */
.d20-roll-request {
  background: #374151; /* Dark gray background */
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  max-width: 28rem; /* Similar to AdvantageRollDialog max-width */
}

/* Header */
.request-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
}

.request-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.request-content {
  flex: 1;
}

.request-text {
  font-weight: 600;
  color: #10b981; /* Green title like AdvantageRollDialog */
  display: block;
  margin-bottom: 8px;
  font-size: 20px;
  text-align: center;
}

/* Roll formula display */
.roll-formula {
  text-align: center;
  margin-bottom: 16px;
}

.dice-expression {
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 18px;
  color: #e5e7eb;
  background: transparent;
  border: none;
}

/* Roll configuration with dark styling */
.roll-configuration {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.control-label {
  font-weight: 600;
  color: #e5e7eb;
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
}

/* Advantage buttons with dark theme */
.advantage-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advantage-buttons {
  display: flex;
  gap: 8px;
}

.advantage-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: #4b5563;
  color: #d1d5db;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  position: relative;
}

.advantage-btn:hover:not(:disabled) {
  background: #6b7280;
}

.advantage-btn.active {
  background: #2563eb; /* Blue for active state like AdvantageRollDialog */
  color: white;
}

.advantage-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.condition-hint {
  display: block;
  font-size: 12px;
  font-weight: normal;
  opacity: 0.9;
  margin-top: 4px;
}

/* Input grid layout (like AdvantageRollDialog) */
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modifier-control, .visibility-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modifier-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #6b7280;
  border-radius: 6px;
  background: #4b5563;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 16px;
  text-align: center;
}

.modifier-input:focus {
  border-color: #10b981;
  outline: none;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.visibility-select {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #6b7280;
  border-radius: 6px;
  background: #4b5563;
  color: #e5e7eb;
  font-size: 14px;
  cursor: pointer;
}

.visibility-select:focus {
  border-color: #10b981;
  outline: none;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}


/* Action buttons */
.request-actions {
  display: flex;
  gap: 12px;
}

.roll-btn, .decline-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.roll-btn {
  background: #10b981;
  color: white;
}

.roll-btn:hover:not(:disabled) {
  background: #059669;
}

.roll-btn:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.decline-btn {
  background: #6b7280;
  color: #e5e7eb;
}

.decline-btn:hover:not(:disabled) {
  background: #4b5563;
}

.decline-btn:disabled {
  background: #4b5563;
  cursor: not-allowed;
}

/* Completion status */
.completion-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  margin-top: 8px;
}

.completed-icon {
  font-size: 20px;
  animation: bounceIn 0.5s ease;
}

.completed-text {
  color: #10b981;
  font-weight: 600;
  font-size: 16px;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animation for modal appearance */
.d20-roll-request {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .advantage-buttons {
    flex-direction: column;
  }
  
  .input-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .request-actions {
    flex-direction: column;
  }
  
  .roll-btn, .decline-btn {
    width: 100%;
  }
  
  .roll-configuration {
    gap: 12px;
  }
}
</style>