import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

export interface FloatingDocumentSheet<T extends BaseDocument = BaseDocument> {
  id: string;
  document: T;
  position: { x: number; y: number };
  size?: { width: number; height: number }; // Optional - CSS fit-content used when not specified
  zIndex: number;
}

export const useDocumentSheetStore = defineStore('documentSheet', () => {
  const floatingSheets = ref<Map<string, FloatingDocumentSheet>>(new Map());
  let nextZIndex = 1000;

  function openDocumentSheet<T extends BaseDocument>(document: T) {
    const id = `document-sheet-${document.documentType}-${document.id}`;
    
    // If already open, just bring to front
    if (floatingSheets.value.has(id)) {
      bringToFront(id);
      return;
    }

    // Create new floating document sheet
    const sheet: FloatingDocumentSheet<T> = {
      id,
      document,
      position: { 
        x: 200 + (floatingSheets.value.size * 30), // Offset each new window
        y: 100 + (floatingSheets.value.size * 30) 
      },
      // No size property - let CSS fit-content handle sizing
      zIndex: ++nextZIndex
    };

    floatingSheets.value.set(id, sheet);
  }

  function closeDocumentSheet(id: string) {
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

  function updateDocument<T extends BaseDocument>(id: string, document: T) {
    const sheet = floatingSheets.value.get(id);
    if (sheet) {
      sheet.document = document;
    }
  }

  return {
    floatingSheets,
    openDocumentSheet,
    closeDocumentSheet,
    bringToFront,
    updatePosition,
    updateSize,
    updateDocument
  };
});