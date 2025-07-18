# Plugin Marketplace Architecture

## Executive Summary

### Vision
Transform Dungeon Lab into an extensible platform where users can discover, install, and use game system plugins and content packs created by the community. This marketplace will enable support for multiple tabletop RPG systems while maintaining security, performance, and ease of use.

### Key Objectives
- **Security First**: Eliminate arbitrary code execution risks through data-driven architecture
- **Developer Friendly**: Provide intuitive tools and clear documentation for plugin creators
- **User Experience**: Seamless plugin discovery, installation, and management
- **Business Value**: Create revenue streams through premium plugins and content packs
- **Scalability**: Support thousands of plugins with minimal performance impact

### Data-Driven Approach Benefits
- **Enhanced Security**: No arbitrary code execution, only configuration and templates
- **Better Performance**: No VM overhead or sandboxing complexity
- **Easier Review**: Human-readable plugin content enables faster approval
- **Simplified Development**: Plugin authors work with familiar formats (JSON, Vue templates)
- **Maintainability**: Centralized rule engine reduces complexity
- **Client-Only Architecture**: Simplified deployment with trusted client-side game logic
- **Custom Mechanics Support**: Flexible framework for unique game systems

## Technical Architecture

### Plugin Package Format

#### Package Structure
```
plugin-pathfinder-2e-v1.0.0.zip
├── manifest.json                 # Plugin metadata and configuration
├── data/                         # Game system data
│   ├── classes.json
│   ├── spells.json
│   ├── items.json
│   └── rules.json
├── components/                   # Vue components (client-only)
│   ├── character-sheet.vue
│   ├── spell-card.vue
│   ├── item-card.vue
│   └── custom-mechanics/         # Custom game mechanics
│       ├── initiative-tracker.vue
│       ├── jenga-tower.vue       # For unique systems like Dread
│       └── tension-meter.vue
├── mechanics/                    # Custom game mechanics (client-only)
│   ├── initiative-system.js
│   ├── combat-system.js
│   └── custom-mechanics.js
├── assets/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── styles.css
└── locales/                      # Internationalization
    ├── en.json
    └── es.json
```

#### Manifest Schema
```json
{
  "id": "pathfinder-2e",
  "name": "Pathfinder 2E",
  "version": "1.0.0",
  "description": "Complete Pathfinder 2E game system support",
  "author": "Community Developer",
  "website": "https://example.com",
  "license": "MIT",
  "category": "game-system",
  "tags": ["pathfinder", "fantasy", "d20"],
  "minimumAppVersion": "1.0.0",
  "dependencies": [],
  "permissions": [
    "character-management",
    "dice-rolling", 
    "content-library",
    "custom-mechanics",
    "ui-override"
  ],
  "gameSystem": {
    "attributes": [
      {
        "name": "strength",
        "type": "number",
        "min": 1,
        "max": 20,
        "default": 10
      }
    ],
    "characterSheet": {
      "layout": "pathfinder-2e-sheet",
      "sections": ["attributes", "skills", "equipment"]
    },
    "diceSystem": {
      "defaultFormula": "1d20",
      "criticalSuccess": 20,
      "criticalFailure": 1,
      "customRolls": [
        {
          "name": "attack",
          "formula": "1d20 + {attackBonus}",
          "description": "Standard attack roll"
        }
      ]
    }
  },
  "content": {
    "classes": "./data/classes.json",
    "spells": "./data/spells.json",
    "items": "./data/items.json"
  },
  "ui": {
    "characterSheet": "./components/character-sheet.vue",
    "spellCard": "./components/spell-card.vue",
    "itemCard": "./components/item-card.vue"
  },
  "mechanics": {
    "initiative": "./mechanics/initiative-system.js",
    "combat": "./mechanics/combat-system.js",
    "customMechanics": "./mechanics/custom-mechanics.js"
  },
  "capabilities": {
    "replaces": ["standard-initiative", "standard-combat"],
    "adds": ["custom-spell-system", "advanced-conditions"],
    "customUI": {
      "gameMode": "standard",
      "fullscreen": false,
      "customSections": ["spell-preparation", "condition-tracker"]
    }
  }
}
```

### Custom Mechanics Framework

#### Philosophy: Support for Unique Game Systems
Many RPG systems have mechanics that don't fit into generalized patterns. Rather than forcing all games into common interfaces, the plugin system provides flexible extension points for completely unique mechanics.

#### Examples of Unique Mechanics
- **Dread**: Uses a physical Jenga tower for action resolution
- **Fiasco**: Uses a bag of tokens for scene framing, no dice
- **Microscope**: Collaborative timeline building with no traditional characters
- **Blades in the Dark**: Flashback mechanics and position/effect system
- **Savage Worlds**: Playing cards for initiative instead of dice

#### Extension Point Architecture
```typescript
// Core framework provides extension points
interface GameMechanicsFramework {
  // Standard systems (can be disabled/replaced)
  characterSystem?: CharacterSystemInterface;
  diceSystem?: DiceSystemInterface;
  initiativeSystem?: InitiativeSystemInterface;
  
  // Custom mechanics registry
  registerCustomMechanic(name: string, mechanic: CustomMechanic): void;
  overrideCoreMechanic(name: string, replacement: any): void;
  
  // UI extension points
  registerUIComponent(name: string, component: VueComponent): void;
  replaceUISection(section: string, component: VueComponent): void;
  
  // Game loop hooks
  registerGamePhase(name: string, phase: GamePhase): void;
  overrideGameLoop(gameLoop: GameLoop): void;
}
```

#### Custom Mechanic Implementation
```javascript
// mechanics/dread-tower.js - Unique Jenga tower mechanic
export class DreadTowerMechanic {
  constructor() {
    this.tower = this.initializeTower();
    this.stability = 100;
  }
  
  initializeTower() {
    // Initialize 54-block Jenga tower
    const tower = [];
    for (let level = 0; level < 18; level++) {
      for (let position = 0; position < 3; position++) {
        tower.push({
          id: `${level}-${position}`,
          level,
          position,
          removed: false
        });
      }
    }
    return tower;
  }
  
  pullBlock(blockId) {
    const block = this.tower.find(b => b.id === blockId);
    if (!block || block.removed) return false;
    
    block.removed = true;
    this.stability = this.calculateStability();
    
    if (this.stability <= 0) {
      this.onTowerFall();
      return { success: false, towerFell: true };
    }
    
    return { success: true, stability: this.stability };
  }
  
  calculateStability() {
    // Custom stability calculation logic
    const removedBlocks = this.tower.filter(b => b.removed);
    const topHeavyPenalty = this.calculateTopHeavyPenalty(removedBlocks);
    const supportPenalty = this.calculateSupportPenalty(removedBlocks);
    
    return Math.max(0, 100 - removedBlocks.length * 5 - topHeavyPenalty - supportPenalty);
  }
  
  onTowerFall() {
    // Custom game logic when tower falls
    this.triggerEvent('character-death', {
      message: 'The tower has fallen! Your character meets their fate.'
    });
  }
}
```

#### Custom UI Components
```vue
<!-- components/custom-mechanics/jenga-tower.vue -->
<template>
  <div class="jenga-tower">
    <div class="tower-container">
      <div 
        v-for="level in 18" 
        :key="level"
        class="tower-level"
        :class="{ 'level-' + (level % 2) }"
      >
        <div
          v-for="position in 3"
          :key="position"
          class="tower-block"
          :class="{ 
            'removed': isBlockRemoved(level, position),
            'pullable': canPullBlock(level, position)
          }"
          @click="pullBlock(level, position)"
        >
          <div class="block-face"></div>
        </div>
      </div>
    </div>
    
    <div class="tower-info">
      <div class="stability-meter">
        <div class="meter-fill" :style="{ width: stability + '%' }"></div>
        <span>Stability: {{ stability }}%</span>
      </div>
      
      <div class="tower-actions">
        <button @click="resetTower" class="reset-btn">New Tower</button>
        <button @click="calculateMove" class="hint-btn">Analyze Move</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useDreadTower } from '../mechanics/dread-tower';

const tower = useDreadTower();
const stability = computed(() => tower.stability);

function pullBlock(level, position) {
  const blockId = `${level}-${position}`;
  const result = tower.pullBlock(blockId);
  
  if (result.towerFell) {
    // Handle character death or story consequence
    handleTowerFall();
  }
}

function isBlockRemoved(level, position) {
  const blockId = `${level}-${position}`;
  return tower.isBlockRemoved(blockId);
}

function canPullBlock(level, position) {
  const blockId = `${level}-${position}`;
  return tower.canPullBlock(blockId);
}
</script>

<style scoped>
.jenga-tower {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.tower-container {
  perspective: 1000px;
  margin-bottom: 20px;
}

.tower-level {
  display: flex;
  margin-bottom: 2px;
}

.tower-level.level-1 {
  flex-direction: row;
}

.tower-level.level-0 {
  flex-direction: column;
}

.tower-block {
  width: 60px;
  height: 20px;
  background: #d4a574;
  border: 1px solid #8b4513;
  cursor: pointer;
  margin: 1px;
  transition: all 0.3s ease;
}

.tower-block.removed {
  opacity: 0.3;
  background: #666;
  cursor: not-allowed;
}

.tower-block.pullable:hover {
  background: #e6b885;
  transform: translateY(-2px);
}

.stability-meter {
  width: 200px;
  height: 20px;
  background: #ddd;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(to right, #ff4444, #ffff44, #44ff44);
  transition: width 0.3s ease;
}
</style>
```

### Template System Integration

#### Vue Template Constraints
Templates are restricted Vue Single File Components with specific limitations:

```vue
<!-- templates/character-sheet.vue -->
<template>
  <div class="pathfinder-character-sheet">
    <header class="character-header">
      <h2>{{ character.name }}</h2>
      <p>Level {{ character.level }} {{ character.class }}</p>
    </header>
    
    <section class="attributes">
      <AttributeBlock 
        v-for="attr in attributes"
        :key="attr.name"
        :attribute="attr"
        :value="character.attributes[attr.name]"
        @update="updateAttribute"
      />
    </section>
    
    <section class="skills">
      <SkillBlock
        v-for="skill in skills"
        :key="skill.name"
        :skill="skill"
        :character="character"
      />
    </section>
  </div>
</template>

<script setup>
// Only specific composables and props are available
const props = defineProps({
  character: Object,
  readonly: Boolean
});

const emit = defineEmits(['update']);

// Restricted to approved composables only
const { attributes, skills } = useGameSystem();
const { rollDice } = useDiceRoller();

function updateAttribute(attrName, value) {
  emit('update', { 
    type: 'attribute', 
    name: attrName, 
    value 
  });
}
</script>

<style scoped>
.pathfinder-character-sheet {
  /* Plugin-specific styling */
}
</style>
```

#### Template Validation Rules
- **No arbitrary JavaScript**: Only approved composables and utilities
- **Props validation**: Strict typing for all props
- **Event restrictions**: Only approved events can be emitted
- **Import restrictions**: Cannot import external modules
- **API access**: Limited to approved plugin APIs

#### Technical Security Enforcement
Templates undergo compile-time security analysis:

```typescript
// Custom Vue template compiler with security checks
class SecureTemplateCompiler {
  compile(template: string): CompiledTemplate {
    const ast = parseTemplate(template);
    
    // Security validations
    this.validateAST(ast);
    this.checkDangerousPatterns(ast);
    this.validateImports(ast);
    this.checkAPIAccess(ast);
    
    return compileSecureAST(ast);
  }
  
  private validateAST(ast: TemplateAST) {
    traverseAST(ast, (node) => {
      // Block dangerous global access
      if (node.type === 'MemberExpression' && 
          DANGEROUS_GLOBALS.includes(node.object.name)) {
        throw new SecurityError(`Forbidden global access: ${node.object.name}`);
      }
      
      // Block constructor access
      if (node.type === 'MemberExpression' && 
          node.property.name === 'constructor') {
        throw new SecurityError('Constructor access forbidden');
      }
      
      // Block function creation
      if (node.type === 'NewExpression' && 
          node.callee.name === 'Function') {
        throw new SecurityError('Dynamic function creation forbidden');
      }
    });
  }
  
  private checkDangerousPatterns(ast: TemplateAST) {
    const dangerousPatterns = [
      /window\./,
      /process\./,
      /global\./,
      /\$parent/,
      /constructor/,
      /eval\(/,
      /Function\(/
    ];
    
    const templateSource = astToString(ast);
    for (const pattern of dangerousPatterns) {
      if (pattern.test(templateSource)) {
        throw new SecurityError(`Dangerous pattern detected: ${pattern}`);
      }
    }
  }
}

// Runtime sandbox for expression evaluation
class SecureExpressionEvaluator {
  private allowedAPIs = new Set([
    'character',
    'dice',
    'content',
    'mechanics'
  ]);
  
  evaluate(expression: string, context: any): any {
    const ast = parseExpression(expression);
    return this.evaluateAST(ast, context);
  }
  
  private evaluateAST(ast: ExpressionAST, context: any): any {
    // Only allow approved API access
    if (ast.type === 'MemberExpression') {
      const rootName = this.getRootIdentifier(ast);
      if (!this.allowedAPIs.has(rootName)) {
        throw new SecurityError(`Unauthorized API access: ${rootName}`);
      }
    }
    
    // Evaluate in restricted context
    return safeEval(ast, context);
  }
}
```

### Rule Engine Design

#### Rule Definition Format
```json
{
  "rules": [
    {
      "id": "level-up-attribute-increase",
      "name": "Level Up Attribute Increase",
      "trigger": "character.level.changed",
      "condition": {
        "type": "expression",
        "expression": "newValue > oldValue && newValue % 4 === 0"
      },
      "actions": [
        {
          "type": "modify",
          "target": "character.availableAttributePoints",
          "operation": "add",
          "value": 1
        },
        {
          "type": "notification",
          "message": "You gain 1 attribute point for reaching level {character.level}!"
        }
      ]
    },
    {
      "id": "spell-slot-consumption",
      "name": "Spell Slot Consumption",
      "trigger": "spell.cast",
      "condition": {
        "type": "expression",
        "expression": "character.spellSlots[spell.level] > 0"
      },
      "actions": [
        {
          "type": "modify",
          "target": "character.spellSlots[spell.level]",
          "operation": "subtract",
          "value": 1
        }
      ],
      "failureActions": [
        {
          "type": "prevent",
          "message": "Not enough spell slots of level {spell.level}"
        }
      ]
    }
  ]
}
```

#### Rule Engine Features
- **Event-driven**: Triggers based on character/game state changes
- **Conditional logic**: Support for complex conditions using safe expressions
- **Action system**: Modify character data, show notifications, prevent actions
- **Validation**: Ensure rules can't break game state or cause infinite loops
- **Performance**: Efficient rule evaluation with caching

### Content Management System

#### Data Structure Standards
```json
{
  "classes": [
    {
      "id": "fighter",
      "name": "Fighter",
      "description": "A master of martial combat",
      "hitDie": "d10",
      "primaryAbility": "strength",
      "savingThrows": ["strength", "constitution"],
      "skills": {
        "count": 2,
        "choices": ["acrobatics", "animal-handling", "athletics"]
      },
      "features": [
        {
          "level": 1,
          "name": "Fighting Style",
          "description": "Choose a fighting style specialty"
        }
      ]
    }
  ],
  "spells": [
    {
      "id": "fireball",
      "name": "Fireball",
      "level": 3,
      "school": "evocation",
      "castingTime": "1 action",
      "range": "150 feet",
      "components": ["V", "S", "M"],
      "duration": "Instantaneous",
      "description": "A bright streak flashes from your pointing finger..."
    }
  ],
  "items": [
    {
      "id": "longsword",
      "name": "Longsword",
      "type": "weapon",
      "category": "martial-melee",
      "damage": "1d8",
      "damageType": "slashing",
      "weight": 3,
      "cost": {
        "amount": 15,
        "currency": "gp"
      }
    }
  ]
}
```

## Security Model

### Security-by-Design Principles

#### Core Security Features
1. **No Code Execution**: Plugins contain only data and templates (with limited custom mechanics)
2. **Template Sandboxing**: Vue templates have restricted access to APIs
3. **Data Validation**: All plugin content is validated against schemas
4. **Permission System**: Plugins declare required permissions explicitly
5. **Content Review**: Human review process for all public plugins
6. **Client-Side Trust**: RPG games with friends don't require server-side validation
7. **Compile-Time Security**: Security enforced during plugin compilation, not runtime

#### Validation Pipeline
```typescript
interface ValidationPipeline {
  steps: [
    'packageIntegrity',      // Verify ZIP structure and signatures
    'manifestValidation',    // Validate manifest against JSON schema
    'templateSecurity',      // Check templates for security issues
    'dataValidation',        // Validate all data files
    'permissionCheck',       // Verify permissions are appropriate
    'contentReview'          // Human review for marketplace plugins
  ];
}
```

#### Permission System
```json
{
  "permissions": [
    {
      "name": "character-management",
      "description": "Read and modify character data",
      "apis": ["character.get", "character.update", "character.create"]
    },
    {
      "name": "dice-rolling",
      "description": "Execute dice rolls",
      "apis": ["dice.roll", "dice.registerFormula"]
    },
    {
      "name": "content-library",
      "description": "Access game content library",
      "apis": ["content.search", "content.get"]
    },
    {
      "name": "custom-mechanics",
      "description": "Register custom game mechanics",
      "apis": ["mechanics.register", "mechanics.override"]
    },
    {
      "name": "ui-override",
      "description": "Replace or extend UI components",
      "apis": ["ui.replace", "ui.extend", "ui.addSection"]
    }
  ]
}
```

#### Client-Side Trust Model
For RPG games played among friends, we adopt a trust-based approach:

**Why Client-Side Works for RPGs:**
- **Cooperative gameplay**: Players work together, not against each other
- **Social enforcement**: Cheating is handled socially, not technically
- **Flexibility**: Allows for house rules and custom interpretations
- **Performance**: No server round-trips for every action
- **Simplified architecture**: Easier to develop and maintain

**Trust Boundaries:**
- **Character data**: Stored locally, synced via WebSocket
- **Dice rolls**: Rolled locally, results shared with group
- **Game rules**: Enforced by plugin, trusted by players
- **Content access**: Local validation only

**Security Focus:**
- **Marketplace security**: Prevent malicious plugins from reaching users
- **Data integrity**: Ensure character data isn't corrupted
- **Plugin isolation**: Prevent plugins from interfering with each other
- **User privacy**: Protect user data from unauthorized access

### Content Review Process

#### Automated Checks
- **Schema validation**: Ensure all files conform to expected formats
- **Template security**: Scan for dangerous patterns in Vue templates
- **Asset validation**: Check file sizes, formats, and content
- **Performance impact**: Analyze potential performance issues

#### Human Review Criteria
- **Content quality**: Accurate game system implementation
- **User experience**: Intuitive and well-designed interfaces
- **Documentation**: Clear installation and usage instructions
- **Licensing**: Proper attribution and license compliance

## Developer Experience

### Plugin Creation Workflow

#### Step 1: Project Setup
```bash
# Install the plugin CLI
npm install -g @dungeon-lab/plugin-cli

# Create new plugin project
dl-plugin create pathfinder-2e --template=game-system

# Navigate to project directory
cd pathfinder-2e

# Install dependencies
npm install
```

#### Step 2: Development Environment
```bash
# Start development server with hot reload
npm run dev

# Validate plugin structure
npm run validate

# Test plugin in local Dungeon Lab instance
npm run test:local
```

#### Step 3: Publishing
```bash
# Build plugin for production
npm run build

# Submit to marketplace
npm run publish
```

### Development Tools

#### Plugin CLI Features
- **Project scaffolding**: Generate plugin templates
- **Development server**: Hot reload for templates and data
- **Validation tools**: Real-time error checking
- **Testing framework**: Unit and integration tests
- **Publishing tools**: Package and submit to marketplace

#### IDE Integration
- **VS Code Extension**: Syntax highlighting and validation
- **Schema intellisense**: Auto-completion for manifest files
- **Template debugging**: Debug Vue templates in context
- **Live preview**: See changes in real-time

### Testing Framework

#### Unit Testing
```javascript
// tests/rules.test.js
import { RuleEngine } from '@dungeon-lab/plugin-sdk';
import rules from '../data/rules.json';

describe('Level Up Rules', () => {
  const engine = new RuleEngine(rules);
  
  test('should grant attribute point at level 4', () => {
    const character = { level: 3, availableAttributePoints: 0 };
    const result = engine.trigger('character.level.changed', {
      character,
      oldValue: 3,
      newValue: 4
    });
    
    expect(result.character.availableAttributePoints).toBe(1);
  });
});
```

#### Integration Testing
```javascript
// tests/integration.test.js
import { PluginTester } from '@dungeon-lab/plugin-sdk';
import plugin from '../manifest.json';

describe('Plugin Integration', () => {
  const tester = new PluginTester(plugin);
  
  test('should create character sheet', async () => {
    const character = await tester.createCharacter({
      name: 'Test Fighter',
      class: 'fighter',
      level: 1
    });
    
    const sheet = await tester.renderCharacterSheet(character);
    expect(sheet.querySelector('.character-header h2').textContent)
      .toBe('Test Fighter');
  });
});
```

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)

#### Month 1: Core Infrastructure
**Week 1-2: Plugin Package System**
- Design and implement plugin package format
- Create manifest schema and validation
- Build client-side plugin loader and registry system

**Week 3-4: Template System**
- Integrate Vue template rendering with security compiler
- Implement template security restrictions and AST validation
- Create approved composables library
- Build custom mechanics framework

#### Month 2: Custom Mechanics & Content
**Week 1-2: Custom Mechanics System**
- Build extension point architecture
- Implement custom mechanic registration
- Create UI override system
- Build examples for unique game systems (Dread, Fiasco, etc.)

**Week 3-4: Content Management**
- Build content validation system
- Create data import/export tools
- Implement content versioning
- Build client-side content library

#### Month 3: Developer Tools
**Week 1-2: Plugin CLI**
- Create project scaffolding tools
- Build development server with hot reload
- Implement validation and testing tools

**Week 3-4: Documentation**
- Write comprehensive developer guide
- Create example plugins and tutorials
- Build API reference documentation

### Phase 2: Marketplace Platform (Months 4-6)

#### Month 4: Web Platform
**Week 1-2: Marketplace UI**
- Design and build marketplace interface
- Implement plugin search and discovery
- Create plugin detail pages

**Week 3-4: User Management**
- Build developer account system
- Implement plugin publishing workflow
- Create user dashboard

#### Month 5: Business Features
**Week 1-2: Monetization**
- Implement payment processing
- Create pricing models for plugins
- Build revenue sharing system

**Week 3-4: Analytics**
- Create plugin usage analytics
- Build developer analytics dashboard
- Implement A/B testing framework

#### Month 6: Quality Assurance
**Week 1-2: Review System**
- Build content review workflow
- Implement automated security scanning
- Create moderation tools

**Week 3-4: Testing & Polish**
- Comprehensive testing of all features
- Performance optimization
- Bug fixes and polish

### Phase 3: Advanced Features (Months 7-9)

#### Month 7: Enhanced Security
**Week 1-2: Advanced Validation**
- Implement AI-powered content review
- Create anomaly detection system
- Build threat monitoring tools

**Week 3-4: Performance Optimization**
- Optimize plugin loading and rendering
- Implement caching strategies
- Create performance monitoring

#### Month 8: Enterprise Features
**Week 1-2: Enterprise Tools**
- Build private plugin repositories
- Implement enterprise licensing
- Create bulk management tools

**Week 3-4: API Enhancement**
- Expand plugin API capabilities
- Create webhook system
- Build third-party integrations

#### Month 9: Launch Preparation
**Week 1-2: Beta Testing**
- Conduct closed beta with select developers
- Gather feedback and iterate
- Fix critical issues

**Week 3-4: Launch**
- Public launch of marketplace
- Marketing and community outreach
- Monitor and support initial users

## Data Schemas

### Manifest Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "version", "author", "category"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "Unique plugin identifier"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "description": "Human-readable plugin name"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version number"
    },
    "description": {
      "type": "string",
      "maxLength": 200,
      "description": "Brief plugin description"
    },
    "author": {
      "type": "string",
      "description": "Plugin author name"
    },
    "website": {
      "type": "string",
      "format": "uri",
      "description": "Plugin website URL"
    },
    "license": {
      "type": "string",
      "enum": ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause"],
      "description": "Plugin license"
    },
    "category": {
      "type": "string",
      "enum": ["game-system", "content-pack", "utility"],
      "description": "Plugin category"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "maxItems": 10,
      "description": "Search tags"
    },
    "minimumAppVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Minimum Dungeon Lab version required"
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "version": { "type": "string" }
        }
      },
      "description": "Plugin dependencies"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "character-management",
          "dice-rolling",
          "content-library",
          "custom-mechanics",
          "ui-override",
          "file-storage"
        ]
      },
      "description": "Required permissions"
    }
  }
}
```

### Game System Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "attributes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type"],
        "properties": {
          "name": { "type": "string" },
          "type": { "enum": ["number", "string", "boolean"] },
          "min": { "type": "number" },
          "max": { "type": "number" },
          "default": {},
          "description": { "type": "string" }
        }
      }
    },
    "characterSheet": {
      "type": "object",
      "properties": {
        "layout": { "type": "string" },
        "sections": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "diceSystem": {
      "type": "object",
      "properties": {
        "defaultFormula": { "type": "string" },
        "criticalSuccess": { "type": "number" },
        "criticalFailure": { "type": "number" },
        "customRolls": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "formula": { "type": "string" },
              "description": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

### Initiative Systems Example

#### Handling Different Initiative Mechanics
Initiative systems vary wildly between game systems. Here's how the plugin framework handles this:

```javascript
// mechanics/initiative-systems.js
export class DnD5eInitiativeSystem {
  id = "dnd5e-initiative";
  name = "D&D 5e Initiative";
  
  rollInitiative(character) {
    const dexModifier = this.calculateModifier(character.attributes.dexterity);
    const roll = this.rollDice("1d20");
    
    return {
      characterId: character.id,
      roll: roll.total,
      modifier: dexModifier,
      total: roll.total + dexModifier,
      tiebreaker: dexModifier
    };
  }
  
  sortTurnOrder(results) {
    return results.sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return b.tiebreaker - a.tiebreaker;
    });
  }
}

export class SavageWorldsInitiativeSystem {
  id = "savage-worlds-initiative";
  name = "Savage Worlds Initiative";
  
  rollInitiative(character) {
    const card = this.dealCard();
    const speed = character.attributes.agility;
    
    return {
      characterId: character.id,
      card: card,
      suit: card.suit,
      value: card.value,
      canHold: card.isFaceCard,
      speed: speed,
      total: this.calculateCardValue(card) + speed
    };
  }
  
  sortTurnOrder(results) {
    return results.sort((a, b) => {
      if (a.total === b.total) {
        // Clubs beat other suits on ties
        if (a.suit === 'clubs' && b.suit !== 'clubs') return -1;
        if (b.suit === 'clubs' && a.suit !== 'clubs') return 1;
      }
      return b.total - a.total;
    });
  }
  
  canActorTakeExtraAction(actor, turnOrder) {
    const actorResult = turnOrder.find(r => r.characterId === actor);
    return actorResult?.canHold && !actorResult.hasUsedHold;
  }
}

export class FateInitiativeSystem {
  id = "fate-initiative";
  name = "FATE Initiative";
  
  rollInitiative(character) {
    // FATE has no initiative - players decide order
    return {
      characterId: character.id,
      playerChoice: true,
      total: 0
    };
  }
  
  sortTurnOrder(results) {
    // Return in player-chosen order
    return results.sort((a, b) => a.playerOrder - b.playerOrder);
  }
  
  allowsPlayerChoice() {
    return true;
  }
}
```

#### Plugin Registration
```javascript
// Plugin registers its custom initiative system
export default class PathfinderPlugin {
  onLoad() {
    // Register custom initiative system
    this.registerMechanic('initiative', new PathfinderInitiativeSystem());
    
    // Register custom spellcasting system
    this.registerMechanic('spellcasting', new PathfinderSpellcastingSystem());
    
    // Register custom UI components
    this.registerUIComponent('initiative-tracker', PathfinderInitiativeTracker);
  }
}
```

#### UI Components Adapt to Different Systems
```vue
<!-- components/initiative-tracker.vue -->
<template>
  <div class="initiative-tracker">
    <h3>{{ initiativeSystem.name }}</h3>
    
    <!-- D&D style: numeric display -->
    <div v-if="initiativeSystem.id === 'dnd5e-initiative'" class="numeric-initiative">
      <div v-for="actor in turnOrder" :key="actor.id" class="initiative-row">
        <span class="actor-name">{{ actor.name }}</span>
        <span class="initiative-total">{{ actor.total }}</span>
        <span class="initiative-breakdown">({{ actor.roll }} + {{ actor.modifier }})</span>
      </div>
    </div>
    
    <!-- Savage Worlds: card display -->
    <div v-else-if="initiativeSystem.id === 'savage-worlds-initiative'" class="card-initiative">
      <div v-for="actor in turnOrder" :key="actor.id" class="initiative-row">
        <span class="actor-name">{{ actor.name }}</span>
        <PlayingCard :card="actor.card" />
        <button v-if="actor.canHold" @click="holdAction(actor)" class="hold-btn">
          Hold Action
        </button>
      </div>
    </div>
    
    <!-- FATE: player choice -->
    <div v-else-if="initiativeSystem.id === 'fate-initiative'" class="player-choice-initiative">
      <div class="choice-prompt">
        <p>Players decide who goes next!</p>
        <div class="player-selection">
          <button 
            v-for="actor in availableActors" 
            :key="actor.id"
            @click="selectNextActor(actor)"
            class="actor-btn"
          >
            {{ actor.name }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Generic fallback -->
    <div v-else class="generic-initiative">
      <div v-for="actor in turnOrder" :key="actor.id" class="initiative-row">
        <span class="actor-name">{{ actor.name }}</span>
        <span class="initiative-display">{{ actor.displayValue }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useInitiativeSystem } from '../mechanics/initiative-system';

const props = defineProps({
  encounter: Object,
  characters: Array
});

const initiativeSystem = useInitiativeSystem();
const turnOrder = computed(() => initiativeSystem.getCurrentTurnOrder());
const availableActors = computed(() => initiativeSystem.getAvailableActors());

function rollInitiative() {
  for (const character of props.characters) {
    const result = initiativeSystem.rollInitiative(character);
    initiativeSystem.setInitiativeResult(character.id, result);
  }
}

function holdAction(actor) {
  initiativeSystem.holdAction(actor.characterId);
}

function selectNextActor(actor) {
  initiativeSystem.setNextActor(actor.id);
}
</script>
```

## Marketplace Features

### Plugin Discovery System

#### Search and Filtering
- **Full-text search**: Search across plugin names, descriptions, and tags
- **Category filtering**: Filter by game system, content pack, or utility
- **Rating sorting**: Sort by user ratings and reviews
- **Popularity metrics**: Sort by downloads and active users
- **Compatibility**: Filter by supported Dungeon Lab versions

#### Plugin Pages
- **Detailed descriptions**: Rich text descriptions with screenshots
- **Installation instructions**: Step-by-step setup guides
- **Version history**: Change logs and update notes
- **User reviews**: Rating system with detailed feedback
- **Dependencies**: Clear dependency information

### Distribution System

#### Content Delivery Network
- **Global distribution**: Fast plugin downloads worldwide
- **Version management**: Support for multiple plugin versions
- **Incremental updates**: Delta updates for plugin changes
- **Offline support**: Cache plugins for offline use

#### Installation Process
- **One-click install**: Simple installation from marketplace
- **Automatic updates**: Optional automatic plugin updates
- **Rollback support**: Ability to revert to previous versions
- **Conflict resolution**: Handle dependency conflicts gracefully

### Monetization Models

#### Pricing Options
- **Free plugins**: No cost to users
- **One-time purchase**: Single payment for lifetime access
- **Subscription**: Monthly/yearly recurring payments
- **Freemium**: Basic features free, premium features paid
- **Pay-what-you-want**: User-determined pricing

#### Revenue Sharing
- **70/30 split**: 70% to developer, 30% to platform
- **Reduced fees**: Lower fees for established developers
- **Charity options**: Donate portion of revenue to charity
- **Corporate licensing**: Special pricing for enterprise users

## Migration Strategy

### Current System Assessment
The existing D&D 5e plugin can serve as a reference implementation:
- **Preserve game logic**: Migrate existing rules and content
- **Simplify architecture**: Remove complex abstraction layers
- **Improve performance**: Eliminate VM overhead
- **Enhance security**: Replace code execution with data-driven approach

### Migration Steps

#### Phase 1: Convert D&D 5e Plugin
1. **Extract content data**: Convert existing game data to new format
2. **Migrate templates**: Convert Handlebars to Vue components
3. **Implement rules**: Create rule definitions for game mechanics
4. **Test thoroughly**: Ensure feature parity with existing system

#### Phase 2: Create Migration Tools
1. **Data conversion**: Tools to convert existing plugins
2. **Template migration**: Automated Handlebars to Vue conversion
3. **Validation helpers**: Tools to validate migrated content
4. **Documentation**: Migration guide for plugin developers

#### Phase 3: Community Support
1. **Developer outreach**: Help existing developers migrate
2. **Training materials**: Workshops and tutorials
3. **Support channels**: Dedicated support for migration issues
4. **Incentives**: Provide incentives for early adopters

## Success Metrics

### Technical Metrics
- **Plugin performance**: Load time under 100ms
- **Security incidents**: Zero security breaches
- **System reliability**: 99.9% uptime
- **User adoption**: Plugin usage in 80% of games

### Business Metrics
- **Developer participation**: 100+ active plugin developers
- **Plugin catalog**: 500+ available plugins
- **Revenue generation**: $50k+ monthly revenue
- **User satisfaction**: 4.5+ star average rating

### Community Metrics
- **Content creation**: 50+ new plugins per month
- **User engagement**: 70% monthly active users
- **Support quality**: 24-hour response time
- **Documentation usage**: 90% of developers use official docs

## Conclusion

This hybrid plugin marketplace architecture provides a secure, scalable, and developer-friendly platform for extending Dungeon Lab's capabilities. By combining data-driven configuration with custom mechanics support, we can maintain security while providing the flexibility needed for unique game systems.

### Key Architectural Decisions

**Client-Only Architecture**: By trusting players in cooperative RPG environments, we eliminate server-side complexity while maintaining performance and flexibility.

**Custom Mechanics Support**: Rather than forcing all games into common patterns, we provide extension points for truly unique mechanics like Dread's Jenga tower or Fiasco's token system.

**Security by Design**: Compile-time security validation ensures plugins are safe without runtime overhead, while the trust-based model fits the cooperative nature of RPGs.

**Developer Experience**: The plugin SDK, hot reload development, and comprehensive documentation make it easy for the community to contribute new game systems.

### Benefits for Dungeon Lab

**Competitive Advantage**: Supporting unique game mechanics that other VTTs can't handle creates a significant moat.

**Community Growth**: A thriving plugin ecosystem drives user adoption and retention.

**Revenue Generation**: Premium plugins and content packs create sustainable revenue streams.

**Future-Proofing**: The flexible architecture can adapt to new game systems and mechanics as they emerge.

The phased implementation approach ensures we can deliver value quickly while building toward a comprehensive marketplace platform. The emphasis on developer experience and community building will be crucial for long-term success.

This architecture positions Dungeon Lab to become the leading platform for virtual tabletop gaming, with a thriving ecosystem of community-contributed content and game systems that can't be found anywhere else.