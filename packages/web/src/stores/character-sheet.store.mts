import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

export interface FloatingCharacterSheet {
  id: string;
  character: IActor;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export const useCharacterSheetStore = defineStore('characterSheet', () => {
  const floatingSheets = ref<Map<string, FloatingCharacterSheet>>(new Map());
  let nextZIndex = 1000;

  function openCharacterSheet(character: IActor) {
    const id = `character-sheet-${character.id}`;
    
    // If already open, just bring to front
    if (floatingSheets.value.has(id)) {
      bringToFront(id);
      return;
    }

    // Create new floating character sheet
    const sheet: FloatingCharacterSheet = {
      id,
      character,
      position: { 
        x: 200 + (floatingSheets.value.size * 30), // Offset each new window
        y: 100 + (floatingSheets.value.size * 30) 
      },
      size: { width: 1000, height: 700 },
      zIndex: ++nextZIndex
    };

    floatingSheets.value.set(id, sheet);
  }

  function closeCharacterSheet(id: string) {
    floatingSheets.value.delete(id);
  }

  function bringToFront(id: string) {
    const sheet = floatingSheets.value.get(id);
    if (sheet) {
      sheet.zIndex = ++nextZIndex;
    }
  }

  function updatePosition(id: string, x: number, y: number) {
    const sheet = floatingSheets.value.get(id);
    if (sheet) {
      sheet.position = { x, y };
    }
  }

  function updateSize(id: string, width: number, height: number) {
    const sheet = floatingSheets.value.get(id);
    if (sheet) {
      sheet.size = { width, height };
    }
  }


  function updateCharacter(id: string, character: IActor) {
    const sheet = floatingSheets.value.get(id);
    if (sheet) {
      sheet.character = character;
    }
  }

  return {
    floatingSheets,
    openCharacterSheet,
    closeCharacterSheet,
    bringToFront,
    updatePosition,
    updateSize,
    updateCharacter
  };
});