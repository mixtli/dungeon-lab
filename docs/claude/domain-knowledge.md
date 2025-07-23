# VTT and TTRPG Domain Knowledge

This document provides essential domain knowledge about Virtual Tabletops (VTTs) and Table Top Role Playing Games (TTRPGs) relevant to the Dungeon Lab project.

## VTT (Virtual Tabletop) Concepts

### Core VTT Functionality
- **Digital Game Board**: Replaces physical tabletop with digital interface
- **Real-time Collaboration**: Multiple players participate simultaneously
- **Asset Management**: Images, tokens, maps, character sheets
- **Dice Rolling**: Virtual dice with automatic calculations
- **Chat System**: Text communication between players and GM

### VTT User Roles
- **Game Master (GM/DM)**: Runs the game, controls NPCs, manages world
- **Players**: Control their characters, interact with game world
- **Observers**: Watch games without direct participation

### Essential VTT Components

#### Maps and Scenes
- **Battle Maps**: Grid-based tactical combat maps
- **Exploration Maps**: Larger area maps for travel and exploration
- **Theater of Mind**: Text-based scenes without visual maps
- **Dynamic Lighting**: Line of sight and vision blocking
- **Fog of War**: Revealed areas as players explore

#### Tokens and Characters
- **Player Characters (PCs)**: Controlled by players
- **Non-Player Characters (NPCs)**: Controlled by GM
- **Token Representation**: Visual representation on maps
- **Character Sheets**: Digital versions of game statistics
- **Initiative Tracking**: Turn order in combat

#### Game Assets
- **Compendiums**: Collections of game content (spells, monsters, items)
- **Asset Libraries**: Images, sounds, music for immersion
- **Handouts**: Documents shared with players
- **Journals**: GM notes and campaign information

## TTRPG (Table Top Role Playing Game) Concepts

### Game Systems
- **Rule Sets**: Different games use different rules (D&D, Pathfinder, etc.)
- **Core Mechanics**: Dice rolling, skill checks, combat resolution
- **Character Creation**: Building player characters with stats and abilities
- **Progression**: Leveling up and character advancement

### D&D 5th Edition (2024) Specifics

#### Core Mechanics
- **Ability Scores**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Skills**: Specialized applications of ability scores
- **Proficiency Bonus**: Increases with character level
- **Advantage/Disadvantage**: Roll twice, take higher/lower
- **Saving Throws**: Resist harmful effects

#### Character Elements
- **Classes**: Character archetypes (Fighter, Wizard, Rogue, etc.)
- **Races**: Character ancestry (Human, Elf, Dwarf, etc.)
- **Backgrounds**: Character history and training
- **Feats**: Special abilities and bonuses
- **Spells**: Magical abilities for spellcasting classes

#### Combat System
- **Initiative**: Turn order based on Dexterity + d20
- **Actions**: What characters can do on their turn
- **Attacks**: Rolling to hit, then rolling damage
- **Armor Class (AC)**: Difficulty to hit a target
- **Hit Points (HP)**: Character health/survivability
- **Conditions**: Status effects (stunned, poisoned, etc.)

#### Equipment and Items
- **Weapons**: Melee and ranged combat tools
- **Armor**: Protection that affects AC
- **Magic Items**: Enchanted equipment with special properties
- **Currency**: Gold pieces (GP), silver pieces (SP), copper pieces (CP)
- **Consumables**: Potions, scrolls, temporary items

### Campaign Management

#### Session Structure
- **Campaign**: Long-term story arc with consistent characters
- **Sessions**: Individual game meetings (2-4 hours typically)
- **Encounters**: Specific challenges (combat, social, exploration)
- **Scenes**: Discrete narrative moments within sessions

#### GM Responsibilities
- **World Building**: Creating the game setting and NPCs
- **Story Progression**: Advancing the narrative
- **Rule Adjudication**: Making rulings on game mechanics
- **Player Engagement**: Ensuring all players have fun

## VTT Technical Concepts

### Real-time Synchronization
- **Shared State**: All players see the same game state
- **Conflict Resolution**: Handling simultaneous actions
- **Network Latency**: Managing delays in communication
- **State Persistence**: Saving game state between sessions

### Asset Management
- **File Formats**: Images (WebP, PNG, JPEG), Audio (MP3, OGG)
- **Storage Solutions**: Local files vs cloud storage
- **Compression**: Optimizing file sizes for web delivery
- **Copyright**: Managing licensed vs user-generated content

### Performance Considerations
- **Large Maps**: High-resolution images can be memory intensive
- **Many Tokens**: Multiple animated tokens can impact performance
- **Real-time Updates**: Frequent state changes require optimization
- **Mobile Support**: Touch interfaces and smaller screens

## Industry Standards and Patterns

### Popular VTTs
- **Roll20**: Web-based, subscription model, large user base
- **Foundry VTT**: Self-hosted, one-time purchase, highly customizable
- **Fantasy Grounds**: Desktop application, comprehensive rule integration
- **Talespire**: 3D environment, miniature-focused

### Common Features
- **Dice Roller**: Virtual dice with modifiers and formulas
- **Character Sheets**: Digital representation of character stats
- **Map Tools**: Drawing, measuring, movement assistance
- **Voice/Video**: Integrated or external communication
- **Marketplace**: User-generated content sharing

### Data Interchange
- **Universal VTT (UVTT)**: Emerging standard for map files
- **JSON Formats**: Common for character and campaign data
- **Image Standards**: Consistent token and map formats
- **Import/Export**: Moving data between different VTTs

## Plugin Architecture Context

### Game System Plugins
- **Rule Implementation**: Encoding game-specific rules in code
- **Character Sheets**: Custom UI for different game systems
- **Dice Mechanics**: Game-specific rolling and calculation
- **Content Integration**: Compendiums and game-specific assets

### Extension Points
- **Character Creation**: Custom workflows for different systems
- **Combat Resolution**: System-specific combat mechanics
- **Spell Management**: Magic systems vary between games
- **Equipment Handling**: Different encumbrance and equipment rules

## User Experience Patterns

### Player Workflow
1. **Join Campaign**: Connect to ongoing game
2. **Character Selection**: Choose or create character
3. **Session Participation**: Interact with game world
4. **Character Management**: Update stats, inventory, notes

### GM Workflow
1. **Campaign Setup**: Create world, import assets
2. **Session Preparation**: Prepare encounters, maps, NPCs
3. **Live Session Management**: Run game, manage state
4. **Post-Session**: Update campaign, prepare for next session

### Common UI Patterns
- **Tabbed Interfaces**: Organize information efficiently
- **Context Menus**: Right-click actions on tokens/maps
- **Drag and Drop**: Intuitive asset management
- **Modal Dialogs**: Character sheets, settings, dice rollers

## Accessibility Considerations

### Visual Accessibility
- **Color Blindness**: Don't rely solely on color for information
- **High Contrast**: Ensure text readability
- **Scalable UI**: Support different zoom levels
- **Screen Readers**: Semantic HTML for assistive technology

### Motor Accessibility
- **Keyboard Navigation**: Full functionality without mouse
- **Touch Interfaces**: Mobile and tablet support
- **Click Targets**: Adequate size for precise interaction
- **Gesture Alternatives**: Multiple ways to perform actions

### Cognitive Accessibility
- **Clear Information Hierarchy**: Logical organization
- **Consistent Patterns**: Predictable UI behavior
- **Help Systems**: Contextual assistance and tutorials
- **Error Prevention**: Clear validation and feedback

This domain knowledge provides the foundation for understanding user needs, technical requirements, and design decisions in the Dungeon Lab VTT project.