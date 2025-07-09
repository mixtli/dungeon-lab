# Permission and Rules System Architecture

## Overview

This document describes the comprehensive permission and rules handling system for DungeonLab. The system separates **static access control** (permissions) from **dynamic game rules** validation, providing a consistent and extensible framework for managing user actions across the application.

## Current State Analysis

### Existing Issues

1. **Scattered Permission Checks**: Permission logic is spread across services, controllers, and socket handlers
2. **Inconsistent Patterns**: Different areas use different approaches to authorization
3. **Minimal Rules Engine**: Game-specific rules are mostly placeholder implementations
4. **Poor Error Handling**: Inconsistent error responses for permission/rule violations
5. **Plugin Limitations**: No clear way for plugins to contribute permissions or rules

### Current Implementation Locations

- **Services**: `checkUserPermission` methods in various service classes
- **Socket Handlers**: Ad-hoc permission checks in WebSocket event handlers
- **Controllers**: Basic authentication middleware with limited authorization
- **Encounters**: `EncounterPermissionValidator` class (partial implementation)

## Proposed Architecture

### Core Concepts

1. **Static Permissions**: User access rights that depend on relatively stable data (ownership, roles, membership)
2. **Dynamic Rules**: Game-specific logic that depends on current game state (turn order, action points, spell slots)
3. **Policy-Based Authorization**: Centralized permission logic organized by resource type
4. **Rules Engine**: Pluggable system for evaluating game-specific constraints
5. **Unified Validation**: Consistent patterns for checking both permissions and rules

### Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │  Server Side    │    │   Plugin Side   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Permission Store│    │ Policy Registry │    │ Custom Policies │
│ Error Handling  │    │ Rules Engine    │    │ Game Rules      │
│ UI State Mgmt   │    │ Middleware      │    │ Validators      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Unified Handler │
                    │   Framework     │
                    └─────────────────┘
```

## Implementation Details

### 1. Policy-Based Authorization

#### Base Policy Interface

```typescript
// packages/shared/src/policies/base-policy.mts
export interface PolicyContext {
  user: IUser;
  resource: unknown;
  action: string;
  metadata?: Record<string, unknown>;
}

export abstract class BasePolicy {
  abstract name: string;
  abstract resourceType: string;
  
  /**
   * Check if user can perform action on resource
   */
  abstract can(context: PolicyContext): Promise<boolean>;
  
  /**
   * Validate permission and throw error if denied
   */
  async validate(context: PolicyContext): Promise<void> {
    const allowed = await this.can(context);
    if (!allowed) {
      throw new PermissionError(
        `User ${context.user.id} cannot ${context.action} ${this.resourceType}`,
        { 
          userId: context.user.id,
          action: context.action,
          resourceType: this.resourceType
        }
      );
    }
  }
  
  /**
   * Get user permissions for resource (for UI state management)
   */
  abstract getPermissions(user: IUser, resource: unknown): Promise<Record<string, boolean>>;
}
```

#### Example Policy Implementation

```typescript
// packages/server/src/policies/encounter-policy.mts
export class EncounterPolicy extends BasePolicy {
  name = 'encounter';
  resourceType = 'encounter';
  
  async can(context: PolicyContext): Promise<boolean> {
    const { user, action, resource } = context;
    const encounter = resource as IEncounter;
    
    switch (action) {
      case 'view':
        return this.canViewEncounter(user, encounter);
      case 'modify':
        return this.canModifyEncounter(user, encounter);
      case 'control_token':
        const tokenId = context.metadata?.tokenId as string;
        return this.canControlToken(user, encounter, tokenId);
      case 'delete':
        return this.canDeleteEncounter(user, encounter);
      default:
        return false;
    }
  }
  
  async getPermissions(user: IUser, resource: unknown): Promise<Record<string, boolean>> {
    const encounter = resource as IEncounter;
    
    return {
      canView: await this.canViewEncounter(user, encounter),
      canModify: await this.canModifyEncounter(user, encounter),
      canDelete: await this.canDeleteEncounter(user, encounter),
    };
  }
  
  private async canViewEncounter(user: IUser, encounter: IEncounter): Promise<boolean> {
    if (user.isAdmin) return true;
    
    // Get campaign and check membership
    const campaign = await CampaignModel.findById(encounter.campaignId);
    if (!campaign) return false;
    
    // GM can always view
    if (campaign.gameMasterId?.toString() === user.id) return true;
    
    // Check if user is campaign member
    return this.isUserCampaignMember(user.id, campaign);
  }
  
  private async canModifyEncounter(user: IUser, encounter: IEncounter): Promise<boolean> {
    if (user.isAdmin) return true;
    
    const campaign = await CampaignModel.findById(encounter.campaignId);
    if (!campaign) return false;
    
    // Only GM can modify encounters
    return campaign.gameMasterId?.toString() === user.id;
  }
  
  private async canControlToken(user: IUser, encounter: IEncounter, tokenId: string): Promise<boolean> {
    if (user.isAdmin) return true;
    
    // GM can control any token
    if (await this.canModifyEncounter(user, encounter)) return true;
    
    // Players can control their own tokens
    const token = await TokenModel.findById(tokenId);
    if (!token || !token.actorId) return false;
    
    const actor = await ActorModel.findById(token.actorId);
    return actor?.createdBy?.toString() === user.id;
  }
}
```

### 2. Rules Engine

#### Core Rules Engine

```typescript
// packages/shared/src/rules/rules-engine.mts
export interface GameRule {
  name: string;
  description: string;
  category: 'movement' | 'combat' | 'spells' | 'general';
  priority: number; // Lower numbers execute first
  
  evaluate(context: RuleContext): Promise<RuleResult>;
}

export interface RuleContext {
  user: IUser;
  encounter: IEncounter;
  token?: IToken;
  action?: CombatAction;
  gameState?: Record<string, unknown>;
  pluginId?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleResult {
  allowed: boolean;
  reason?: string;
  modifications?: Record<string, unknown>;
  cost?: Record<string, number>; // Action points, spell slots, etc.
}

export class RulesEngine {
  private rules: Map<string, GameRule> = new Map();
  private rulesByCategory: Map<string, GameRule[]> = new Map();
  
  registerRule(rule: GameRule): void {
    this.rules.set(rule.name, rule);
    
    // Add to category index
    const categoryRules = this.rulesByCategory.get(rule.category) || [];
    categoryRules.push(rule);
    categoryRules.sort((a, b) => a.priority - b.priority);
    this.rulesByCategory.set(rule.category, categoryRules);
  }
  
  async evaluateRule(ruleName: string, context: RuleContext): Promise<RuleResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new RuleError(`Rule ${ruleName} not found`);
    }
    
    try {
      return await rule.evaluate(context);
    } catch (error) {
      throw new RuleError(`Rule ${ruleName} evaluation failed: ${error.message}`);
    }
  }
  
  async evaluateCategory(category: string, context: RuleContext): Promise<RuleResult[]> {
    const categoryRules = this.rulesByCategory.get(category) || [];
    const results: RuleResult[] = [];
    
    for (const rule of categoryRules) {
      const result = await rule.evaluate(context);
      results.push(result);
      
      // Stop on first disallowed rule
      if (!result.allowed) {
        break;
      }
    }
    
    return results;
  }
  
  async evaluateAll(ruleNames: string[], context: RuleContext): Promise<RuleResult[]> {
    return Promise.all(ruleNames.map(name => this.evaluateRule(name, context)));
  }
}
```

#### Example Game Rule Implementation

```typescript
// packages/plugins/dnd-5e-2024/src/server/rules/turn-order-rule.mts
export class TurnOrderRule implements GameRule {
  name = 'dnd5e-turn-order';
  description = 'Validates if it is the user\'s turn to act';
  category = 'combat';
  priority = 1; // High priority - check this first
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { user, encounter, token, action } = context;
    
    // Only apply during active encounters
    if (encounter.status !== 'active') {
      return { allowed: true };
    }
    
    // Check if initiative is being tracked
    if (!encounter.initiative?.order?.length) {
      return { allowed: true, reason: 'No initiative order established' };
    }
    
    const currentTurn = encounter.initiative.currentTurn;
    if (!currentTurn) {
      return { allowed: false, reason: 'No active turn' };
    }
    
    // GM can always act
    const campaign = await CampaignModel.findById(encounter.campaignId);
    if (campaign?.gameMasterId?.toString() === user.id) {
      return { allowed: true };
    }
    
    // Check if user controls the current token
    if (!token) {
      return { allowed: false, reason: 'No token specified' };
    }
    
    if (token.id !== currentTurn.tokenId) {
      return { 
        allowed: false, 
        reason: `Not your turn. Current turn: ${currentTurn.name}` 
      };
    }
    
    // Check action economy (bonus actions, reactions, etc.)
    return this.validateActionEconomy(action, currentTurn);
  }
  
  private validateActionEconomy(action: CombatAction, turn: InitiativeTurn): RuleResult {
    if (!action) return { allowed: true };
    
    switch (action.category) {
      case 'action':
        if (turn.actionsUsed.action) {
          return { allowed: false, reason: 'Action already used this turn' };
        }
        break;
        
      case 'bonus':
        if (turn.actionsUsed.bonusAction) {
          return { allowed: false, reason: 'Bonus action already used this turn' };
        }
        break;
        
      case 'reaction':
        if (turn.actionsUsed.reaction) {
          return { allowed: false, reason: 'Reaction already used this round' };
        }
        break;
        
      case 'free':
        // Free actions are generally always allowed
        break;
        
      default:
        return { allowed: false, reason: `Unknown action category: ${action.category}` };
    }
    
    return { 
      allowed: true,
      cost: { [action.category]: 1 }
    };
  }
}
```

### 3. Unified Validation Middleware

#### REST API Middleware

```typescript
// packages/server/src/middleware/permission-rules.middleware.mts
export interface ValidationConfig {
  policy: string;
  action: string;
  resourceExtractor: (req: Request) => Promise<unknown>;
  rules?: string[];
  skipRules?: boolean;
  context?: (req: Request) => Record<string, unknown>;
}

export function validatePermissionsAndRules(config: ValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // 1. Extract resource
      const resource = await config.resourceExtractor(req);
      
      // 2. Check static permissions via policy
      const policy = policyRegistry.getPolicy(config.policy);
      const context = config.context ? config.context(req) : {};
      
      await policy.validate({
        user,
        resource,
        action: config.action,
        metadata: context
      });
      
      // 3. Check dynamic rules if specified
      if (!config.skipRules && config.rules && config.rules.length > 0) {
        const ruleContext: RuleContext = {
          user,
          encounter: resource as IEncounter,
          metadata: context
        };
        
        const results = await rulesEngine.evaluateAll(config.rules, ruleContext);
        const disallowed = results.find(r => !r.allowed);
        
        if (disallowed) {
          return res.status(400).json({
            success: false,
            error: disallowed.reason || 'Rule violation',
            code: 'RULE_VIOLATION',
            rule: disallowed.reason
          });
        }
      }
      
      // Store validation results for handler use
      req.validationContext = {
        user,
        resource,
        permissions: await policy.getPermissions(user, resource)
      };
      
      next();
    } catch (error) {
      if (error instanceof PermissionError) {
        return res.status(403).json({ 
          success: false, 
          error: error.message,
          code: 'PERMISSION_DENIED',
          details: error.details
        });
      }
      
      if (error instanceof RuleError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: 'RULE_ERROR'
        });
      }
      
      next(error);
    }
  };
}
```

#### WebSocket Handler Base Class

```typescript
// packages/server/src/websocket/handlers/base-handler.mts
export interface HandlerContext {
  socket: AuthenticatedSocket;
  user: IUser;
  permissions?: Record<string, boolean>;
}

export abstract class BaseSocketHandler {
  protected async validateAndExecute<T>(
    socket: AuthenticatedSocket,
    data: T,
    config: {
      policy: string;
      action: string;
      resourceExtractor: (data: T) => Promise<unknown>;
      rules?: string[];
      rateLimitKey?: string;
      context?: (data: T) => Record<string, unknown>;
    },
    executor: (data: T, context: HandlerContext) => Promise<void>
  ): Promise<void> {
    try {
      const user = socket.user;
      if (!user) {
        this.emitError(socket, 'Authentication required', 'AUTH_REQUIRED');
        return;
      }
      
      // 1. Rate limiting
      if (config.rateLimitKey && this.isRateLimited(socket.userId, config.rateLimitKey)) {
        this.emitError(socket, 'Rate limit exceeded', 'RATE_LIMIT');
        return;
      }
      
      // 2. Extract resource
      const resource = await config.resourceExtractor(data);
      
      // 3. Permission validation
      const policy = policyRegistry.getPolicy(config.policy);
      const metadata = config.context ? config.context(data) : {};
      
      await policy.validate({
        user,
        resource,
        action: config.action,
        metadata
      });
      
      // 4. Rules validation
      if (config.rules && config.rules.length > 0) {
        const ruleContext: RuleContext = {
          user,
          encounter: resource as IEncounter,
          metadata
        };
        
        const results = await rulesEngine.evaluateAll(config.rules, ruleContext);
        const disallowed = results.find(r => !r.allowed);
        
        if (disallowed) {
          this.emitError(socket, disallowed.reason || 'Rule violation', 'RULE_VIOLATION');
          return;
        }
      }
      
      // 5. Get permissions for context
      const permissions = await policy.getPermissions(user, resource);
      
      // 6. Execute the action
      await executor(data, { socket, user, permissions });
      
    } catch (error) {
      this.handleError(socket, error);
    }
  }
  
  protected emitError(socket: AuthenticatedSocket, message: string, code?: string): void {
    socket.emit('error', {
      error: message,
      code,
      timestamp: new Date()
    });
  }
  
  protected handleError(socket: AuthenticatedSocket, error: unknown): void {
    if (error instanceof PermissionError) {
      this.emitError(socket, error.message, 'PERMISSION_DENIED');
    } else if (error instanceof RuleError) {
      this.emitError(socket, error.message, 'RULE_ERROR');
    } else {
      console.error('Unexpected handler error:', error);
      this.emitError(socket, 'Internal server error', 'INTERNAL_ERROR');
    }
  }
  
  protected isRateLimited(userId: string, key: string): boolean {
    // Implementation depends on existing rate limiting system
    return false;
  }
}
```

## Usage Examples

### 1. REST API Endpoint

```typescript
// packages/server/src/features/encounters/routes.mts
router.put('/encounters/:id/tokens/:tokenId', 
  validatePermissionsAndRules({
    policy: 'encounter',
    action: 'control_token',
    resourceExtractor: async (req) => {
      return await EncounterModel.findById(req.params.id);
    },
    rules: ['dnd5e-turn-order', 'dnd5e-movement-range'],
    context: (req) => ({ tokenId: req.params.tokenId })
  }),
  encounterController.updateToken
);
```

### 2. WebSocket Handler

```typescript
// packages/server/src/features/encounters/websocket/encounter-handler.mts
export class EncounterHandler extends BaseSocketHandler {
  async handleTokenMove(socket: AuthenticatedSocket, data: TokenMove): Promise<void> {
    await this.validateAndExecute(
      socket,
      data,
      {
        policy: 'encounter',
        action: 'control_token',
        resourceExtractor: async (data) => {
          return await EncounterModel.findById(data.encounterId);
        },
        rules: ['dnd5e-turn-order', 'dnd5e-movement-range'],
        rateLimitKey: 'tokenMove',
        context: (data) => ({ 
          tokenId: data.tokenId,
          position: data.position 
        })
      },
      async (data, context) => {
        // Execute token movement
        await encounterService.moveToken(
          data.encounterId, 
          data.tokenId, 
          data.position, 
          context.user.id
        );
        
        // Broadcast to session
        const moveEvent: TokenMoved = {
          encounterId: data.encounterId,
          tokenId: data.tokenId,
          position: data.position,
          userId: context.user.id,
          timestamp: new Date()
        };
        
        context.socket.to(`session:${data.sessionId}`).emit('token:moved', moveEvent);
        context.socket.emit('token:moved', moveEvent);
      }
    );
  }
}
```

### 3. Plugin Rule Registration

```typescript
// packages/plugins/dnd-5e-2024/src/server/index.mts
export class DnD5e2024ServerPlugin extends ServerPlugin {
  registerRules(engine: RulesEngine): void {
    // Core turn-based rules
    engine.registerRule(new TurnOrderRule());
    engine.registerRule(new ActionEconomyRule());
    engine.registerRule(new MovementRangeRule());
    
    // Spell system rules
    engine.registerRule(new SpellSlotRule());
    engine.registerRule(new SpellRangeRule());
    engine.registerRule(new ConcentrationRule());
    
    // Combat rules
    engine.registerRule(new OpportunityAttackRule());
    engine.registerRule(new RangedAttackRule());
  }
  
  registerPolicies(registry: PolicyRegistry): void {
    // Plugin-specific policies if needed
    registry.registerPolicy(new SpellbookPolicy());
  }
}
```

## Client-Side Integration

### 1. Permission Store

```typescript
// packages/web/src/stores/permissions.store.mts
export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<Record<string, Record<string, boolean>>>({});
  const loading = ref(false);
  const errors = ref<PermissionError[]>([]);
  
  /**
   * Get permissions for a specific resource
   */
  async function getResourcePermissions(
    resourceType: string, 
    resourceId: string
  ): Promise<Record<string, boolean>> {
    const key = `${resourceType}:${resourceId}`;
    
    if (permissions.value[key]) {
      return permissions.value[key];
    }
    
    try {
      loading.value = true;
      const response = await api.get(`/api/permissions/${resourceType}/${resourceId}`);
      
      if (response.data.success) {
        permissions.value[key] = response.data.data.permissions;
        return permissions.value[key];
      }
      
      throw new Error(response.data.error || 'Failed to get permissions');
    } catch (error) {
      console.error('Permission check failed:', error);
      errors.value.push({
        resourceType,
        resourceId,
        error: error.message,
        timestamp: new Date()
      });
      return {};
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Check specific permission
   */
  function can(
    resourceType: string, 
    resourceId: string, 
    action: string
  ): boolean {
    const key = `${resourceType}:${resourceId}`;
    const resourcePermissions = permissions.value[key];
    
    if (!resourcePermissions) {
      // If permissions not loaded, default to false
      return false;
    }
    
    return resourcePermissions[`can${capitalize(action)}`] || false;
  }
  
  /**
   * Clear permissions for resource
   */
  function clearPermissions(resourceType: string, resourceId: string): void {
    const key = `${resourceType}:${resourceId}`;
    delete permissions.value[key];
  }
  
  /**
   * Handle permission errors from API/WebSocket
   */
  function handlePermissionError(error: PermissionError): void {
    errors.value.push({
      ...error,
      timestamp: new Date()
    });
    
    // Show user-friendly notification
    useNotifications().error(
      'Permission Denied', 
      error.message || 'You do not have permission to perform this action'
    );
  }
  
  return {
    permissions: readonly(permissions),
    loading: readonly(loading),
    errors: readonly(errors),
    getResourcePermissions,
    can,
    clearPermissions,
    handlePermissionError
  };
});
```

### 2. Error Handling in Components

```vue
<!-- packages/web/src/components/encounter/TokenContextMenu.vue -->
<template>
  <div class="token-context-menu">
    <button 
      v-if="canMoveToken"
      @click="moveToken"
      :disabled="!canAct"
      class="menu-item"
    >
      Move Token
    </button>
    
    <button 
      v-if="canAttack"
      @click="attack"
      :disabled="!canAct || !isPlayerTurn"
      class="menu-item"
    >
      Attack
    </button>
    
    <!-- Show rule violation reasons -->
    <div v-if="ruleViolations.length > 0" class="rule-violations">
      <h4>Cannot Act:</h4>
      <ul>
        <li v-for="violation in ruleViolations" :key="violation.rule">
          {{ violation.reason }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePermissionsStore } from '../../stores/permissions.store.mjs';
import { useEncounterStore } from '../../stores/encounter.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';

const props = defineProps<{
  token: IToken;
  encounter: IEncounter;
}>();

const permissionsStore = usePermissionsStore();
const encounterStore = useEncounterStore();
const socketStore = useSocketStore();

const ruleViolations = ref<RuleViolation[]>([]);

// Permission checks
const canMoveToken = computed(() => 
  permissionsStore.can('encounter', props.encounter.id, 'control_token')
);

const canAttack = computed(() => 
  permissionsStore.can('encounter', props.encounter.id, 'control_token')
);

// Rule checks
const canAct = computed(() => ruleViolations.value.length === 0);

const isPlayerTurn = computed(() => {
  const currentTurn = props.encounter.initiative?.currentTurn;
  return currentTurn?.tokenId === props.token.id;
});

// Actions
async function moveToken(): Promise<void> {
  try {
    // This will be validated on the server
    socketStore.emit('token:move', {
      sessionId: encounterStore.currentSessionId,
      encounterId: props.encounter.id,
      tokenId: props.token.id,
      position: { x: 100, y: 100 } // Example position
    });
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      permissionsStore.handlePermissionError(error);
    } else if (error.code === 'RULE_VIOLATION') {
      handleRuleViolation(error);
    } else {
      console.error('Move token failed:', error);
    }
  }
}

async function attack(): Promise<void> {
  try {
    socketStore.emit('combat:action', {
      sessionId: encounterStore.currentSessionId,
      encounterId: props.encounter.id,
      action: {
        type: 'attack',
        category: 'action',
        tokenId: props.token.id,
        targets: [] // Would be filled by target selection
      }
    });
  } catch (error) {
    if (error.code === 'RULE_VIOLATION') {
      handleRuleViolation(error);
    } else {
      console.error('Attack failed:', error);
    }
  }
}

function handleRuleViolation(error: RuleError): void {
  ruleViolations.value.push({
    rule: error.rule || 'unknown',
    reason: error.message,
    timestamp: new Date()
  });
  
  // Show notification
  useNotifications().warning(
    'Action Not Allowed',
    error.message || 'This action violates game rules'
  );
}

// Check rules when component mounts or turn changes
watchEffect(async () => {
  if (props.encounter.status === 'active') {
    try {
      // Client-side rule preview (optional)
      const response = await api.post('/api/rules/validate', {
        encounterId: props.encounter.id,
        tokenId: props.token.id,
        rules: ['dnd5e-turn-order', 'dnd5e-action-economy']
      });
      
      if (!response.data.success) {
        ruleViolations.value = response.data.violations || [];
      } else {
        ruleViolations.value = [];
      }
    } catch (error) {
      console.warn('Rule preview failed:', error);
    }
  }
});
</script>
```

### 3. Reactive Permission Updates

```typescript
// packages/web/src/composables/usePermissions.mts
export function usePermissions(resourceType: string, resourceId: string) {
  const permissionsStore = usePermissionsStore();
  const socketStore = useSocketStore();
  
  // Reactive permissions
  const permissions = computed(() => 
    permissionsStore.permissions[`${resourceType}:${resourceId}`] || {}
  );
  
  // Load permissions on mount
  onMounted(async () => {
    await permissionsStore.getResourcePermissions(resourceType, resourceId);
  });
  
  // Listen for permission updates via WebSocket
  watchEffect(() => {
    if (socketStore.socket) {
      socketStore.socket.on('permissions:updated', (data) => {
        if (data.resourceType === resourceType && data.resourceId === resourceId) {
          permissionsStore.permissions[`${resourceType}:${resourceId}`] = data.permissions;
        }
      });
    }
  });
  
  // Helper functions
  const can = (action: string) => 
    permissions.value[`can${capitalize(action)}`] || false;
  
  const cannot = (action: string) => !can(action);
  
  const anyOf = (actions: string[]) => 
    actions.some(action => can(action));
  
  const allOf = (actions: string[]) => 
    actions.every(action => can(action));
  
  return {
    permissions,
    can,
    cannot,
    anyOf,
    allOf,
    loading: permissionsStore.loading
  };
}
```

## Error Types and Handling

### Error Definitions

```typescript
// packages/shared/src/errors/index.mts
export class PermissionError extends Error {
  code = 'PERMISSION_DENIED';
  statusCode = 403;
  
  constructor(
    message: string, 
    public details?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
    }
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class RuleError extends Error {
  code = 'RULE_ERROR';
  statusCode = 400;
  
  constructor(message: string, public rule?: string) {
    super(message);
    this.name = 'RuleError';
  }
}

export class RuleViolationError extends RuleError {
  code = 'RULE_VIOLATION';
  
  constructor(message: string, rule?: string, public cost?: Record<string, number>) {
    super(message, rule);
    this.name = 'RuleViolationError';
  }
}
```

### Client-Side Error Handling

```typescript
// packages/web/src/utils/error-handlers.mts
export function handleApiError(error: ApiError): void {
  const notifications = useNotifications();
  
  switch (error.code) {
    case 'PERMISSION_DENIED':
      notifications.error(
        'Permission Denied',
        'You do not have permission to perform this action'
      );
      
      // Refresh permissions in case they changed
      const permissionsStore = usePermissionsStore();
      if (error.details?.resourceType && error.details?.resourceId) {
        permissionsStore.clearPermissions(
          error.details.resourceType, 
          error.details.resourceId
        );
      }
      break;
      
    case 'RULE_VIOLATION':
      notifications.warning(
        'Action Not Allowed',
        error.message || 'This action violates game rules'
      );
      break;
      
    case 'RULE_ERROR':
      notifications.error(
        'Rule System Error',
        'There was an error processing game rules. Please try again.'
      );
      break;
      
    case 'RATE_LIMIT':
      notifications.warning(
        'Too Many Requests',
        'Please wait a moment before trying again'
      );
      break;
      
    default:
      notifications.error(
        'Error',
        error.message || 'An unexpected error occurred'
      );
  }
}

export function handleSocketError(error: SocketError): void {
  console.error('Socket error:', error);
  handleApiError(error);
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. **Create base classes and interfaces**
   - `BasePolicy` abstract class
   - `RulesEngine` core implementation
   - Error types and handling
   - Policy and rules registries

2. **Implement first policy**
   - `EncounterPolicy` as reference implementation
   - Replace existing `EncounterPermissionValidator`
   - Update one or two key endpoints

### Phase 2: Socket Integration (Week 3-4)

1. **Create `BaseSocketHandler`**
   - Unified validation pattern
   - Error handling improvements
   - Rate limiting integration

2. **Migrate encounter socket handlers**
   - Token movement handlers
   - Basic action handlers
   - Update client error handling

### Phase 3: Rules Engine (Week 5-6)

1. **Implement core D&D 5e rules**
   - Turn order validation
   - Action economy rules
   - Movement range validation

2. **Plugin integration**
   - Plugin registration system
   - Rule loading and initialization
   - Testing with D&D 5e plugin

### Phase 4: Client-Side Polish (Week 7-8)

1. **Permission store and composables**
   - Reactive permission management
   - Client-side rule previews
   - UI state management

2. **Enhanced error handling**
   - User-friendly error messages
   - Permission violation recovery
   - Rule violation explanations

## Benefits

### For Developers

1. **Consistency**: Same patterns everywhere
2. **Maintainability**: Centralized logic is easier to update
3. **Testing**: Policies and rules can be tested in isolation
4. **Documentation**: Clear separation of concerns

### For Users

1. **Clarity**: Consistent error messages and feedback
2. **Transparency**: Clear explanations of why actions are denied
3. **Responsiveness**: Client-side validation for immediate feedback
4. **Reliability**: Robust server-side validation prevents exploits

### For Game Systems

1. **Extensibility**: Easy to add new rules and permissions
2. **Flexibility**: Plugin-specific policies and rules
3. **Performance**: Optimized rule evaluation and caching
4. **Compatibility**: Works with any game system that implements the interfaces

## Conclusion

This permission and rules system provides a robust, extensible foundation for managing user actions in DungeonLab. By separating static permissions from dynamic rules and providing consistent patterns across the application, we can ensure both security and gameplay integrity while maintaining a good developer and user experience.

The phased migration approach allows for gradual adoption without disrupting existing functionality, while the plugin integration ensures that the system can grow to support multiple game systems and custom rules as needed. 