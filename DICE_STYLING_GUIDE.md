# Per-Roll Dice Styling Implementation

## Overview

The dice rolling system now supports per-roll customization of dice appearance. Each roll can have unique colors, materials, physics properties, and visual effects.

## How It Works

### 1. Schema Changes
- Added `DiceStyle` interface to `packages/shared/src/schemas/roll.schema.mts`
- `Roll` and `RollServerResult` now include optional `diceStyle` property
- Supports all DiceBox configuration options: colors, materials, lighting, physics, sounds

### 2. Service Layer
- Enhanced `Dice3DService` with `updateDiceConfig()` method
- Added `rollWithStyleAndNotation()` for styled rolling
- Uses DiceBox's `updateConfig()` for dynamic style changes

### 3. Integration
- `DiceOverlay` now checks for `rollResult.diceStyle` 
- Applies custom styling before rolling dice
- Backward compatible - works without styling

## Usage Example

```typescript
// Example roll with custom red dice
const rollData: Roll = {
  rollId: 'unique-id',
  rollType: 'attack-roll',
  pluginId: 'dnd-5e-2024',
  dice: [{ sides: 20, quantity: 1 }],
  recipients: 'public',
  arguments: { customModifier: 0 },
  modifiers: [],
  metadata: { title: 'Attack Roll' },
  diceStyle: {
    theme_customColorset: {
      background: "#ff0000",  // Red dice
      foreground: "#ffffff",  // White text
      texture: "marble",
      material: "metal"
    },
    theme_material: "metal",
    light_intensity: 1.2,
    gravity_multiplier: 500,
    sounds: true
  }
};
```

## Available Style Options

```typescript
interface DiceStyle {
  theme_colorset?: string;                    // Predefined color set
  theme_material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
  theme_texture?: string;                     // Texture name
  theme_customColorset?: {                    // Custom colors
    background: string;   // Primary dice color
    foreground: string;   // Text/number color  
    texture: string;      // Texture type
    material: string;     // Material type
  };
  light_intensity?: number;                   // Lighting brightness
  gravity_multiplier?: number;                // Physics gravity
  sounds?: boolean;                           // Sound effects
  baseScale?: number;                         // Dice size
  strength?: number;                          // Roll force
}
```

## Implementation Details

### Flow
1. Player initiates roll with optional `diceStyle`
2. Server processes roll, preserves `diceStyle` in `RollServerResult` 
3. `DiceOverlay` receives result with styling
4. `Dice3DService.updateDiceConfig()` applies styling
5. `rollWithNotation()` executes with new appearance
6. Dice render with custom styling

### Performance
- `updateConfig()` is faster than full reinitialization
- Style changes apply instantly between rolls
- Previous style persists until next styled roll

### Error Handling
- Invalid style options are logged but don't break rolls
- Falls back to existing `rollWithNotation()` if styling fails
- Graceful degradation for unsupported options

## Next Steps (Future Features)

1. **Player Preferences UI**
   - Color picker for dice customization
   - Material/texture selection
   - Save personal dice style preferences

2. **Smart Style Application**  
   - Apply player's preferred style automatically
   - Override with spell/item-specific styling
   - GM can force specific styles for special events

3. **Predefined Style Sets**
   - "Fire Spell" - Red/orange with glow effects
   - "Ice Spell" - Blue/white with frost texture
   - "Poison" - Green with toxic material
   - "Critical Hit" - Golden dice with extra effects

4. **Advanced Effects**
   - Particle effects for special rolls
   - Trail effects during dice flight
   - Glow/shimmer for magical items
   - Different sounds per material type

## Testing

The implementation is backward compatible. Existing rolls continue to work unchanged. To test styling:

1. Send a roll with `diceStyle` property
2. Check browser console for "Rolling with custom dice style" message
3. Verify dice appearance matches specified styling
4. Test multiple consecutive rolls with different styles

## File Changes Made

- `packages/shared/src/schemas/roll.schema.mts` - Added DiceStyle schema
- `packages/web/src/services/dice-3d.service.mts` - Added updateConfig support  
- `packages/web/src/components/dice/DiceOverlay.vue` - Added style application logic