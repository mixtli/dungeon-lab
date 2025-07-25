# Database Architecture Decision: PostgreSQL vs MongoDB for Plugin-Agnostic Documents

## Executive Summary

This document analyzes two database approaches for Dungeon Lab's plugin-agnostic Document architecture: PostgreSQL-only vs MongoDB-only. The analysis considers the three-tier document hierarchy (Base Document → Core Types → Plugin Types), plugin development experience, query capabilities, and operational requirements.

### Core Requirements

1. **Plugin Agnosticism**: Support arbitrary game systems without hardcoded assumptions
2. **Document Hierarchy**: Base Document with universal types (Actor, Item) and plugin-specific types (Class, Background)
3. **Flexible Schema**: Plugin-controlled data structures without server-side schema changes
4. **Cross-Document Relationships**: Actors with their items, classes with prerequisites, etc.
5. **Real-Time Performance**: Support GM-authoritative state management with sub-second updates

## Document Hierarchy Understanding

```typescript
// Three-tier inheritance hierarchy
interface BaseDocument {
  id: string;
  campaignId: string;
  name: string;
  
  // Document classification
  documentType?: 'Actor' | 'Item';  // Universal types (null for plugin-specific)
  pluginType: string;               // e.g., 'dnd5e:fighter', 'shadowrun:gear'
  
  // Plugin-controlled data
  data: Record<string, unknown>;
  computedData?: Record<string, unknown>;
  
  // System fields
  createdBy: string;
  ownerUserId?: string;
  permissions: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// Examples of the hierarchy:
// Actor (universal) → dnd5e:character, shadowrun:runner
// Item (universal) → dnd5e:weapon, cyberpunk:cyberware  
// Class (plugin-specific) → dnd5e:fighter, pathfinder:paladin
// Background (plugin-specific) → dnd5e:criminal, dnd5e:noble
```

## PostgreSQL-Only Approach

### Schema Design

```sql
-- Unified documents table with Document inheritance
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Document classification
  document_type TEXT,     -- 'Actor', 'Item' for universal types, NULL for plugin-specific
  plugin_type TEXT NOT NULL,  -- 'dnd5e:fighter', 'shadowrun:street_samurai', etc.
  
  -- Universal fields
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  owner_user_id UUID,
  
  -- Plugin-controlled data (all game-specific logic here)
  data JSONB NOT NULL DEFAULT '{}',
  computed_data JSONB DEFAULT '{}',
  
  -- System metadata
  metadata JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{}',
  
  -- Full-text search across name and plugin data
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      name || ' ' || 
      plugin_type || ' ' ||
      COALESCE(data->>'description', '') || ' ' ||
      COALESCE(jsonb_path_query_array(data, '$.**.name ? (@ != null)')::text, '')
    )
  ) STORED,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document relationships (items owned by actors, class prerequisites, etc.)
CREATE TABLE document_relationships (
  id UUID PRIMARY KEY,
  source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'owns', 'equipped', 'prerequisite', 'component'
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(source_document_id, target_document_id, relationship_type)
);

-- Optimized indexes for plugin queries
CREATE INDEX idx_documents_campaign_type ON documents(campaign_id, document_type);
CREATE INDEX idx_documents_plugin_type ON documents(plugin_type);
CREATE INDEX idx_documents_owner ON documents(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);
CREATE INDEX idx_documents_data ON documents USING GIN (data);
CREATE INDEX idx_documents_computed ON documents USING GIN (computed_data);

-- Specialized indexes for common plugin queries
CREATE INDEX idx_documents_level ON documents USING GIN ((data->'level')) WHERE data->'level' IS NOT NULL;
CREATE INDEX idx_documents_rarity ON documents USING GIN ((data->'rarity')) WHERE data->'rarity' IS NOT NULL;
CREATE INDEX idx_documents_tags ON documents USING GIN ((data->'tags')) WHERE data->'tags' IS NOT NULL;

-- Relationship indexes
CREATE INDEX idx_relationships_source ON document_relationships(source_document_id, relationship_type);
CREATE INDEX idx_relationships_target ON document_relationships(target_document_id, relationship_type);
```

### Plugin Integration Pattern

```typescript
// PostgreSQL plugin API
class PostgreSQLDocumentService {
  // Plugin-friendly query builder
  async findDocuments(query: PluginDocumentQuery): Promise<Document[]> {
    let sql = `
      SELECT d.*, array_agg(
        jsonb_build_object(
          'id', r.target_document_id,
          'type', r.relationship_type,
          'metadata', r.metadata
        )
      ) FILTER (WHERE r.id IS NOT NULL) as relationships
      FROM documents d
      LEFT JOIN document_relationships r ON r.source_document_id = d.id
      WHERE d.campaign_id = $1
    `;
    
    const params = [query.campaignId];
    let paramIndex = 2;
    
    // Plugin type filtering
    if (query.pluginTypes) {
      sql += ` AND d.plugin_type = ANY($${paramIndex})`;
      params.push(query.pluginTypes);
      paramIndex++;
    }
    
    // JSONB queries for plugin data
    if (query.dataFilters) {
      for (const [path, value] of Object.entries(query.dataFilters)) {
        sql += ` AND d.data->'${path}' = $${paramIndex}`;
        params.push(JSON.stringify(value));
        paramIndex++;
      }
    }
    
    // Complex JSONB queries
    if (query.complexFilters) {
      for (const filter of query.complexFilters) {
        sql += ` AND ${this.buildJSONBFilter(filter, paramIndex)}`;
        params.push(...filter.params);
        paramIndex += filter.params.length;
      }
    }
    
    sql += ` GROUP BY d.id ORDER BY d.name`;
    
    const result = await postgres.query(sql, params);
    return result.rows.map(row => this.hydrateDocument(row));
  }
  
  // Plugin data update with type safety
  async updateDocument(id: string, updates: PluginDocumentUpdate): Promise<Document> {
    const updateFields = [];
    const params = [id];
    let paramIndex = 2;
    
    if (updates.name) {
      updateFields.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }
    
    if (updates.data) {
      // Merge with existing data to avoid overwrites
      updateFields.push(`data = data || $${paramIndex}::jsonb`);
      params.push(JSON.stringify(updates.data));
      paramIndex++;
    }
    
    if (updates.computedData) {
      updateFields.push(`computed_data = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(updates.computedData));
      paramIndex++;
    }
    
    const sql = `
      UPDATE documents 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await postgres.query(sql, params);
    return this.hydrateDocument(result.rows[0]);
  }
  
  // Complex relationship queries
  async findActorsWithEquippedItems(campaignId: string): Promise<ActorWithItems[]> {
    const result = await postgres.query(`
      SELECT 
        actor.id as actor_id,
        actor.name as actor_name,
        actor.data as actor_data,
        jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'name', item.name,
            'data', item.data,
            'equipped', rel.metadata->'equipped'
          )
        ) FILTER (WHERE item.id IS NOT NULL) as items
      FROM documents actor
      LEFT JOIN document_relationships rel ON rel.source_document_id = actor.id 
        AND rel.relationship_type = 'owns'
      LEFT JOIN documents item ON item.id = rel.target_document_id
        AND item.document_type = 'Item'
      WHERE actor.campaign_id = $1 
        AND actor.document_type = 'Actor'
      GROUP BY actor.id, actor.name, actor.data
      ORDER BY actor.name
    `, [campaignId]);
    
    return result.rows.map(row => ({
      actor: {
        id: row.actor_id,
        name: row.actor_name,
        data: row.actor_data
      },
      items: row.items || []
    }));
  }
}
```

### Complex Query Examples

```sql
-- Find all D&D 5e Fighters above level 5 with their equipped weapons
SELECT 
  f.name as fighter_name,
  f.data->'level' as level,
  jsonb_agg(
    jsonb_build_object(
      'name', w.name,
      'damage', w.data->'damage',
      'equipped', rel.metadata->'equipped'
    )
  ) FILTER (WHERE w.id IS NOT NULL) as weapons
FROM documents f
LEFT JOIN document_relationships rel ON rel.source_document_id = f.id 
  AND rel.relationship_type = 'owns'
LEFT JOIN documents w ON w.id = rel.target_document_id 
  AND w.plugin_type LIKE 'dnd5e:weapon%'
  AND rel.metadata->'equipped' = 'true'
WHERE f.campaign_id = $1
  AND f.plugin_type = 'dnd5e:character'
  AND (f.data->'classes'->0->>'name' = 'Fighter' OR f.data->>'class' = 'Fighter')
  AND (f.data->'level')::int > 5
GROUP BY f.id, f.name, f.data->'level'
ORDER BY (f.data->'level')::int DESC;

-- Full-text search across all documents with ranking
SELECT 
  d.name,
  d.plugin_type,
  d.document_type,
  ts_rank(d.search_vector, query) as relevance,
  ts_headline('english', d.data->>'description', query) as snippet
FROM documents d, plainto_tsquery('english', $2) query
WHERE d.campaign_id = $1 
  AND d.search_vector @@ query
ORDER BY relevance DESC, d.name
LIMIT 20;

-- Find spell prerequisites (Class → Spell relationships)
WITH spell_classes AS (
  SELECT 
    s.id as spell_id,
    s.name as spell_name,
    s.data->'level' as spell_level,
    array_agg(c.name) as required_classes
  FROM documents s
  LEFT JOIN document_relationships rel ON rel.target_document_id = s.id 
    AND rel.relationship_type = 'grants_access'
  LEFT JOIN documents c ON c.id = rel.source_document_id 
    AND c.plugin_type LIKE '%:class'
  WHERE s.plugin_type LIKE '%:spell'
    AND s.campaign_id = $1
  GROUP BY s.id, s.name, s.data->'level'
)
SELECT * FROM spell_classes 
WHERE required_classes IS NOT NULL
ORDER BY (spell_level)::int, spell_name;
```

## MongoDB-Only Approach

### Schema Design

```typescript
// Improved MongoDB schema with better organization
interface DocumentSchema {
  _id: ObjectId;
  campaignId: ObjectId;
  
  // Document classification
  documentType?: 'Actor' | 'Item';  // Universal types only
  pluginType: string;               // All types: 'dnd5e:fighter', 'dnd5e:class'
  
  // Universal fields  
  name: string;
  createdBy: ObjectId;
  ownerUserId?: ObjectId;
  
  // Plugin-controlled data
  data: Record<string, unknown>;
  computedData?: Record<string, unknown>;
  
  // System metadata
  metadata?: Record<string, unknown>;
  permissions: Record<string, unknown>;
  
  // Indexing helpers
  searchText: string;  // Computed field for text search
  tags: string[];      // Extracted from data for indexing
  
  createdAt: Date;
  updatedAt: Date;
}

// Collection strategy: Single collection with good indexing
db.documents.createIndex({ campaignId: 1, documentType: 1 });
db.documents.createIndex({ campaignId: 1, pluginType: 1 });
db.documents.createIndex({ pluginType: 1 });
db.documents.createIndex({ ownerUserId: 1 });
db.documents.createIndex({ searchText: "text" });
db.documents.createIndex({ tags: 1 });

// Plugin-specific indexes (created dynamically)
db.documents.createIndex({ "data.level": 1 });
db.documents.createIndex({ "data.rarity": 1 });
db.documents.createIndex({ "data.class": 1 });

// Relationships collection
interface DocumentRelationship {
  _id: ObjectId;
  sourceDocumentId: ObjectId;
  targetDocumentId: ObjectId;
  relationshipType: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

db.documentRelationships.createIndex({ sourceDocumentId: 1, relationshipType: 1 });
db.documentRelationships.createIndex({ targetDocumentId: 1, relationshipType: 1 });
```

### Plugin Integration Pattern

```typescript
// MongoDB plugin API
class MongoDocumentService {
  // Plugin-friendly query builder
  async findDocuments(query: PluginDocumentQuery): Promise<Document[]> {
    const mongoQuery: FilterQuery<DocumentSchema> = {
      campaignId: new ObjectId(query.campaignId)
    };
    
    // Plugin type filtering
    if (query.pluginTypes) {
      mongoQuery.pluginType = { $in: query.pluginTypes };
    }
    
    // Document type filtering
    if (query.documentTypes) {
      mongoQuery.documentType = { $in: query.documentTypes };
    }
    
    // Plugin data filters (natural MongoDB syntax)
    if (query.dataFilters) {
      for (const [path, value] of Object.entries(query.dataFilters)) {
        mongoQuery[`data.${path}`] = value;
      }
    }
    
    // Complex queries using MongoDB operators
    if (query.complexFilters) {
      for (const filter of query.complexFilters) {
        mongoQuery[`data.${filter.path}`] = filter.operator;
      }
    }
    
    // Support for MongoDB's rich query operators
    const cursor = db.documents.find(mongoQuery);
    
    if (query.sort) {
      cursor.sort(query.sort);
    }
    
    if (query.limit) {
      cursor.limit(query.limit);
    }
    
    return cursor.toArray();
  }
  
  // Natural MongoDB updates
  async updateDocument(id: string, updates: PluginDocumentUpdate): Promise<Document> {
    const mongoUpdate: UpdateQuery<DocumentSchema> = {
      $set: {
        updatedAt: new Date()
      }
    };
    
    if (updates.name) {
      mongoUpdate.$set.name = updates.name;
    }
    
    if (updates.data) {
      // MongoDB's natural nested update syntax
      for (const [key, value] of Object.entries(updates.data)) {
        mongoUpdate.$set[`data.${key}`] = value;
      }
    }
    
    if (updates.computedData) {
      mongoUpdate.$set.computedData = updates.computedData;
    }
    
    const result = await db.documents.findOneAndUpdate(
      { _id: new ObjectId(id) },
      mongoUpdate,
      { returnDocument: 'after' }
    );
    
    return result.value;
  }
  
  // Complex aggregation for relationships
  async findActorsWithEquippedItems(campaignId: string): Promise<ActorWithItems[]> {
    return db.documents.aggregate([
      {
        $match: {
          campaignId: new ObjectId(campaignId),
          documentType: 'Actor'
        }
      },
      {
        $lookup: {
          from: 'documentRelationships',
          localField: '_id',
          foreignField: 'sourceDocumentId',
          as: 'relationships',
          pipeline: [
            { $match: { relationshipType: 'owns' } }
          ]
        }
      },
      {
        $lookup: {
          from: 'documents',
          localField: 'relationships.targetDocumentId',
          foreignField: '_id',
          as: 'items',
          pipeline: [
            { $match: { documentType: 'Item' } }
          ]
        }
      },
      {
        $project: {
          actor: {
            id: '$_id',
            name: '$name',
            data: '$data'
          },
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                id: '$$item._id',
                name: '$$item.name',
                data: '$$item.data',
                equipped: {
                  $arrayElemAt: [
                    '$relationships.metadata.equipped',
                    { $indexOfArray: ['$relationships.targetDocumentId', '$$item._id'] }
                  ]
                }
              }
            }
          }
        }
      }
    ]).toArray();
  }
}
```

### Complex Query Examples

```typescript
// Find D&D 5e Fighters above level 5 with equipped weapons
const fighters = await db.documents.aggregate([
  {
    $match: {
      campaignId: ObjectId(campaignId),
      pluginType: 'dnd5e:character',
      $or: [
        { 'data.classes.0.name': 'Fighter' },
        { 'data.class': 'Fighter' }
      ],
      'data.level': { $gt: 5 }
    }
  },
  {
    $lookup: {
      from: 'documentRelationships',
      let: { actorId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$sourceDocumentId', '$$actorId'] },
            relationshipType: 'owns',
            'metadata.equipped': true
          }
        }
      ],
      as: 'ownedItems'
    }
  },
  {
    $lookup: {
      from: 'documents',
      localField: 'ownedItems.targetDocumentId',
      foreignField: '_id',
      as: 'weapons',
      pipeline: [
        {
          $match: {
            pluginType: { $regex: /^dnd5e:weapon/ }
          }
        }
      ]
    }
  },
  {
    $project: {
      fighter_name: '$name',
      level: '$data.level',
      weapons: {
        $map: {
          input: '$weapons',
          as: 'weapon',
          in: {
            name: '$$weapon.name',
            damage: '$$weapon.data.damage'
          }
        }
      }
    }
  },
  { $sort: { level: -1 } }
]);

// Full-text search using MongoDB text index
const searchResults = await db.documents.find(
  {
    campaignId: ObjectId(campaignId),
    $text: { $search: searchTerm }
  },
  {
    score: { $meta: 'textScore' }
  }
).sort({ score: { $meta: 'textScore' } }).limit(20);

// Find spell prerequisites using aggregation
const spellPrerequisites = await db.documents.aggregate([
  {
    $match: {
      campaignId: ObjectId(campaignId),
      pluginType: { $regex: /^.*:spell$/ }
    }
  },
  {
    $lookup: {
      from: 'documentRelationships',
      localField: '_id',
      foreignField: 'targetDocumentId',
      as: 'prerequisites',
      pipeline: [
        { $match: { relationshipType: 'grants_access' } }
      ]
    }
  },
  {
    $lookup: {
      from: 'documents',
      localField: 'prerequisites.sourceDocumentId',
      foreignField: '_id',
      as: 'required_classes',
      pipeline: [
        { $match: { pluginType: { $regex: /:class$/ } } }
      ]
    }
  },
  {
    $match: {
      required_classes: { $ne: [] }
    }
  },
  {
    $project: {
      spell_name: '$name',
      spell_level: '$data.level',
      required_classes: '$required_classes.name'
    }
  },
  { $sort: { 'data.level': 1, name: 1 } }
]);
```

## Technical Trade-offs Analysis

### Query Capabilities

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Cross-Document Joins** | Native SQL joins, excellent performance | Aggregation pipelines, more verbose but flexible |
| **Complex Filtering** | Advanced JSONB operators, SQL expressions | Rich query operators, natural nested syntax |
| **Full-Text Search** | Built-in with ranking and highlighting | Text indexes with scoring |
| **Aggregations** | Window functions, CTEs, advanced analytics | Powerful aggregation pipeline |
| **Geospatial Queries** | PostGIS extension for advanced GIS | Built-in geospatial operators |

### Performance Characteristics

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Document Retrieval** | JSONB extraction overhead | Native document access |
| **Complex Queries** | Query planner optimization | Aggregation pipeline optimization |
| **Indexing** | GIN indexes on JSONB, partial indexes | Compound indexes, sparse indexes |
| **Concurrent Writes** | MVCC, excellent concurrency | Document-level locking |
| **Memory Usage** | Shared buffers, query-specific | WiredTiger cache, document-based |

### Schema Evolution

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Adding Fields** | JSONB allows dynamic fields | Native schema flexibility |
| **Plugin Registration** | No schema change needed | No schema change needed |
| **Index Management** | Manual index creation | Dynamic index creation |
| **Migration Complexity** | ALTER statements for structure | Minimal migrations needed |
| **Backward Compatibility** | Careful JSONB changes | Natural versioning |

### Plugin Development Experience

```typescript
// PostgreSQL: More complex but type-safe
const fighters = await documentService.findDocuments({
  campaignId,
  dataFilters: { class: 'Fighter' },
  complexFilters: [{
    path: 'level',
    operator: 'gt',
    value: 5,
    params: [5]
  }],
  relationships: ['owns'],
  relationshipFilters: {
    owns: { 'metadata.equipped': true }
  }
});

// MongoDB: More natural but less type safety
const fighters = await db.documents.find({
  campaignId: ObjectId(campaignId),
  'data.class': 'Fighter',
  'data.level': { $gt: 5 }
});
```

## Real-World Scenario Analysis

### Scenario 1: Character Sheet with Equipment

**PostgreSQL Approach:**
```sql
-- Single query with joins
SELECT 
  c.name as character_name,
  c.data as character_data,
  jsonb_agg(
    jsonb_build_object('item', i.data, 'equipped', r.metadata->'equipped')
  ) as equipment
FROM documents c
LEFT JOIN document_relationships r ON r.source_document_id = c.id AND r.relationship_type = 'owns'
LEFT JOIN documents i ON i.id = r.target_document_id
WHERE c.id = $1
GROUP BY c.id, c.name, c.data;
```

**MongoDB Approach:**
```typescript
// Aggregation pipeline
const character = await db.documents.aggregate([
  { $match: { _id: ObjectId(characterId) } },
  {
    $lookup: {
      from: 'documentRelationships',
      localField: '_id',
      foreignField: 'sourceDocumentId',
      as: 'relationships'
    }
  },
  {
    $lookup: {
      from: 'documents',
      localField: 'relationships.targetDocumentId',
      foreignField: '_id',
      as: 'equipment'
    }
  }
]);
```

**Analysis:**
- **PostgreSQL**: Single query, good performance, complex syntax
- **MongoDB**: More readable, multiple round trips in aggregation, better for nested data

### Scenario 2: Plugin Registering New Document Type

**PostgreSQL:**
```typescript
// Plugin registers "Species" document type
await pluginRegistry.registerDocumentType({
  pluginType: 'scifi:species',
  documentType: null, // Plugin-specific type
  schema: SpeciesSchema,
  indexes: [
    { field: 'data.homeworld', type: 'btree' },
    { field: 'data.traits', type: 'gin' }
  ]
});

// Create indexes dynamically
await postgres.query(`
  CREATE INDEX IF NOT EXISTS idx_species_homeworld 
  ON documents USING btree ((data->>'homeworld'))
  WHERE plugin_type = 'scifi:species'
`);
```

**MongoDB:**
```typescript
// Plugin registers "Species" document type
await pluginRegistry.registerDocumentType({
  pluginType: 'scifi:species',
  schema: SpeciesSchema,
  indexes: [
    { 'data.homeworld': 1 },
    { 'data.traits': 1 }
  ]
});

// Create indexes naturally
await db.documents.createIndex(
  { 'data.homeworld': 1 },
  { partialFilterExpression: { pluginType: 'scifi:species' } }
);
```

**Analysis:**
- **PostgreSQL**: More complex index creation, but very flexible
- **MongoDB**: Natural index syntax, built-in partial filtering

### Scenario 3: Complex Search Across All Content

**PostgreSQL:**
```sql
-- Advanced full-text search with faceting
SELECT 
  d.name,
  d.plugin_type,
  ts_rank(d.search_vector, query) as relevance,
  count(*) OVER (PARTITION BY d.plugin_type) as type_count
FROM documents d, plainto_tsquery('english', 'fire spell') query
WHERE d.campaign_id = $1 AND d.search_vector @@ query
ORDER BY relevance DESC;
```

**MongoDB:**
```typescript
// Text search with aggregation facets
const results = await db.documents.aggregate([
  {
    $match: {
      campaignId: ObjectId(campaignId),
      $text: { $search: 'fire spell' }
    }
  },
  {
    $facet: {
      results: [
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: { score: -1 } },
        { $limit: 20 }
      ],
      facets: [
        {
          $group: {
            _id: '$pluginType',
            count: { $sum: 1 }
          }
        }
      ]
    }
  }
]);
```

**Analysis:**
- **PostgreSQL**: Built-in text search features, window functions
- **MongoDB**: Faceted search with aggregation, more flexible grouping

## Migration Impact Assessment

### Current State Analysis
- **Existing MongoDB Setup**: Well-established with Mongoose models
- **Plugin Integration**: Currently uses MongoDB-native queries
- **Data Volume**: Estimated migration size and complexity
- **Downtime Requirements**: Impact on active campaigns

### PostgreSQL Migration Path

```typescript
// Migration complexity: HIGH
class MongoToPostgresMigration {
  async migrateDocuments(): Promise<void> {
    // 1. Schema creation
    await this.createPostgreSQLSchema();
    
    // 2. Data transformation
    const mongoDocs = await mongodb.collection('actors').find().toArray();
    for (const doc of mongoDocs) {
      await postgres.query(`
        INSERT INTO documents (id, campaign_id, document_type, plugin_type, name, data, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        doc._id,
        doc.campaignId,
        this.inferDocumentType(doc), // Logic to determine document_type
        doc.type || this.inferPluginType(doc),
        doc.name,
        JSON.stringify(this.transformData(doc)),
        doc.createdBy
      ]);
    }
    
    // 3. Plugin API changes
    await this.updatePluginAPIs();
    
    // 4. Index creation
    await this.createOptimizedIndexes();
  }
  
  private inferDocumentType(doc: any): string | null {
    // Logic to determine if this is 'Actor', 'Item', or plugin-specific
    if (doc.type?.includes('character') || doc.type?.includes('monster')) {
      return 'Actor';
    }
    if (doc.type?.includes('weapon') || doc.type?.includes('armor')) {
      return 'Item';
    }
    return null; // Plugin-specific type
  }
}
```

**Estimated Effort:** 4-6 weeks
**Risk Level:** High
**Plugin Impact:** All plugins need API updates

### MongoDB Improvement Path

```typescript
// Migration complexity: LOW
class MongoImprovementMigration {
  async improveSchema(): Promise<void> {
    // 1. Add new fields to existing documents
    await mongodb.collection('actors').updateMany(
      {},
      {
        $set: {
          documentType: { $cond: [{ $in: ['character', 'monster'] }, 'Actor', null] },
          pluginType: '$type'
        },
        $unset: { type: 1 }
      }
    );
    
    // 2. Create optimized indexes
    await this.createImprovedIndexes();
    
    // 3. Consolidate collections
    await this.consolidateCollections();
  }
  
  async consolidateCollections(): Promise<void> {
    // Move all document types to single collection
    const collections = ['actors', 'items', 'classes', 'backgrounds'];
    
    for (const collectionName of collections) {
      const docs = await mongodb.collection(collectionName).find().toArray();
      for (const doc of docs) {
        await mongodb.collection('documents').insertOne({
          ...doc,
          documentType: this.getDocumentType(collectionName),
          pluginType: doc.type || `${doc.gameSystem}:${collectionName.slice(0, -1)}`
        });
      }
    }
  }
}
```

**Estimated Effort:** 1-2 weeks
**Risk Level:** Low
**Plugin Impact:** Minimal API changes

## Operational Considerations

### Backup and Recovery

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Backup Tools** | pg_dump, continuous archiving | mongodump, replica sets |
| **Point-in-time Recovery** | Built-in PITR | Oplog replay |
| **Incremental Backups** | WAL archiving | Change streams |
| **Disaster Recovery** | Standby servers | Replica set failover |

### Monitoring and Debugging

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Query Analysis** | EXPLAIN ANALYZE, pg_stat_statements | explain(), profiler |
| **Performance Monitoring** | pgAdmin, Grafana dashboards | MongoDB Compass, Atlas monitoring |
| **Slow Query Detection** | log_min_duration_statement | Profiler slow operations |
| **Index Usage** | pg_stat_user_indexes | db.collection.getIndexes() |

### Scaling Characteristics

| Aspect | PostgreSQL | MongoDB |
|--------|-------------|----------|
| **Vertical Scaling** | Excellent | Good |
| **Horizontal Scaling** | Partitioning, read replicas | Native sharding |
| **Connection Pooling** | pgBouncer, connection limits | Connection pool per app |
| **Cache Efficiency** | Shared buffers, query cache | WiredTiger cache |

## Decision Recommendation Framework

### Priority-Based Analysis

**If your top priority is:**

1. **Plugin Development Experience**
   - **MongoDB** - Natural JSON operations, familiar to developers
   - Lower learning curve for plugin authors

2. **Complex Cross-Document Queries**
   - **PostgreSQL** - SQL joins, analytics capabilities
   - Better for reporting and complex relationships

3. **Operational Simplicity**
   - **PostgreSQL** - Single database system, mature tooling
   - Easier to find PostgreSQL expertise

4. **Migration Risk**
   - **MongoDB** - Minimal changes to existing system
   - Lower risk, faster implementation

5. **Long-term Scalability**
   - **MongoDB** - Better horizontal scaling story
   - **PostgreSQL** - Better vertical scaling, read replicas

### Specific Scenarios

**Choose PostgreSQL if:**
- You need complex analytical queries across documents
- You want unified full-text search with ranking
- You value ACID transactions across all data
- You have strong SQL expertise on the team
- You plan to add more relational features later

**Choose MongoDB if:**
- Plugin development experience is critical
- You want to minimize migration risk
- You need flexible schema evolution
- You plan to scale horizontally
- You prefer the existing development workflow

### Hybrid Recommendation

Given your current MongoDB setup and plugin architecture, **I recommend starting with the MongoDB improvement path** for the following reasons:

1. **Lower Risk**: Minimal changes to existing, working system
2. **Plugin Continuity**: Existing plugin APIs continue to work
3. **Faster Implementation**: Can improve current architecture incrementally
4. **Developer Familiarity**: Team already knows MongoDB patterns

**Future Migration Path**: Once the improved MongoDB system is stable, you can evaluate PostgreSQL migration based on:
- Need for complex analytical queries
- Operational complexity concerns
- Team expertise growth
- Scaling requirements

## Implementation Recommendations

### Phase 1: MongoDB Improvements (Immediate - 2 weeks)

```typescript
// 1. Consolidate to single documents collection
// 2. Improve indexing strategy
// 3. Add document type classification
// 4. Optimize plugin query patterns
```

### Phase 2: Enhanced Plugin API (Month 2)

```typescript
// 1. Standardize plugin document operations
// 2. Add relationship management
// 3. Improve search capabilities
// 4. Add performance monitoring
```

### Phase 3: Evaluation Point (Month 6)

```typescript
// Assess whether PostgreSQL migration provides sufficient benefits:
// 1. Query complexity requirements
// 2. Operational pain points
// 3. Performance bottlenecks
// 4. Team expertise
```

This approach gives you the benefits of improved architecture while minimizing risk and maintaining development velocity.