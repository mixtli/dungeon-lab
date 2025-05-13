# Map Editor Technical Notes

This document outlines technical considerations, dependencies, and implementation notes for the map editor feature.

## Dependencies

The following dependencies need to be added to the project:

1. **Konva.js**: A HTML5 Canvas JavaScript framework for creating desktop and mobile applications.

   - Package: `konva`
   - Version: ^9.0.0
   - Usage: Core canvas manipulation library

2. **Vue Konva**: Vue wrapper for Konva.js

   - Package: `vue-konva`
   - Version: ^3.0.0
   - Usage: Vue bindings for Konva.js

3. **TypeScript Types**:
   - `@types/konva` if not included in the Konva package

## Installation

Add these dependencies to the `packages/web` package:

```bash
npm install --save konva vue-konva
```

## Technical Considerations

### 1. Canvas Performance

- **Large Maps**: For large maps with many objects, consider:

  - Using layer caching (`layer.cache()`)
  - Implementing object batching for complex operations
  - Using hit detection optimization techniques

- **Memory Management**: Properly clean up Konva objects when no longer needed:
  ```typescript
  // Example cleanup
  onUnmounted(() => {
    stage.value?.destroy();
    // Clean up other refs and listeners
  });
  ```

### 2. State Management

- **Centralized State**: Use the `useEditorState` composable for centralized state management
- **Reactive Integration**: Ensure proper reactivity with Vue's composition API
- **Object References**: Maintain consistent object references for selections and transformations

### 3. Tool Implementation

- **Tool Modes**: Implement a clear separation between tool modes (select, draw, edit)
- **Event Handling**: Use Konva's event system consistently:
  ```typescript
  // Example event handling
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (currentTool.value === 'select') {
      // Selection logic
    } else if (currentTool.value === 'wall') {
      // Wall drawing logic
    }
  };
  ```

### 4. Import/Export

- **Data Validation**: Validate UVTT data structure before import/export
- **Error Handling**: Add robust error handling for malformed UVTT files
- **Coordinate Systems**: Maintain consistent coordinate system transformations

### 5. Grid System

- **Performance**: For large grids, consider using efficient drawing techniques

  - Draw only visible grid lines
  - Use canvas patterns for grid rendering
  - Update grid only on viewport changes

- **Coordinate Conversion**: Implement helpers for:
  - Pixel coordinates ↔ Grid coordinates
  - World coordinates ↔ Screen coordinates

### 6. Editor History

- **Command Pattern**: Implement the command pattern for history management

  ```typescript
  // Example command interface
  interface EditorCommand {
    execute(): void;
    undo(): void;
  }
  ```

- **History Stack**: Maintain limited-size stacks for undo/redo operations
- **Batch Operations**: Group related operations for atomic undo/redo

### 7. Saving and Loading

- **Optimistic Updates**: Implement optimistic UI updates during save operations
- **Progress Indicators**: Add progress indicators for long-running operations
- **Autosave**: Consider implementing autosave functionality

## Browser Compatibility

The map editor depends on modern browser features:

- HTML5 Canvas API
- ES6+ JavaScript features
- Modern CSS features

Ensure compatibility with:

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Testing Strategy

1. **Unit Tests**:

   - Test composables in isolation
   - Mock Konva objects for testing

2. **Component Tests**:

   - Test Vue components with mocked canvas
   - Focus on props, events, and state changes

3. **Integration Tests**:

   - Test full component tree with actual canvas rendering
   - Test data flow between components

4. **Manual Testing**:
   - Verify drawing operations
   - Test large map performance
   - Validate import/export functionality

## Accessibility Considerations

Canvas-based applications present accessibility challenges:

- Add keyboard navigation for selecting and manipulating objects
- Provide text alternatives for important visual information
- Implement ARIA attributes for UI controls
- Consider high contrast mode for better visibility

## Next Steps

1. Add the required dependencies to the project
2. Create the basic directory structure
3. Implement the core `useEditorState` composable
4. Begin building the canvas foundation
