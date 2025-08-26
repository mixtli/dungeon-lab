<template>
  <div class="weapon-attack-roll-request">
    <div class="request-header">
      <span class="request-icon">⚔️</span>
      <div class="request-content">
        <span class="request-text">{{ rollRequest?.message || 'Weapon Attack' }}</span>
        <div class="request-details">
          <code class="dice-expression">{{ diceExpression }}</code>
          <span class="weapon-info">{{ weaponInfo }}</span>
        </div>
      </div>
    </div>
    
    <div class="attack-configuration" v-if="!completed">
      <!-- Advantage/Disadvantage Selection -->
      <div class="advantage-controls">
        <label class="control-label">Attack Mode:</label>
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

      <!-- Custom Modifier -->
      <div class="modifier-control">
        <label for="customModifier" class="control-label">Custom Modifier:</label>
        <input
          id="customModifier"
          v-model.number="customModifier"
          type="number"
          class="modifier-input"
          :placeholder="defaultArgs.customModifier || '0'"
          :disabled="processing"
        />
      </div>

      <!-- Roll Visibility -->
      <div class="visibility-control">
        <label for="recipients" class="control-label">Roll Visibility:</label>
        <select
          id="recipients"
          v-model="recipients"
          class="visibility-select"
          :disabled="processing"
        >
          <option value="public">Public (everyone can see)</option>
          <option value="private">Private (only you can see)</option>
          <option value="gm">GM Only (only GM can see)</option>
        </select>
      </div>

      <!-- Attack Summary -->
      <div class="attack-summary">
        <div class="summary-line">
          <span class="summary-label">Total Bonus:</span>
          <span class="summary-value">{{ totalModifierDisplay }}</span>
        </div>
        <div class="summary-line">
          <span class="summary-label">Dice:</span>
          <span class="summary-value">{{ finalDiceExpression }}</span>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="request-actions" v-if="!completed">
      <button 
        @click="rollAttack" 
        :disabled="processing"
        class="roll-btn"
      >
        {{ processing ? 'Rolling...' : '🎲 Roll Attack' }}
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
      <span class="completed-text">Attack Rolled</span>
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

// Computed properties
const diceExpression = computed(() => {
  if (!props.rollRequest?.dice) {
    return 'Unknown dice';
  }
  
  try {
    return diceArrayToExpression(props.rollRequest.dice, 0);
  } catch (error) {
    console.error('[WeaponAttackRollRequest] Failed to convert dice array to expression:', error);
    return 'Invalid dice';
  }
});

const weaponInfo = computed(() => {
  const metadata = props.rollRequest.metadata;
  if (metadata?.weaponName && metadata?.characterName) {
    return `${metadata.characterName} attacks with ${metadata.weaponName}`;
  }
  return '';
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
function rollAttack(): void {
  if (!props.rollRequest) {
    console.error('[WeaponAttackRollRequest] No roll request data available');
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
          weaponName: defaultArgs.rollTitle
        }
      },
      modifiers: (props.rollRequest.metadata?.modifiers as any) || [],
      metadata: {
        title: String(defaultArgs.rollTitle || 'Weapon Attack'),
        description: `${advantageMode.value} attack roll`,
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
    
    console.log('[WeaponAttackRollRequest] Enhanced weapon attack roll data prepared:', rollId);
  } catch (error) {
    console.error('[WeaponAttackRollRequest] Failed to prepare roll:', error);
    processing.value = false;
  }
}

function declineRollRequest(): void {
  if (!props.rollRequest) {
    console.error('[WeaponAttackRollRequest] No roll request data available');
    return;
  }
  
  console.log('[WeaponAttackRollRequest] Declined weapon attack roll request:', props.rollRequest.rollId);
  
  // Emit decline event - parent component will handle cleanup
  emit('roll-declined');
}
</script>

<style scoped>
.weapon-attack-roll-request {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border: 2px solid #d32f2f;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 4px 8px rgba(211, 47, 47, 0.2);
}

.request-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.request-icon {
  font-size: 24px;
  background: #d32f2f;
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
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
  color: #4a1a4a;
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.request-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dice-expression {
  background: rgba(211, 47, 47, 0.1);
  color: #c62828;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(211, 47, 47, 0.3);
}

.weapon-info {
  color: #666;
  font-style: italic;
  font-size: 14px;
}

.attack-configuration {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
}

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
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #666;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  position: relative;
}

.advantage-btn:hover:not(:disabled) {
  border-color: #999;
  background: #f5f5f5;
}

.advantage-btn.active {
  border-color: #d32f2f;
  background: #d32f2f;
  color: white;
}

.advantage-btn.has-conditions {
  border-color: #ff9800;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3);
}

.advantage-btn.active.has-conditions {
  border-color: #d32f2f;
  background: #d32f2f;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.5);
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

.modifier-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modifier-input {
  width: 120px;
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 16px;
  text-align: center;
}

.modifier-input:focus {
  border-color: #d32f2f;
  outline: none;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
}

.visibility-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visibility-select {
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.visibility-select:focus {
  border-color: #d32f2f;
  outline: none;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
}

.attack-summary {
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.3);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-weight: 600;
  color: #333;
}

.summary-value {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #d32f2f;
  font-size: 16px;
}

.request-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.roll-btn, .decline-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.roll-btn {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.roll-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
}

.roll-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.decline-btn {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
}

.decline-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ef5350, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
}

.decline-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.completion-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  border-radius: 8px;
  margin-top: 8px;
}

.completed-icon {
  font-size: 20px;
  animation: bounceIn 0.5s ease;
}

.completed-text {
  color: #155724;
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

/* Mobile responsiveness */
@media (max-width: 640px) {
  .advantage-buttons {
    flex-direction: column;
  }
  
  .request-actions {
    flex-direction: column;
  }
  
  .roll-btn, .decline-btn {
    width: 100%;
  }
  
  .request-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .attack-configuration {
    padding: 12px;
  }
  
  .summary-line {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>