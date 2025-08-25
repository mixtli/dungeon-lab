import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useDocumentSheetStore = defineStore('documentSheet', () => {
    const floatingSheets = ref(new Map());
    let nextZIndex = 1000;
    function openDocumentSheet(document) {
        const id = `document-sheet-${document.documentType}-${document.id}`;
        // If already open, just bring to front
        if (floatingSheets.value.has(id)) {
            bringToFront(id);
            return;
        }
        // Create new floating document sheet
        const sheet = {
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
    function closeDocumentSheet(id) {
        floatingSheets.value.delete(id);
    }
    function bringToFront(id) {
        const sheet = floatingSheets.value.get(id);
        if (sheet) {
            sheet.zIndex = ++nextZIndex;
        }
    }
    function updatePosition(id, x, y) {
        const sheet = floatingSheets.value.get(id);
        if (sheet) {
            sheet.position = { x, y };
        }
    }
    function updateSize(id, width, height) {
        const sheet = floatingSheets.value.get(id);
        if (sheet) {
            sheet.size = { width, height };
        }
    }
    function updateDocument(id, document) {
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
//# sourceMappingURL=document-sheet.store.mjs.map