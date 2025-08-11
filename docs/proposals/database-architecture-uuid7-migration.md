# Database Architecture Migration: UUID v7 + zod-mongoose Removal

**Status**: Proposal  
**Author**: AI Assistant  
**Date**: 2025-01-09  
**Priority**: High  

## Executive Summary

This proposal outlines a migration from our current MongoDB + zod-mongoose architecture to a simplified approach using UUID v7 identifiers and direct Mongoose schemas. This change addresses critical data loss issues in zod-mongoose while simplifying our architecture and enabling client-side ID generation capabilities.

## Problem Statement

### Current Issues

1. **Silent Data Loss in zod-mongoose**
   - zod-mongoose drops optional fields with empty object defaults (`{}`)
   - Hash validation failures due to inconsistent serialization
   - Fields disappear during document round-trip operations
   - Example: `optionalEmpty: z.object({}).default({})` → field completely removed

2. **ObjectId Transformation Complexity**
   - Manual getter/setter code for every ObjectId field
   - Inconsistent handling across models
   - Complex debugging when transformations fail
   - Risk of `_id` leaking into API responses

3. **Schema Duplication and Complexity**
   - Multiple definitions required (Zod + zod-mongoose + ObjectId transformations)
   - Synchronization issues between validation layers
   - Maintenance burden for field changes

4. **Limited Client Capabilities**
   - Cannot generate IDs client-side
   - No support for offline-first patterns
   - Complex optimistic updates

## Proposed Solution

### 1. UUID v7 Primary Keys

Replace MongoDB ObjectIds with UUID v7 strings:

```typescript
// Before: Complex ObjectId handling
const campaignSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  gameMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// After: Simple string IDs
const campaignSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv7(), alias: 'id' },
  gameMasterId: { type: String, ref: 'User' }
});
```

### 2. Remove zod-mongoose Dependency

Replace zod-mongoose with simple Mongoose schemas:

```typescript
// Simple Mongoose schema with basic validation
const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },
  pluginData: { type: mongoose.Schema.Types.Mixed, default: {} },
  gameMasterId: { type: String, ref: 'User' }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret; // Clean output, no _id/id transformation needed
    }
  }
});
```

### 3. Application-Layer Validation

Use Zod for rich validation at the service layer:

```typescript
class CampaignService {
  async create(rawData: unknown) {
    // Full Zod validation with rich business rules
    const validated = campaignCreateSchema.parse(rawData);
    
    // Simple Mongoose save (pre-validated)
    const campaign = new CampaignModel(validated);
    return await campaign.save();
  }
}
```

### 4. Database-Level Validation via Mongoose

Mongoose schemas automatically provide database validation:

```typescript
// Mongoose automatically enforces these constraints at database level
const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },     // Required + length validation
  pluginId: { type: String, required: true },                 // Required validation
  pluginData: { type: mongoose.Schema.Types.Mixed, default: {} }, // Type + default validation
  gameMasterId: { type: String, ref: 'User' }                 // Type validation
});

// No additional MongoDB JSON Schema validation needed
// Mongoose handles database constraints automatically
```

### 5. Clean Object Serialization

Automatic clean serialization without transformations:

```typescript
// toJSON/toObject returns clean objects automatically
const campaign = await CampaignModel.findById(id);
const result = campaign.toJSON();
// Result: { id: "01924a32-43e2-7b80-...", name: "Campaign" }
// No _id, no __v, no manual cleaning needed
```

## Technical Specifications

### UUID v7 Implementation

```typescript
import { v7 as uuidv7 } from 'uuid';

// Base schema utility
class BaseSchema {
  static create(definition: any, options = {}) {
    return new mongoose.Schema({
      _id: { 
        type: String, 
        default: uuidv7,
        alias: 'id'
      },
      ...definition
    }, {
      timestamps: true,
      _id: false, // Disable auto ObjectId
      toJSON: {
        transform: (doc, ret) => {
          delete ret.__v;
          return ret;
        }
      },
      ...options
    });
  }
}
```

### Validation Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Request   │───▶│  Zod Validation  │───▶│ Mongoose Save   │
│ (Raw JSON)      │    │ (Rich Rules)     │    │ (Auto DB Valid) │
└─────────────────┘    └──────────────────┘    └─────────────────┘

Validation Layers:
• Zod: Complex business logic, transformations, custom rules
• Mongoose: Type safety, required fields, length limits (automatic)
```

## Benefits

### 1. Eliminates Data Loss
- No more zod-mongoose field dropping
- Consistent hash validation
- Reliable empty object preservation

### 2. Architectural Simplification
- Single ID format throughout system
- No ObjectId transformations needed
- Two-layer validation (Zod + Mongoose) instead of complex multi-layer
- Unified debugging experience
- Reduced code complexity

### 3. Client-Side Capabilities
```typescript
// Client can generate IDs for optimistic updates
const character = {
  id: uuidv7(),                    // Generated client-side
  campaignId: currentCampaign.id,  // No conversion needed
  name: "Aragorn"
};

// Immediate UI update, sync to server later
addCharacterToUI(character);
await syncToServer(character);
```

### 4. Future-Proof Architecture
- Native PostgreSQL UUID support
- Distributed system friendly
- Microservices compatible
- Time-ordered like ObjectIds

### 5. Performance Considerations
- UUID v7 is time-ordered (good indexing)
- Storage increase: ~24 bytes per document (~0.1% total)
- Client-side generation reduces server load
- Better caching (consistent IDs)

## Migration Strategy

### Phase 0: Database Backup (30 minutes) - CRITICAL
**⚠️ MUST BE COMPLETED BEFORE ANY OTHER PHASE**

1. **Full Database Backup**
   ```bash
   # Create timestamped backup
   mongodump --uri="mongodb://localhost:27017/dungeon-lab" \
     --out="./backups/pre-uuid7-migration-$(date +%Y%m%d-%H%M%S)"
   
   # Verify backup integrity
   mongorestore --dry-run --uri="mongodb://localhost:27017/test-restore" \
     ./backups/pre-uuid7-migration-*/dungeon-lab
   ```

2. **Backup Verification Checklist**
   - [ ] All collections backed up (campaigns, documents, users, assets, etc.)
   - [ ] Backup size matches expected database size
   - [ ] Test restore to temporary database succeeds
   - [ ] Document backup location and access credentials

3. **Rollback Preparation**
   ```bash
   # Create rollback script
   cat > rollback-migration.sh << 'EOF'
   #!/bin/bash
   echo "🔄 Rolling back UUID7 migration..."
   mongorestore --drop --uri="mongodb://localhost:27017/dungeon-lab" \
     ./backups/pre-uuid7-migration-TIMESTAMP/dungeon-lab
   echo "✅ Rollback complete"
   EOF
   chmod +x rollback-migration.sh
   ```

**⚠️ DO NOT PROCEED TO PHASE 1 WITHOUT VERIFIED BACKUP**

### Phase 1: Infrastructure (1-2 hours)
1. Install UUID v7 dependency
2. Create base schema utilities
3. Update TypeScript types

### Phase 2: Model Migration (2-3 hours)
1. Replace zod-mongoose schemas with simple Mongoose
2. Update core models: Campaign, GameState, Document, User, Asset
3. Remove ObjectId transformation code

### Phase 3: Service Layer (1 hour)
1. Simplify service methods (remove ObjectId handling)
2. Keep existing Zod validation
3. Test critical workflows

### Phase 4: Data Migration (1-2 hours)
```typescript
// Migration script example
async function migrateToUUID() {
  const campaigns = await CampaignModel.find({});
  const idMapping = new Map();
  
  for (const campaign of campaigns) {
    const oldId = campaign._id.toString();
    const newId = uuidv7();
    
    campaign._id = newId;
    idMapping.set(oldId, newId);
    await campaign.save();
  }
  
  // Update all references using mapping
  await updateReferences(idMapping);
}
```

### Phase 5: Client Enhancement (30 minutes)
1. Enable client-side ID generation
2. Support optimistic updates
3. Add offline-first patterns

## Risk Assessment

### Low Risk
- UUID v7 is stable and time-tested
- Simple Mongoose schemas are well-established
- Existing Zod validation remains unchanged

### Medium Risk
- Data migration requires careful coordination
- Temporary API compatibility during transition
- Need comprehensive testing of ID references

### Mitigation Strategies
1. **Full Database Backup**: Complete backup with verified restore capability (Phase 0)
2. **Gradual Migration**: Migrate model by model, not all at once
3. **Rollback Plan**: Pre-written rollback script ready to execute
4. **Testing**: Comprehensive integration tests for all ID flows
5. **Staging Environment**: Test entire migration on copy of production data

## Testing Requirements

### Unit Tests
- UUID generation and uniqueness
- Schema validation (both Zod and Mongoose)
- Model CRUD operations

### Integration Tests
- API endpoints with new IDs
- WebSocket events with UUID references
- Cross-model relationships

### Migration Tests
- Data integrity after migration
- Performance comparison
- Hash validation consistency

## Timeline

- **Day 0**: Database backup and rollback preparation (CRITICAL - 30 minutes)
- **Week 1**: Infrastructure setup and base utilities
- **Week 2**: Core model migration (Campaign, GameState, Document)
- **Week 3**: Supporting model migration (User, Asset, etc.)
- **Week 4**: Data migration and client enhancements
- **Week 5**: Testing and optimization

**Note**: Backup must be completed and verified before any development work begins.

## Alternatives Considered

### 1. Keep ObjectIds, Fix zod-mongoose
**Rejected**: zod-mongoose fundamental issues too complex to resolve

### 2. Pure MongoDB Driver (No Mongoose)
**Rejected**: Too much existing Mongoose code to replace

### 3. UUID v4 (Random UUIDs)
**Rejected**: UUID v7 time-ordering provides better indexing

### 4. Custom String IDs
**Rejected**: UUID v7 is standardized and well-supported

## Success Metrics

1. **Zero data loss** in field preservation tests
2. **Consistent hash validation** across all operations
3. **Simplified codebase** (reduced lines of transformation code)
4. **Client-side ID generation** working in production
5. **Performance maintained** (no significant degradation)

## Conclusion

Migrating to UUID v7 + simplified Mongoose schemas addresses our critical zod-mongoose data loss issues while providing significant architectural improvements. The ability to generate IDs client-side opens up new possibilities for offline-first and optimistic update patterns.

The migration is low-risk with high reward, positioning us for future scalability and potential database migrations while immediately solving our current problems.

**Recommendation**: Proceed with implementation, starting with Phase 1 infrastructure setup.