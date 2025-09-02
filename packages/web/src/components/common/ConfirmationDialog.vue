<template>
  <div v-if="show" class="confirmation-dialog-overlay" @click="handleOverlayClick">
    <div class="confirmation-dialog" @click.stop>
      <div class="dialog-header">
        <h3 class="dialog-title">{{ title }}</h3>
        <button class="dialog-close" @click="$emit('cancel')" title="Close">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      
      <div class="dialog-content">
        <p class="dialog-message">{{ message }}</p>
        
        <div v-if="showDatabaseOption" class="dialog-option">
          <label class="checkbox-container">
            <input 
              v-model="deleteFromDatabase" 
              type="checkbox" 
              class="checkbox-input"
            />
            <span class="checkbox-checkmark"></span>
            <span class="checkbox-label">Also delete from database permanently</span>
          </label>
          <p class="option-description">
            This will permanently remove the document from the database. Other campaigns using this document will no longer have access to it.
          </p>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button class="dialog-button dialog-button-cancel" @click="$emit('cancel')">
          {{ cancelText }}
        </button>
        <button 
          class="dialog-button dialog-button-confirm" 
          :class="`dialog-button-${variant}`"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  showDatabaseOption?: boolean;
}

interface Emits {
  (e: 'confirm', deleteFromDatabase: boolean): void;
  (e: 'cancel'): void;
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel', 
  variant: 'danger',
  showDatabaseOption: false
});

const emit = defineEmits<Emits>();

const deleteFromDatabase = ref(false);

function handleOverlayClick(): void {
  emit('cancel');
}

function handleConfirm(): void {
  emit('confirm', deleteFromDatabase.value);
  deleteFromDatabase.value = false; // Reset for next use
}
</script>

<style scoped>
.confirmation-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.confirmation-dialog {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.dialog-close {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dialog-content {
  padding: 24px;
}

.dialog-message {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin: 0 0 20px 0;
  font-size: 16px;
}

.dialog-option {
  margin-top: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  margin-bottom: 8px;
}

.checkbox-input {
  display: none;
}

.checkbox-checkmark {
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 1px;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-checkmark {
  background: #ef4444;
  border-color: #ef4444;
}

.checkbox-input:checked + .checkbox-checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  color: white;
  font-weight: 500;
  font-size: 14px;
}

.option-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.2);
  justify-content: flex-end;
}

.dialog-button {
  padding: 10px 20px;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  min-width: 80px;
}

.dialog-button-cancel {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

.dialog-button-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dialog-button-confirm {
  color: white;
}

.dialog-button-danger {
  background: #ef4444;
  border-color: #ef4444;
}

.dialog-button-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.dialog-button-warning {
  background: #f59e0b;
  border-color: #f59e0b;
}

.dialog-button-warning:hover {
  background: #d97706;
  border-color: #d97706;
}

.dialog-button-primary {
  background: #3b82f6;
  border-color: #3b82f6;
}

.dialog-button-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}
</style>