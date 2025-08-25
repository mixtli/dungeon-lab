<template>
  <div class="roll-result-message" :class="resultClass">
    <div class="result-header">
      <span class="result-icon">{{ resultIcon }}</span>
      <div class="result-content">
        <span class="result-text">{{ message }}</span>
        <div class="result-details">
          <span class="roll-value">{{ result }}</span>
          <span v-if="target" class="vs-text">{{ vsText }}</span>
          <span v-if="target" class="target-value">{{ target }}</span>
          <span class="result-status" :class="statusClass">{{ statusText }}</span>
        </div>
        <div v-if="damageInfo" class="damage-info">
          <span class="damage-amount">{{ damageInfo.amount }}</span>
          <span class="damage-type">{{ damageInfo.type }}</span>
          <span class="damage-text">damage</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface DamageInfo {
  amount: number;
  type: string;
}

interface Props {
  message: string;
  result: number;
  target?: number;
  success: boolean;
  rollType: string;
  damageInfo?: DamageInfo;
}

const props = defineProps<Props>();

// Dynamic styling based on success/failure
const resultClass = computed(() => ({
  'success': props.success,
  'failure': !props.success
}));

const statusClass = computed(() => ({
  'status-success': props.success,
  'status-failure': !props.success
}));

// Icons based on roll type
const resultIcon = computed(() => {
  switch (props.rollType) {
    case 'spell-attack':
    case 'weapon-attack':
      return '⚔️';
    case 'saving-throw':
      return '🛡️';
    case 'ability-check':
      return '🎯';
    case 'spell-damage':
    case 'weapon-damage':
      return '💥';
    default:
      return '🎲';
  }
});

// Terminology based on roll type
const vsText = computed(() => {
  switch (props.rollType) {
    case 'spell-attack':
    case 'weapon-attack':
      return 'vs AC';
    case 'saving-throw':
      return 'vs DC';
    case 'ability-check':
      return 'vs';
    default:
      return 'vs';
  }
});

// Status text based on roll type and success
const statusText = computed(() => {
  if (props.rollType === 'saving-throw') {
    return props.success ? 'SAVED' : 'FAILED';
  } else {
    return props.success ? 'HIT' : 'MISS';
  }
});
</script>

<style scoped>
.roll-result-message {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #6c757d;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
  transition: all 0.3s ease;
}

.roll-result-message.success {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-color: #28a745;
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.2);
}

.roll-result-message.failure {
  background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%);
  border-color: #dc3545;
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.2);
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.result-icon {
  font-size: 24px;
  background: #6c757d;
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success .result-icon {
  background: #28a745;
}

.failure .result-icon {
  background: #dc3545;
}

.result-content {
  flex: 1;
}

.result-text {
  font-weight: 600;
  color: #212529;
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.result-details {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.roll-value {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(108, 117, 125, 0.3);
  font-size: 18px;
}

.vs-text {
  color: #6c757d;
  font-weight: 500;
}

.target-value {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.result-status {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-success {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}

.status-failure {
  background: linear-gradient(135deg, #dc3545, #e74c3c);
  color: white;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
}

.damage-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
}

.damage-amount {
  background: linear-gradient(135deg, #ffc107, #e0a800);
  color: #212529;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);
}

.damage-type {
  color: #e8590c;
  font-weight: 600;
  text-transform: capitalize;
}

.damage-text {
  color: #6c757d;
  font-weight: 500;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .result-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .result-details > * {
    margin-bottom: 2px;
  }
}
</style>