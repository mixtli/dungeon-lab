# Optimal State Architecture for GM-Authoritative VTT

## Executive Summary

This document outlines the optimal state management architecture for Dungeon Lab's Virtual Tabletop system, specifically designed for the GM-Authoritative model. The architecture addresses the unique requirements of real-time collaborative gaming while maintaining data integrity, performance, and developer experience.

### Core Principles

1. **State Type Optimization**: Different data types require different storage and access patterns
2. **GM Authority First**: Architecture designed around GM validation workflow
3. **Real-time Performance**: Sub-100ms updates for critical gameplay actions
4. **Data Integrity**: ACID compliance where needed, eventual consistency where acceptable
5. **Developer Experience**: Clean APIs, type safety, and debugging capabilities

## State Type Classification

### 1. Campaign State (Persistent, Complex Queries)

**Characteristics:**
- Long-lived data that persists between sessions
- Complex relational queries (find all Level 5 spellcasters)
- Rich metadata and plugin-extensible data
- Infrequent writes, moderate reads
- Strong consistency requirements

**Examples:**
- Actor definitions (characters, NPCs, monsters)
- Item definitions and inventories
- Campaign documents and lore
- Maps and environmental data
- Quest and story progression

### 2. Session State (Medium-term, Connection Tracking)

**Characteristics:**
- Exists for the duration of an active game session
- Tracks who is connected and their current roles
- Moderate read/write frequency
- Needs fast lookups by user/character
- Session-scoped persistence

**Examples:**
- Connected players and their characters
- Current encounter reference
- Turn order and initiative
- Active effects and conditions
- GM delegation permissions

### 3. Encounter State (High-frequency, Real-time)

**Characteristics:**
- Very frequent updates during active gameplay
- Position data, temporary stats, combat state
- Requires sub-second synchronization
- Large volume of small updates
- Conflict resolution needed

**Examples:**
- Token positions on battle maps
- Current HP, temporary modifiers
- Active spell effects and durations
- Initiative order changes
- Fog of war state

### 4. Client State (Local, Personal)

**Characteristics:**
- User-specific UI preferences and settings
- Local-first with optional cloud backup
- No real-time sync requirements
- Privacy-sensitive data

**Examples:**
- Window positions and sizes
- UI theme and accessibility settings
- Keybind customizations
- Local character sheet layouts
- Cached compendium data

## Backend Storage Architecture

### Unified PostgreSQL: All Data Types

**Why PostgreSQL for Everything:**
- **Operational Simplicity**: Single database to maintain, monitor, and backup
- **Cross-Data Queries**: Join compendium templates with campaign instances
- **ACID Transactions**: Ensure consistency across all related operations
- **Advanced JSON Support**: JSONB provides MongoDB-like flexibility with SQL power
- **Better Performance**: Query optimizer works across all your data

```sql
-- Core campaign data with rich querying
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  game_system TEXT NOT NULL,
  gm_user_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- COMPENDIUM MANAGEMENT (replaces MongoDB collections)
-- ============================================================================

-- Compendium sources (5e SRD, homebrew collections, etc.)
CREATE TABLE compendium_sources (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  game_system TEXT NOT NULL,
  publisher TEXT,
  url TEXT,
  description TEXT,
  is_official BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  
  -- License and usage info
  license_type TEXT,
  license_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(name, version, game_system)
);

-- Unified compendium items (actors, items, spells, features, etc.)
CREATE TABLE compendium_items (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES compendium_sources(id) ON DELETE CASCADE,
  ref_key TEXT NOT NULL, -- e.g., "dnd5e:monsters:goblin", "dnd5e:spells:fireball"
  name TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'actor', 'item', 'spell', 'class_feature', 'document'
  
  -- Hierarchical categories
  category TEXT,        -- 'weapon', 'armor', 'monster', 'spell', etc.
  subcategory TEXT,     -- 'martial_weapon', 'heavy_armor', 'humanoid', 'evocation'
  
  -- Searchable metadata
  level INTEGER,        -- Character/spell level
  rarity TEXT,         -- 'common', 'uncommon', 'rare', 'very_rare', 'legendary'
  school TEXT,         -- For spells: 'evocation', 'enchantment', etc.
  tags TEXT[],         -- Flexible tagging: ['fire', 'damage', 'area']
  
  -- Core item data (flexible structure)
  data JSONB NOT NULL,
  
  -- Computed fields for better performance
  computed_cr DECIMAL(4,2), -- Challenge Rating for monsters
  computed_cost INTEGER,    -- Gold piece value for items
  
  -- Full-text search vector
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      name || ' ' || 
      COALESCE(category, '') || ' ' || 
      COALESCE(subcategory, '') || ' ' || 
      array_to_string(tags, ' ') || ' ' ||
      COALESCE(data->>'description', '')
    )
  ) STORED,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(source_id, ref_key)
);

-- Compendium relationships (prerequisites, components, etc.)
CREATE TABLE compendium_relationships (
  id UUID PRIMARY KEY,
  source_item_id UUID REFERENCES compendium_items(id) ON DELETE CASCADE,
  target_item_id UUID REFERENCES compendium_items(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'prerequisite', 'component', 'upgrade', 'variant'
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(source_item_id, target_item_id, relationship_type)
);

-- ============================================================================
-- CAMPAIGN DATA (instances derived from compendium)
-- ============================================================================

-- Actors in campaigns (characters, NPCs, monsters)
CREATE TABLE actors (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- 'character', 'npc', 'monster'
  
  -- Compendium reference (null for custom actors)
  compendium_ref TEXT, -- References compendium_items.ref_key
  
  -- Core searchable fields
  level INTEGER,
  character_class TEXT,
  race TEXT,
  
  -- Actor data (base stats from compendium + overrides)
  base_stats JSONB NOT NULL,
  computed_stats JSONB DEFAULT '{}',
  current_stats JSONB DEFAULT '{}', -- HP, spell slots, etc.
  inventory JSONB DEFAULT '[]',
  plugin_data JSONB DEFAULT '{}',
  
  -- Ownership and permissions
  owner_user_id UUID, -- For player characters
  permissions JSONB DEFAULT '{"view": "gm", "edit": "owner"}',
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', name || ' ' || COALESCE(character_class, '') || ' ' || COALESCE(race, ''))
  ) STORED
);

-- Items in campaigns (weapons, armor, consumables, etc.)
CREATE TABLE campaign_items (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  
  -- Compendium reference (null for custom items)
  compendium_ref TEXT, -- References compendium_items.ref_key
  
  -- Item data (base properties from compendium + customizations)
  base_properties JSONB NOT NULL,
  custom_properties JSONB DEFAULT '{}',
  current_state JSONB DEFAULT '{}', -- Durability, charges, etc.
  
  -- Ownership and location tracking
  owner_actor_id UUID REFERENCES actors(id) ON DELETE SET NULL,
  container_item_id UUID REFERENCES campaign_items(id) ON DELETE SET NULL,
  location JSONB, -- For items not owned by actors
  
  -- Quantity and stacking
  quantity INTEGER DEFAULT 1,
  stack_size INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MEDIA AND FILE STORAGE
-- ============================================================================

-- Unified media storage (maps, tokens, handouts, etc.)
CREATE TABLE media_files (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- File identification
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  checksum TEXT, -- SHA-256 for deduplication
  
  -- File storage strategy (choose one)
  file_data BYTEA,    -- Option 1: Store in database (small files)
  file_path TEXT,     -- Option 2: Filesystem path (medium files)
  s3_bucket TEXT,     -- Option 3: S3 bucket name (large files)
  s3_key TEXT,        -- Option 3: S3 object key
  
  -- Media type and usage
  media_type TEXT NOT NULL, -- 'map', 'token', 'handout', 'avatar', 'background'
  usage_context TEXT, -- 'encounter', 'campaign', 'compendium'
  
  -- Map-specific metadata
  grid_size INTEGER,
  grid_offset JSONB, -- {x: 0, y: 0}
  dimensions JSONB,  -- {width: 1920, height: 1080}
  
  -- General metadata
  metadata JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{"view": "all", "edit": "gm"}',
  
  -- Organization
  tags TEXT[],
  folder_path TEXT, -- Virtual folder organization
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ENCOUNTERS AND REAL-TIME DATA
-- ============================================================================

-- Encounters (stored in PostgreSQL for persistence, cached in Redis for real-time)
CREATE TABLE encounters (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Map association
  map_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  map_settings JSONB DEFAULT '{}',
  
  -- Encounter state
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'completed')),
  initiative_data JSONB DEFAULT '{}',
  round_number INTEGER DEFAULT 0,
  current_turn INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tokens in encounters
CREATE TABLE encounter_tokens (
  id UUID PRIMARY KEY,
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES actors(id) ON DELETE CASCADE,
  
  -- Position and display
  position JSONB NOT NULL, -- {x: 100, y: 150}
  rotation DECIMAL(5,2) DEFAULT 0,
  scale DECIMAL(3,2) DEFAULT 1.0,
  
  -- Visibility and state
  visibility TEXT DEFAULT 'visible' CHECK (visibility IN ('visible', 'gm_only', 'hidden')),
  conditions TEXT[] DEFAULT '{}',
  temporary_stats JSONB DEFAULT '{}',
  
  -- Initiative
  initiative_order INTEGER,
  initiative_roll INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(encounter_id, actor_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Compendium indexes
CREATE INDEX idx_compendium_items_source ON compendium_items(source_id);
CREATE INDEX idx_compendium_items_type ON compendium_items(item_type);
CREATE INDEX idx_compendium_items_category ON compendium_items(category, subcategory);
CREATE INDEX idx_compendium_items_search ON compendium_items USING GIN (search_vector);
CREATE INDEX idx_compendium_items_tags ON compendium_items USING GIN (tags);
CREATE INDEX idx_compendium_items_level ON compendium_items(level) WHERE level IS NOT NULL;
CREATE INDEX idx_compendium_items_data ON compendium_items USING GIN (data);

-- Campaign data indexes
CREATE INDEX idx_actors_campaign_type ON actors(campaign_id, actor_type);
CREATE INDEX idx_actors_search ON actors USING GIN (search_vector);
CREATE INDEX idx_actors_compendium_ref ON actors(compendium_ref) WHERE compendium_ref IS NOT NULL;
CREATE INDEX idx_actors_owner ON actors(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_actors_stats ON actors USING GIN (base_stats);
CREATE INDEX idx_actors_level ON actors(campaign_id, level) WHERE level IS NOT NULL;

CREATE INDEX idx_campaign_items_campaign ON campaign_items(campaign_id);
CREATE INDEX idx_campaign_items_owner ON campaign_items(owner_actor_id) WHERE owner_actor_id IS NOT NULL;
CREATE INDEX idx_campaign_items_container ON campaign_items(container_item_id) WHERE container_item_id IS NOT NULL;
CREATE INDEX idx_campaign_items_compendium_ref ON campaign_items(compendium_ref) WHERE compendium_ref IS NOT NULL;

-- Media indexes
CREATE INDEX idx_media_files_campaign ON media_files(campaign_id);
CREATE INDEX idx_media_files_type ON media_files(media_type);
CREATE INDEX idx_media_files_checksum ON media_files(checksum);
CREATE INDEX idx_media_files_tags ON media_files USING GIN (tags);

-- Encounter indexes
CREATE INDEX idx_encounters_campaign ON encounters(campaign_id);
CREATE INDEX idx_encounter_tokens_encounter ON encounter_tokens(encounter_id);
CREATE INDEX idx_encounter_tokens_actor ON encounter_tokens(actor_id);
CREATE INDEX idx_encounter_tokens_initiative ON encounter_tokens(encounter_id, initiative_order) WHERE initiative_order IS NOT NULL;
```

**Key Benefits:**
- **Unified Operations**: Single backup, monitoring, and maintenance strategy
- **Complex Queries**: Join compendium templates with campaign instances in single queries
- **Full-Text Search**: Search across all content types simultaneously
- **ACID Transactions**: Ensure data consistency across compendium and campaign changes
- **Advanced JSON**: JSONB provides MongoDB flexibility with PostgreSQL reliability
- **Deduplication**: File checksum support prevents duplicate media storage

### Unified PostgreSQL Query Examples

The unified architecture enables powerful queries that span multiple data types:

```sql
-- Complex cross-data query: Find all Level 5+ spellcasters in a campaign
-- with their available spell slots and known high-level spells
SELECT 
  a.name as character_name,
  a.level,
  a.character_class,
  a.base_stats->'spellcasting_ability' as spell_ability,
  a.current_stats->'spell_slots' as available_slots,
  array_agg(
    DISTINCT jsonb_build_object(
      'name', ci.name,
      'level', ci.level,
      'school', ci.school,
      'description', ci.data->>'description'
    )
  ) as known_high_level_spells
FROM actors a
LEFT JOIN campaign_items items ON items.owner_actor_id = a.id
LEFT JOIN compendium_items ci ON ci.ref_key = items.compendium_ref
WHERE a.campaign_id = $1
  AND a.level >= 5
  AND a.base_stats->>'spellcasting_ability' IS NOT NULL
  AND ci.item_type = 'spell'
  AND ci.level >= 3
GROUP BY a.id, a.name, a.level, a.character_class, 
         a.base_stats->'spellcasting_ability', a.current_stats->'spell_slots'
ORDER BY a.level DESC;

-- Full-text search across all content in a campaign
SELECT 
  'actor' as result_type,
  a.name,
  a.character_class as subtitle,
  ts_rank(a.search_vector, query) as relevance,
  a.id
FROM actors a, plainto_tsquery('english', $1) query
WHERE a.campaign_id = $2 AND a.search_vector @@ query

UNION ALL

SELECT 
  'compendium_item' as result_type,
  ci.name,
  ci.category as subtitle,
  ts_rank(ci.search_vector, query) as relevance,
  ci.id
FROM compendium_items ci, plainto_tsquery('english', $1) query
WHERE ci.search_vector @@ query
  AND ci.source_id IN (
    SELECT DISTINCT cs.id 
    FROM compendium_sources cs
    JOIN campaigns c ON c.game_system = cs.game_system
    WHERE c.id = $2
  )

UNION ALL

SELECT 
  'media' as result_type,
  mf.original_name as name,
  mf.media_type as subtitle,
  1.0 as relevance,  -- Simple text match for filenames
  mf.id
FROM media_files mf
WHERE mf.campaign_id = $2 
  AND (mf.original_name ILIKE '%' || $1 || '%' 
       OR mf.tags && ARRAY[$1])

ORDER BY relevance DESC, name
LIMIT 20;

-- Advanced compendium query: Find all monsters that could challenge 
-- a party of specific level, with their stat blocks and related items
WITH party_stats AS (
  SELECT 
    AVG(level) as avg_level,
    COUNT(*) as party_size,
    MAX(level) as max_level
  FROM actors 
  WHERE campaign_id = $1 AND actor_type = 'character'
),
appropriate_monsters AS (
  SELECT 
    ci.*,
    -- Calculate encounter difficulty based on CR vs party level
    CASE 
      WHEN ci.computed_cr <= (ps.avg_level - 2) THEN 'easy'
      WHEN ci.computed_cr <= ps.avg_level THEN 'medium'
      WHEN ci.computed_cr <= (ps.avg_level + 2) THEN 'hard'
      ELSE 'deadly'
    END as encounter_difficulty
  FROM compendium_items ci
  CROSS JOIN party_stats ps
  WHERE ci.item_type = 'actor' 
    AND ci.category = 'monster'
    AND ci.computed_cr BETWEEN (ps.avg_level - 3) AND (ps.avg_level + 4)
)
SELECT 
  am.name,
  am.computed_cr,
  am.encounter_difficulty,
  am.data->'stats' as stat_block,
  array_agg(
    DISTINCT jsonb_build_object(
      'name', loot.name,
      'rarity', loot.rarity,
      'type', loot.category
    )
  ) FILTER (WHERE loot.id IS NOT NULL) as potential_loot
FROM appropriate_monsters am
LEFT JOIN compendium_relationships cr ON cr.source_item_id = am.id 
  AND cr.relationship_type = 'drops'
LEFT JOIN compendium_items loot ON loot.id = cr.target_item_id
GROUP BY am.id, am.name, am.computed_cr, am.encounter_difficulty, am.data->'stats'
ORDER BY am.computed_cr, am.name;

-- Performance query: Find media files that might need optimization
SELECT 
  mf.original_name,
  mf.file_size,
  mf.mime_type,
  mf.media_type,
  c.name as campaign_name,
  CASE 
    WHEN mf.file_size > 50 * 1024 * 1024 THEN 'large'
    WHEN mf.file_size > 10 * 1024 * 1024 THEN 'medium'
    ELSE 'small'
  END as size_category,
  mf.created_at,
  -- Check if file is referenced in any encounters
  COUNT(e.id) as encounter_usage
FROM media_files mf
JOIN campaigns c ON c.id = mf.campaign_id
LEFT JOIN encounters e ON e.map_id = mf.id
WHERE mf.media_type = 'map'
GROUP BY mf.id, mf.original_name, mf.file_size, mf.mime_type, 
         mf.media_type, c.name, mf.created_at
HAVING mf.file_size > 5 * 1024 * 1024  -- Files larger than 5MB
ORDER BY mf.file_size DESC;

-- Data analytics: Campaign content analysis
SELECT 
  c.name as campaign_name,
  c.game_system,
  COUNT(DISTINCT a.id) FILTER (WHERE a.actor_type = 'character') as player_characters,
  COUNT(DISTINCT a.id) FILTER (WHERE a.actor_type = 'npc') as npcs,
  COUNT(DISTINCT a.id) FILTER (WHERE a.actor_type = 'monster') as monsters,
  COUNT(DISTINCT ci.id) as total_items,
  COUNT(DISTINCT mf.id) as media_files,
  pg_size_pretty(SUM(mf.file_size)) as total_media_size,
  COUNT(DISTINCT e.id) as encounters,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') as completed_encounters
FROM campaigns c
LEFT JOIN actors a ON a.campaign_id = c.id
LEFT JOIN campaign_items ci ON ci.campaign_id = c.id
LEFT JOIN media_files mf ON mf.campaign_id = c.id
LEFT JOIN encounters e ON e.campaign_id = c.id
GROUP BY c.id, c.name, c.game_system
ORDER BY c.name;
```

### File Storage Strategy

```typescript
// Flexible file storage based on size and usage patterns
class UnifiedFileStorage {
  async storeFile(file: Buffer, metadata: FileMetadata): Promise<string> {
    const checksum = createHash('sha256').update(file).digest('hex');
    
    // Check for existing file to prevent duplication
    const existing = await postgres.query(
      'SELECT id FROM media_files WHERE checksum = $1 LIMIT 1',
      [checksum]
    );
    
    if (existing.rows.length > 0) {
      // File already exists, just create new metadata record
      return this.createMetadataRecord(existing.rows[0].id, metadata);
    }
    
    // Determine storage strategy based on file size
    const storageStrategy = this.getStorageStrategy(file.length, metadata.mediaType);
    
    switch (storageStrategy) {
      case 'database':
        return this.storeInDatabase(file, metadata, checksum);
      case 'filesystem':
        return this.storeInFilesystem(file, metadata, checksum);
      case 's3':
        return this.storeInS3(file, metadata, checksum);
    }
  }
  
  private getStorageStrategy(fileSize: number, mediaType: string): 'database' | 'filesystem' | 's3' {
    // Small files (< 1MB) - database for simplicity
    if (fileSize < 1024 * 1024) {
      return 'database';
    }
    
    // Medium files (1MB - 50MB) - filesystem for performance
    if (fileSize < 50 * 1024 * 1024) {
      return 'filesystem';
    }
    
    // Large files (> 50MB) - S3 for scalability
    return 's3';
  }
  
  private async storeInDatabase(file: Buffer, metadata: FileMetadata, checksum: string): Promise<string> {
    const result = await postgres.query(`
      INSERT INTO media_files (
        campaign_id, filename, original_name, mime_type, file_size,
        checksum, media_type, metadata, created_by, file_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      metadata.campaignId,
      metadata.filename,
      metadata.originalName,
      metadata.mimeType,
      file.length,
      checksum,
      metadata.mediaType,
      JSON.stringify(metadata.additional || {}),
      metadata.createdBy,
      file
    ]);
    
    return result.rows[0].id;
  }
  
  private async storeInFilesystem(file: Buffer, metadata: FileMetadata, checksum: string): Promise<string> {
    // Create organized directory structure
    const yearMonth = new Date().toISOString().slice(0, 7); // "2024-01"
    const dir = path.join(process.env.UPLOAD_DIR, metadata.campaignId, yearMonth);
    await fs.mkdir(dir, { recursive: true });
    
    const filename = `${checksum.slice(0, 8)}-${metadata.filename}`;
    const filePath = path.join(dir, filename);
    
    await fs.writeFile(filePath, file);
    
    const result = await postgres.query(`
      INSERT INTO media_files (
        campaign_id, filename, original_name, mime_type, file_size,
        checksum, media_type, metadata, created_by, file_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      metadata.campaignId,
      filename,
      metadata.originalName,
      metadata.mimeType,
      file.length,
      checksum,
      metadata.mediaType,
      JSON.stringify(metadata.additional || {}),
      metadata.createdBy,
      filePath
    ]);
    
    return result.rows[0].id;
  }
}

### Redis: Session and Encounter State

```typescript
// Session state management
interface SessionState {
  id: string;
  campaignId: string;
  gmUserId: string;
  
  // Connected players
  participants: {
    [userId: string]: {
      characterId?: string;
      connectionStatus: 'connected' | 'disconnected';
      lastSeen: number;
      permissions: string[];
    };
  };
  
  // Current encounter
  currentEncounterId?: string;
  
  // Session metadata
  startTime: number;
  lastActivity: number;
}

// Encounter state for real-time updates
interface EncounterState {
  id: string;
  campaignId: string;
  sessionId: string;
  
  // Battle map
  mapId?: string;
  mapSettings: {
    gridSize: number;
    gridOffset: { x: number; y: number };
    backgroundColor: string;
  };
  
  // Tokens with positions
  tokens: {
    [tokenId: string]: {
      actorId: string;
      position: { x: number; y: number };
      rotation: number;
      scale: number;
      visibility: 'visible' | 'gm_only' | 'hidden';
      conditions: string[];
      temporaryStats: { [key: string]: number };
    };
  };
  
  // Initiative and turn tracking
  initiative: {
    order: string[]; // token IDs in initiative order
    currentTurn: number;
    round: number;
    phase: 'setup' | 'combat' | 'exploration';
  };
  
  // Temporary effects
  effects: {
    [effectId: string]: {
      name: string;
      targetIds: string[];
      duration: number;
      properties: Record<string, any>;
      createdBy: string;
      createdAt: number;
    };
  };
}

// Redis operations for session management
class SessionStateManager {
  private redis: Redis;
  
  async createSession(campaignId: string, gmUserId: string): Promise<string> {
    const sessionId = generateId();
    const sessionState: SessionState = {
      id: sessionId,
      campaignId,
      gmUserId,
      participants: {},
      startTime: Date.now(),
      lastActivity: Date.now()
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      24 * 60 * 60, // 24 hour TTL
      JSON.stringify(sessionState)
    );
    
    return sessionId;
  }
  
  async joinSession(sessionId: string, userId: string, characterId?: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const session = await this.getSession(sessionId);
    
    if (session) {
      session.participants[userId] = {
        characterId,
        connectionStatus: 'connected',
        lastSeen: Date.now(),
        permissions: userId === session.gmUserId ? ['gm'] : ['player']
      };
      
      await this.redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(session));
      
      // Publish join event
      await this.redis.publish(`session:${sessionId}:events`, JSON.stringify({
        type: 'user:joined',
        userId,
        characterId,
        timestamp: Date.now()
      }));
    }
  }
  
  // Encounter state management with atomic updates
  async updateEncounterState(
    encounterId: string,
    updates: Partial<EncounterState>
  ): Promise<void> {
    const encounterKey = `encounter:${encounterId}`;
    
    // Use Redis transaction for atomic updates
    const multi = this.redis.multi();
    
    // Get current state
    const current = await this.getEncounterState(encounterId);
    if (!current) throw new Error('Encounter not found');
    
    // Apply updates
    const updated = { ...current, ...updates };
    
    // Store updated state
    multi.setex(encounterKey, 60 * 60, JSON.stringify(updated)); // 1 hour TTL
    
    // Publish update event
    multi.publish(`encounter:${encounterId}:updates`, JSON.stringify({
      type: 'state:updated',
      changes: updates,
      timestamp: Date.now()
    }));
    
    await multi.exec();
  }
}
```

**Key Benefits:**
- **Real-time Performance**: In-memory access with microsecond latency
- **Pub/Sub Integration**: Efficient event broadcasting to connected clients
- **Atomic Operations**: Transaction support for consistent updates
- **Automatic Cleanup**: TTL for memory management
- **Horizontal Scaling**: Redis Cluster support for high-traffic scenarios

### Event Log: Audit Trail and Recovery

```sql
-- Complete audit trail for GM decisions and state changes
CREATE TABLE event_log (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Actor information
  initiated_by UUID NOT NULL, -- user ID
  approved_by UUID, -- GM user ID (if different)
  
  -- Event data
  event_data JSONB NOT NULL,
  state_changes JSONB, -- Array of state change operations
  
  -- Timing
  requested_at TIMESTAMP NOT NULL,
  approved_at TIMESTAMP,
  applied_at TIMESTAMP DEFAULT NOW(),
  
  -- Context
  encounter_id UUID,
  round_number INTEGER,
  
  -- Status tracking
  status TEXT DEFAULT 'applied' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'rolled_back'))
);

-- Indexes for efficient querying
CREATE INDEX idx_event_log_session ON event_log(session_id, applied_at DESC);
CREATE INDEX idx_event_log_user ON event_log(initiated_by, applied_at DESC);
CREATE INDEX idx_event_log_encounter ON event_log(encounter_id, round_number, applied_at DESC);
CREATE INDEX idx_event_log_status ON event_log(status, applied_at DESC);

-- Event replay functionality
CREATE OR REPLACE FUNCTION replay_session_events(
  p_session_id UUID,
  p_from_timestamp TIMESTAMP DEFAULT NULL
) RETURNS TABLE (
  event_id BIGINT,
  event_type TEXT,
  state_changes JSONB,
  applied_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.event_type,
    el.state_changes,
    el.applied_at
  FROM event_log el
  WHERE el.session_id = p_session_id
    AND el.status = 'applied'
    AND (p_from_timestamp IS NULL OR el.applied_at >= p_from_timestamp)
  ORDER BY el.applied_at ASC;
END;
$$ LANGUAGE plpgsql;
```

## Client State Architecture

### Normalized State Store with Zustand

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

// Normalized entity storage
interface GameState {
  // Entity storage (normalized)
  entities: {
    actors: Record<string, Actor>;
    items: Record<string, Item>;
    encounters: Record<string, Encounter>;
    tokens: Record<string, Token>;
    effects: Record<string, Effect>;
  };
  
  // Relationship indices
  indices: {
    actorsByType: Record<string, string[]>;
    itemsByOwner: Record<string, string[]>;
    tokensByEncounter: Record<string, string[]>;
    effectsByTarget: Record<string, string[]>;
  };
  
  // Current context
  context: {
    campaignId?: string;
    sessionId?: string;
    currentEncounterId?: string;
    currentUserId?: string;
  };
  
  // UI state
  ui: {
    selectedTokens: string[];
    activeWindows: string[];
    mapViewport: { x: number; y: number; zoom: number };
  };
  
  // Pending actions (optimistic updates)
  pending: {
    actions: Record<string, PendingAction>;
    optimisticChanges: Record<string, any>;
  };
}

// Zustand store with middleware
export const useGameStore = create<GameState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      entities: {
        actors: {},
        items: {},
        encounters: {},
        tokens: {},
        effects: {}
      },
      indices: {
        actorsByType: {},
        itemsByOwner: {},
        tokensByEncounter: {},
        effectsByTarget: {}
      },
      context: {},
      ui: {
        selectedTokens: [],
        activeWindows: [],
        mapViewport: { x: 0, y: 0, zoom: 1 }
      },
      pending: {
        actions: {},
        optimisticChanges: {}
      }
    }))
  )
);

// Actions for state updates
export const gameActions = {
  // Entity management
  setActor: (actor: Actor) => {
    useGameStore.setState((state) => {
      state.entities.actors[actor.id] = actor;
      
      // Update indices
      const type = actor.type;
      if (!state.indices.actorsByType[type]) {
        state.indices.actorsByType[type] = [];
      }
      if (!state.indices.actorsByType[type].includes(actor.id)) {
        state.indices.actorsByType[type].push(actor.id);
      }
    });
  },
  
  // Batch updates for performance
  updateEntities: (updates: EntityUpdates) => {
    useGameStore.setState((state) => {
      // Apply all updates in a single transaction
      Object.entries(updates.actors || {}).forEach(([id, actor]) => {
        state.entities.actors[id] = { ...state.entities.actors[id], ...actor };
      });
      
      Object.entries(updates.tokens || {}).forEach(([id, token]) => {
        state.entities.tokens[id] = { ...state.entities.tokens[id], ...token };
      });
      
      // Update indices after batch changes
      gameActions.rebuildIndices();
    });
  },
  
  // Optimistic updates
  applyOptimisticUpdate: (actionId: string, changes: any) => {
    useGameStore.setState((state) => {
      state.pending.optimisticChanges[actionId] = changes;
      // Apply changes immediately for UI responsiveness
      applyChangesToState(state, changes);
    });
  },
  
  // Rollback optimistic updates
  rollbackOptimisticUpdate: (actionId: string) => {
    useGameStore.setState((state) => {
      const changes = state.pending.optimisticChanges[actionId];
      if (changes) {
        // Reverse the optimistic changes
        reverseChangesFromState(state, changes);
        delete state.pending.optimisticChanges[actionId];
      }
    });
  }
};

// Selectors for efficient component subscriptions
export const gameSelectors = {
  // Get actors by type with memoization
  getActorsByType: (type: string) => {
    return useGameStore((state) => {
      const actorIds = state.indices.actorsByType[type] || [];
      return actorIds.map(id => state.entities.actors[id]).filter(Boolean);
    });
  },
  
  // Get encounter tokens with positions
  getEncounterTokens: (encounterId: string) => {
    return useGameStore((state) => {
      const tokenIds = state.indices.tokensByEncounter[encounterId] || [];
      return tokenIds.map(id => state.entities.tokens[id]).filter(Boolean);
    });
  },
  
  // Complex queries with computed properties
  getAvailableSpellcasters: () => {
    return useGameStore((state) => {
      return Object.values(state.entities.actors)
        .filter(actor => actor && actor.stats.spellcasting_ability)
        .map(actor => ({
          ...actor,
          spellSlots: computeSpellSlots(actor),
          availableSpells: getAvailableSpells(actor, state.entities.items)
        }));
    });
  }
};
```

### Reactive Query Layer with VueUse/VueQuery

**Option 1: VueUse Query (Recommended)**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, ref } from 'vue';

// Query configuration for different data types
const queryConfig = {
  campaign: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes (renamed from cacheTime)
  },
  session: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
  },
  encounter: {
    staleTime: 1000,             // 1 second
    gcTime: 60 * 1000,           // 1 minute
  }
};

// Campaign data queries
export const useCampaignActors = (campaignId: Ref<string> | string) => {
  return useQuery({
    queryKey: ['campaign', campaignId, 'actors'],
    queryFn: () => apiClient.getCampaignActors(unref(campaignId)),
    ...queryConfig.campaign,
    select: (data) => {
      // Transform and normalize data
      const actors = {};
      const indices = { byType: {}, byLevel: {} };
      
      data.forEach(actor => {
        actors[actor.id] = actor;
        
        // Build indices
        const type = actor.type;
        if (!indices.byType[type]) indices.byType[type] = [];
        indices.byType[type].push(actor.id);
        
        if (actor.level) {
          if (!indices.byLevel[actor.level]) indices.byLevel[actor.level] = [];
          indices.byLevel[actor.level].push(actor.id);
        }
      });
      
      return { actors, indices };
    }
  });
};

// Real-time encounter state
export const useEncounterState = (encounterId: Ref<string> | string) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['encounter', encounterId, 'state'],
    queryFn: () => apiClient.getEncounterState(unref(encounterId)),
    ...queryConfig.encounter,
    onSuccess: (data) => {
      // Update normalized store
      gameActions.updateEntities({
        tokens: data.tokens,
        effects: data.effects
      });
    }
  });
  
  // Subscribe to real-time updates using VueUse
  const { data: websocketData } = useWebSocket(`ws://localhost:3000/encounter/${unref(encounterId)}`, {
    onMessage: (ws, event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state:updated') {
        // Update query cache
        queryClient.setQueryData(['encounter', unref(encounterId), 'state'], (old: any) => ({
          ...old,
          ...message.changes
        }));
        
        // Update normalized store
        gameActions.updateEntities(message.changes);
      }
    }
  });
  
  return query;
};

// Action mutations with optimistic updates
export const useTokenMove = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tokenId, position }: { tokenId: string; position: { x: number; y: number } }) => {
      return apiClient.requestAction({
        type: 'token:move',
        tokenId,
        position
      });
    },
    onMutate: async (variables) => {
      const { tokenId, position } = variables;
      const actionId = generateId();
      
      // Apply optimistic update
      gameActions.applyOptimisticUpdate(actionId, {
        tokens: {
          [tokenId]: { position }
        }
      });
      
      return { actionId };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.actionId) {
        gameActions.rollbackOptimisticUpdate(context.actionId);
      }
    },
    onSuccess: (data, variables, context) => {
      // Clear optimistic update (real update will come via WebSocket)
      if (context?.actionId) {
        gameActions.clearOptimisticUpdate(context.actionId);
      }
    }
  });
};

// Alternative Option 2: Custom Vue Composables with VueUse
export const useCampaignActorsCustom = (campaignId: Ref<string>) => {
  const { data, error, isFetching, execute } = useFetch(() => 
    `/api/campaigns/${campaignId.value}/actors`
  ).json();
  
  const actors = computed(() => {
    if (!data.value) return {};
    
    const normalized = {};
    const indices = { byType: {}, byLevel: {} };
    
    data.value.forEach(actor => {
      normalized[actor.id] = actor;
      
      // Build indices
      const type = actor.type;
      if (!indices.byType[type]) indices.byType[type] = [];
      indices.byType[type].push(actor.id);
      
      if (actor.level) {
        if (!indices.byLevel[actor.level]) indices.byLevel[actor.level] = [];
        indices.byLevel[actor.level].push(actor.id);
      }
    });
    
    return { actors: normalized, indices };
  });
  
  // Auto-refetch on campaignId change
  watchEffect(() => {
    if (campaignId.value) {
      execute();
    }
  });
  
  return {
    data: actors,
    error,
    isLoading: isFetching,
    refetch: execute
  };
};

// Real-time encounter state with custom composables
export const useEncounterStateCustom = (encounterId: Ref<string>) => {
  const encounterState = ref<EncounterState | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  
  // Initial fetch
  const fetchEncounterState = async () => {
    if (!encounterId.value) return;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const data = await apiClient.getEncounterState(encounterId.value);
      encounterState.value = data;
      
      // Update normalized store
      gameActions.updateEntities({
        tokens: data.tokens,
        effects: data.effects
      });
    } catch (err) {
      error.value = err as Error;
    } finally {
      isLoading.value = false;
    }
  };
  
  // WebSocket subscription
  const { data: wsData, status: wsStatus } = useWebSocket(
    computed(() => `ws://localhost:3000/encounter/${encounterId.value}`),
    {
      onMessage: (ws, event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'state:updated') {
          // Update local state
          if (encounterState.value) {
            encounterState.value = { ...encounterState.value, ...message.changes };
          }
          
          // Update normalized store
          gameActions.updateEntities(message.changes);
        }
      },
      onConnected: () => {
        console.log('WebSocket connected for encounter:', encounterId.value);
      }
    }
  );
  
  // Auto-fetch when encounterId changes
  watchEffect(() => {
    if (encounterId.value) {
      fetchEncounterState();
    }
  });
  
  return {
    data: readonly(encounterState),
    isLoading: readonly(isLoading),
    error: readonly(error),
    wsStatus,
    refetch: fetchEncounterState
  };
};
```

### Client Storage Strategy

```typescript
// Local storage manager for client-specific data
class ClientStorageManager {
  private prefix = 'dungeonlab:';
  
  // UI preferences (localStorage - persistent)
  setUIPreferences(userId: string, preferences: UIPreferences): void {
    const key = `${this.prefix}ui:${userId}`;
    localStorage.setItem(key, JSON.stringify(preferences));
  }
  
  getUIPreferences(userId: string): UIPreferences | null {
    const key = `${this.prefix}ui:${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }
  
  // Session data (sessionStorage - temporary)
  setSessionData(sessionId: string, data: SessionData): void {
    const key = `${this.prefix}session:${sessionId}`;
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  
  // Offline cache (IndexedDB - structured data)
  private db: IDBDatabase;
  
  async cacheCompendiumData(compendiumRef: string, data: any): Promise<void> {
    const transaction = this.db.transaction(['compendium'], 'readwrite');
    const store = transaction.objectStore('compendium');
    
    await store.put({
      ref: compendiumRef,
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }
  
  async getCachedCompendiumData(compendiumRef: string): Promise<any> {
    const transaction = this.db.transaction(['compendium'], 'readonly');
    const store = transaction.objectStore('compendium');
    const result = await store.get(compendiumRef);
    
    if (result && result.expiresAt > Date.now()) {
      return result.data;
    }
    
    return null;
  }
}
```

## State Change Protocol

### Action Request Flow

```typescript
// Player action request structure
interface ActionRequest {
  id: string;
  type: string;
  playerId: string;
  sessionId: string;
  
  // Action-specific data
  payload: {
    [key: string]: any;
  };
  
  // Context for GM review
  context: {
    encounterId?: string;
    round?: number;
    initiativeOrder?: number;
    targetIds?: string[];
    sourceId?: string;
  };
  
  // Optimistic update data for immediate UI feedback
  optimisticChanges?: StateChange[];
  
  // Timing
  requestedAt: number;
  expiresAt?: number;
}

// GM decision structure
interface GMDecision {
  requestId: string;
  approved: boolean;
  
  // If approved
  stateChanges?: StateChange[];
  feedback?: string;
  
  // If rejected
  reason?: string;
  suggestedAlternative?: ActionRequest;
  
  // Decision metadata
  decidedBy: string;
  decidedAt: number;
  autoApproved: boolean;
}

// State change operations (operational transform style)
interface StateChange {
  path: string;           // JSONPath to the data location
  operation: 'set' | 'merge' | 'append' | 'delete' | 'increment';
  value?: any;
  previousValue?: any;    // For rollback capability
  timestamp: number;
  version: number;        // For conflict resolution
}

// Example state changes
const exampleStateChanges: StateChange[] = [
  {
    path: 'tokens.token_123.position',
    operation: 'set',
    value: { x: 100, y: 150 },
    previousValue: { x: 50, y: 75 },
    timestamp: Date.now(),
    version: 45
  },
  {
    path: 'actors.goblin_1.stats.hp.current',
    operation: 'increment',
    value: -8,
    previousValue: 20,
    timestamp: Date.now(),
    version: 46
  },
  {
    path: 'encounter.log',
    operation: 'append',
    value: {
      type: 'attack',
      attacker: 'player_1',
      target: 'goblin_1',
      damage: 8,
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    version: 47
  }
];
```

### WebSocket Protocol

```typescript
// WebSocket message types
type WebSocketMessage = 
  | ActionRequestMessage
  | GMDecisionMessage  
  | StateUpdateMessage
  | PingMessage
  | AckMessage;

interface BaseMessage {
  id: string;
  type: string;
  timestamp: number;
  version?: number;
}

interface ActionRequestMessage extends BaseMessage {
  type: 'action:request';
  sessionId: string;
  request: ActionRequest;
}

interface GMDecisionMessage extends BaseMessage {
  type: 'gm:decision';
  sessionId: string;
  decision: GMDecision;
}

interface StateUpdateMessage extends BaseMessage {
  type: 'state:update';
  sessionId: string;
  changes: StateChange[];
  sourceRequestId?: string;
  affectedClients?: string[];
}

// WebSocket client with reliable delivery
class ReliableWebSocketClient {
  private ws: WebSocket;
  private messageQueue: WebSocketMessage[] = [];
  private pendingAcks = new Map<string, { message: WebSocketMessage; timeout: NodeJS.Timeout }>();
  private sequenceNumber = 0;
  
  send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullMessage: WebSocketMessage = {
        ...message,
        id: generateId(),
        timestamp: Date.now(),
        version: this.sequenceNumber++
      };
      
      // Queue message for reliability
      this.messageQueue.push(fullMessage);
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(fullMessage));
        
        // Set up acknowledgment timeout
        const timeout = setTimeout(() => {
          // Resend if no ack received
          this.resendMessage(fullMessage);
        }, 5000);
        
        this.pendingAcks.set(fullMessage.id, { message: fullMessage, timeout });
        resolve();
      } else {
        // Will be sent when connection is restored
        resolve();
      }
    });
  }
  
  private handleMessage(event: MessageEvent): void {
    const message: WebSocketMessage = JSON.parse(event.data);
    
    // Send acknowledgment
    this.sendAck(message.id);
    
    // Handle different message types
    switch (message.type) {
      case 'state:update':
        this.handleStateUpdate(message as StateUpdateMessage);
        break;
      case 'gm:decision':
        this.handleGMDecision(message as GMDecisionMessage);
        break;
      case 'ack':
        this.handleAck(message as AckMessage);
        break;
    }
  }
  
  private handleStateUpdate(message: StateUpdateMessage): void {
    // Apply state changes with conflict resolution
    const currentVersion = useGameStore.getState().version;
    
    if (message.version && message.version <= currentVersion) {
      // Ignore outdated updates
      return;
    }
    
    // Apply changes using operational transforms
    gameActions.applyStateChanges(message.changes);
    
    // Update version
    useGameStore.setState((state) => {
      state.version = message.version || currentVersion + 1;
    });
  }
  
  private handleGMDecision(message: GMDecisionMessage): void {
    const decision = message.decision;
    
    if (decision.approved && decision.stateChanges) {
      // Apply approved changes
      gameActions.applyStateChanges(decision.stateChanges);
      
      // Clear any pending optimistic updates
      gameActions.clearOptimisticUpdate(decision.requestId);
    } else {
      // Rollback optimistic updates
      gameActions.rollbackOptimisticUpdate(decision.requestId);
    }
    
    // Update UI with feedback
    notificationStore.addNotification({
      type: decision.approved ? 'success' : 'error',
      message: decision.feedback || decision.reason || 'Action processed',
      actionId: decision.requestId
    });
  }
}
```

### Conflict Resolution

```typescript
// Operational Transform for conflict-free updates
class OperationalTransform {
  // Transform operation A against operation B (A happened first)
  static transform(opA: StateChange, opB: StateChange): StateChange[] {
    // If operations target different paths, no conflict
    if (!this.pathsConflict(opA.path, opB.path)) {
      return [opA, opB];
    }
    
    // Handle conflicts based on operation types
    if (opA.operation === 'set' && opB.operation === 'set') {
      // Last write wins, but preserve both for GM review
      return [
        { ...opB, metadata: { conflictWith: opA.id, resolution: 'last_write_wins' } }
      ];
    }
    
    if (opA.operation === 'increment' && opB.operation === 'increment') {
      // Combine increments
      return [
        {
          ...opA,
          value: opA.value + opB.value,
          metadata: { combined: [opA.id, opB.id] }
        }
      ];
    }
    
    if (opA.operation === 'append' && opB.operation === 'append') {
      // Maintain order based on timestamp
      return opA.timestamp < opB.timestamp ? [opA, opB] : [opB, opA];
    }
    
    // Default: GM arbitration required
    return [
      { ...opA, metadata: { requiresGMReview: true, conflictWith: opB.id } },
      { ...opB, metadata: { requiresGMReview: true, conflictWith: opA.id } }
    ];
  }
  
  private static pathsConflict(pathA: string, pathB: string): boolean {
    // Check if paths overlap (one is a parent of the other)
    return pathA.startsWith(pathB) || pathB.startsWith(pathA);
  }
}

// State change application with OT
function applyStateChanges(changes: StateChange[]): void {
  // Sort changes by timestamp
  const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);
  
  // Apply operational transforms to resolve conflicts
  let transformedChanges: StateChange[] = [];
  
  for (const change of sortedChanges) {
    let applicableChange = change;
    
    // Transform against all previously applied changes
    for (const applied of transformedChanges) {
      const transformed = OperationalTransform.transform(applied, applicableChange);
      applicableChange = transformed[transformed.length - 1]; // Take the latest version
    }
    
    transformedChanges.push(applicableChange);
  }
  
  // Apply transformed changes to state store
  useGameStore.setState((state) => {
    for (const change of transformedChanges) {
      applyChangeToState(state, change);
    }
  });
}
```

## Performance Optimizations

### Database Optimization

```sql
-- Partitioning for large event logs
CREATE TABLE event_log_template (
  id BIGSERIAL,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (applied_at);

-- Monthly partitions for efficient querying and cleanup
CREATE TABLE event_log_2024_01 PARTITION OF event_log_template
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Materialized views for complex queries
CREATE MATERIALIZED VIEW campaign_stats AS
SELECT 
  c.id,
  c.name,
  COUNT(DISTINCT a.id) as actor_count,
  COUNT(DISTINCT CASE WHEN a.actor_type = 'character' THEN a.id END) as character_count,
  AVG(CASE WHEN a.level IS NOT NULL THEN a.level END) as avg_level,
  MAX(a.updated_at) as last_activity
FROM campaigns c
LEFT JOIN actors a ON c.id = a.campaign_id
GROUP BY c.id, c.name;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Automatic refresh on actor changes
CREATE TRIGGER actor_stats_refresh
  AFTER INSERT OR UPDATE OR DELETE ON actors
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_campaign_stats();
```

### Client-Side Optimizations

```vue
<!-- Virtualization for large lists using vue-virtual-scroller -->
<template>
  <RecycleScroller
    class="scroller"
    :items="actors"
    :item-size="80"
    key-field="id"
    v-slot="{ item, index }"
  >
    <ActorCard :actor="item" :key="item.id" />
  </RecycleScroller>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller';
import { computed } from 'vue';

interface Props {
  actors: Actor[];
}

const props = defineProps<Props>();
</script>
```

```vue
<!-- Token layer with optimized rendering -->
<template>
  <div class="token-layer">
    <TokenSprite
      v-for="token in visibleTokens"
      :key="token.id"
      :token="token"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useEncounterTokens } from '@/composables/useEncounterState';

interface Props {
  encounterId: string;
  viewport: { x: number; y: number; width: number; height: number; zoom: number };
}

const props = defineProps<Props>();

const tokens = useEncounterTokens(props.encounterId);

// Only render tokens visible in viewport for performance
const visibleTokens = computed(() => {
  return tokens.value.filter(token => {
    const tokenBounds = {
      x: token.position.x * props.viewport.zoom,
      y: token.position.y * props.viewport.zoom,
      width: 50 * props.viewport.zoom,
      height: 50 * props.viewport.zoom
    };
    
    return (
      tokenBounds.x + tokenBounds.width >= props.viewport.x &&
      tokenBounds.x <= props.viewport.x + props.viewport.width &&
      tokenBounds.y + tokenBounds.height >= props.viewport.y &&
      tokenBounds.y <= props.viewport.y + props.viewport.height
    );
  });
});
</script>
```

```vue
<!-- Memoized token component -->
<template>
  <div 
    class="token-sprite"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
      backgroundImage: `url(${texture})`
    }"
  />
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';

interface Props {
  token: Token;
}

const props = defineProps<Props>();
const { token } = toRefs(props);

// Computed properties for reactive updates
const position = computed(() => token.value.position);
const rotation = computed(() => token.value.rotation);
const scale = computed(() => token.value.scale);
const texture = computed(() => token.value.actor.avatar);
</script>

<!-- 
Memoization is built-in to Vue 3's reactivity system.
The component will only re-render when the specific
reactive properties actually change.
-->
```

```typescript
// Batched updates for performance using Vue's nextTick
import { nextTick } from 'vue';

class BatchedStateUpdater {
  private pendingUpdates: StateChange[] = [];
  private isFlushPending = false;
  
  queueUpdate(change: StateChange): void {
    this.pendingUpdates.push(change);
    
    if (!this.isFlushPending) {
      this.isFlushPending = true;
      
      // Use Vue's nextTick for optimal batching
      nextTick(() => {
        this.flushUpdates();
      });
    }
  }
  
  private flushUpdates(): void {
    if (this.pendingUpdates.length > 0) {
      gameActions.applyStateChanges(this.pendingUpdates);
      this.pendingUpdates = [];
    }
    
    this.isFlushPending = false;
  }
}

// Alternative: Use Vue's built-in reactivity for batching
import { ref, watchEffect, debounce } from 'vue';

const pendingStateChanges = ref<StateChange[]>([]);

// Debounced state application
const debouncedApplyChanges = debounce((changes: StateChange[]) => {
  gameActions.applyStateChanges(changes);
  pendingStateChanges.value = [];
}, 16); // ~60fps

// Watch for changes and apply them in batches
watchEffect(() => {
  if (pendingStateChanges.value.length > 0) {
    debouncedApplyChanges([...pendingStateChanges.value]);
  }
});

// Usage
export const queueStateChange = (change: StateChange) => {
  pendingStateChanges.value.push(change);
};
```

```typescript
// Vue-specific performance optimizations
import { shallowRef, triggerRef, markRaw } from 'vue';

// Use shallowRef for large objects that change frequently
const encounterTokens = shallowRef<Record<string, Token>>({});

// Manual reactivity triggering for performance-critical updates
const updateTokenPosition = (tokenId: string, position: Position) => {
  // Direct mutation (faster than reactive updates)
  encounterTokens.value[tokenId].position = position;
  
  // Manually trigger reactivity
  triggerRef(encounterTokens);
};

// Mark non-reactive data to prevent Vue from making it reactive
const gameAssets = markRaw({
  textures: new Map<string, HTMLImageElement>(),
  sounds: new Map<string, HTMLAudioElement>(),
  animations: new Map<string, AnimationData>()
});

// Use provide/inject for deeply nested component communication
import { provide, inject, InjectionKey } from 'vue';

interface GameContext {
  currentEncounterId: Ref<string>;
  selectedTokens: Ref<string[]>;
  gameActions: typeof gameActions;
}

const GameContextKey: InjectionKey<GameContext> = Symbol('GameContext');

// Provider (in root component)
const gameContext: GameContext = {
  currentEncounterId: ref(''),
  selectedTokens: ref([]),
  gameActions
};

provide(GameContextKey, gameContext);

// Consumer (in any child component)
const gameContext = inject(GameContextKey);
if (!gameContext) {
  throw new Error('GameContext not provided');
}
```
```

### Network Optimization

```typescript
// Differential state synchronization
class DifferentialSync {
  private lastSyncVersion = 0;
  
  async syncState(sessionId: string): Promise<void> {
    // Request only changes since last sync
    const response = await fetch(`/api/sessions/${sessionId}/state`, {
      headers: {
        'If-Modified-Since-Version': this.lastSyncVersion.toString()
      }
    });
    
    if (response.status === 304) {
      // No changes since last sync
      return;
    }
    
    const { changes, version } = await response.json();
    
    // Apply differential changes
    gameActions.applyStateChanges(changes);
    this.lastSyncVersion = version;
  }
  
  // Compress WebSocket messages
  private compress(message: any): string {
    const json = JSON.stringify(message);
    
    // Use dictionary compression for common patterns
    return json
      .replace(/"position"/g, '"pos"')
      .replace(/"timestamp"/g, '"ts"')
      .replace(/"sessionId"/g, '"sid"');
  }
}

// Connection pooling and failover
class ConnectionManager {
  private primaryWs: WebSocket;
  private fallbackWs?: WebSocket;
  private connectionStrategy = 'primary';
  
  async ensureConnection(): Promise<WebSocket> {
    if (this.primaryWs?.readyState === WebSocket.OPEN) {
      return this.primaryWs;
    }
    
    // Try fallback if primary fails
    if (this.fallbackWs?.readyState === WebSocket.OPEN) {
      return this.fallbackWs;
    }
    
    // Reconnect to primary
    return this.reconnectPrimary();
  }
  
  private async reconnectPrimary(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      this.primaryWs = new WebSocket(WS_PRIMARY_URL);
      
      this.primaryWs.onopen = () => resolve(this.primaryWs);
      this.primaryWs.onerror = () => {
        // Fall back to secondary
        this.connectFallback().then(resolve).catch(reject);
      };
    });
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

```typescript
// Complete migration from MongoDB to PostgreSQL
class MigrationPhase1 {
  async setupPostgreSQL(): Promise<void> {
    // Create database and run schema migrations
    await this.createDatabase();
    await this.runSchemaMigrations();
    await this.createIndexes();
  }
  
  async migrateCompendiumData(): Promise<void> {
    console.log('Migrating compendium data from MongoDB...');
    
    // Migrate compendium sources
    const mongoSources = await mongodb.collection('compendiumSources').find().toArray();
    for (const source of mongoSources) {
      await postgres.query(`
        INSERT INTO compendium_sources (id, name, version, game_system, publisher, description, is_official)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        source._id,
        source.name,
        source.version,
        source.gameSystem,
        source.publisher,
        source.description,
        source.isOfficial || false
      ]);
    }
    
    // Migrate compendium items (actors, items, spells, etc.)
    const mongoItems = await mongodb.collection('compendiumItems').find().toArray();
    for (const item of mongoItems) {
      await postgres.query(`
        INSERT INTO compendium_items (
          id, source_id, ref_key, name, item_type, category, 
          level, rarity, tags, data, computed_cr, computed_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        item._id,
        item.sourceId,
        item.refKey,
        item.name,
        item.type,
        item.category,
        item.level,
        item.rarity,
        item.tags || [],
        JSON.stringify(item.data),
        item.challengeRating,
        item.cost
      ]);
    }
    
    console.log(`Migrated ${mongoSources.length} sources and ${mongoItems.length} compendium items`);
  }
  
  async migrateCampaignData(): Promise<void> {
    console.log('Migrating campaign data from MongoDB...');
    
    // Migrate campaigns
    const mongoCampaigns = await mongodb.collection('campaigns').find().toArray();
    for (const campaign of mongoCampaigns) {
      await postgres.query(`
        INSERT INTO campaigns (id, name, game_system, gm_user_id, settings)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        campaign._id,
        campaign.name,
        campaign.gameSystem,
        campaign.gmUserId,
        JSON.stringify(campaign.settings || {})
      ]);
    }
    
    // Migrate actors
    const mongoActors = await mongodb.collection('actors').find().toArray();
    for (const actor of mongoActors) {
      await postgres.query(`
        INSERT INTO actors (
          id, campaign_id, name, actor_type, compendium_ref,
          level, character_class, race, base_stats, current_stats,
          inventory, plugin_data, owner_user_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        actor._id,
        actor.campaignId,
        actor.name,
        actor.type,
        actor.compendiumRef,
        actor.level,
        actor.characterClass,
        actor.race,
        JSON.stringify(actor.stats || {}),
        JSON.stringify(actor.currentStats || {}),
        JSON.stringify(actor.inventory || []),
        JSON.stringify(actor.pluginData || {}),
        actor.ownerUserId,
        actor.createdBy
      ]);
    }
    
    // Migrate items
    const mongoItems = await mongodb.collection('items').find().toArray();
    for (const item of mongoItems) {
      await postgres.query(`
        INSERT INTO campaign_items (
          id, campaign_id, name, item_type, compendium_ref,
          base_properties, custom_properties, current_state,
          owner_actor_id, container_item_id, quantity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        item._id,
        item.campaignId,
        item.name,
        item.type,
        item.compendiumRef,
        JSON.stringify(item.properties || {}),
        JSON.stringify(item.customProperties || {}),
        JSON.stringify(item.currentState || {}),
        item.ownerActorId,
        item.containerItemId,
        item.quantity || 1
      ]);
    }
    
    console.log(`Migrated ${mongoCampaigns.length} campaigns, ${mongoActors.length} actors, and ${mongoItems.length} items`);
  }
  
  async migrateMediaFiles(): Promise<void> {
    console.log('Migrating media files from MongoDB GridFS...');
    
    const bucket = new mongodb.GridFSBucket(mongodb.db(), { bucketName: 'uploads' });
    const files = await bucket.find().toArray();
    
    for (const file of files) {
      // Download file from GridFS
      const downloadStream = bucket.openDownloadStream(file._id);
      const chunks: Buffer[] = [];
      
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('end', async () => {
        const fileData = Buffer.concat(chunks);
        const checksum = createHash('sha256').update(fileData).digest('hex');
        
        // Determine storage strategy based on file size
        let storageFields = {};
        if (fileData.length < 1024 * 1024) { // < 1MB, store in database
          storageFields = { file_data: fileData };
        } else { // >= 1MB, store on filesystem
          const filename = `${file._id}-${file.filename}`;
          const filePath = path.join(process.env.UPLOAD_DIR, filename);
          await fs.writeFile(filePath, fileData);
          storageFields = { file_path: filePath };
        }
        
        await postgres.query(`
          INSERT INTO media_files (
            id, campaign_id, filename, original_name, mime_type,
            file_size, checksum, media_type, metadata, created_by,
            ${Object.keys(storageFields).join(', ')}
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${Object.keys(storageFields).map((_, i) => `$${11 + i}`).join(', ')})
        `, [
          file._id,
          file.metadata?.campaignId,
          file.filename,
          file.filename,
          file.contentType || 'application/octet-stream',
          file.length,
          checksum,
          file.metadata?.mediaType || 'unknown',
          JSON.stringify(file.metadata || {}),
          file.metadata?.uploadedBy,
          ...Object.values(storageFields)
        ]);
      });
    }
    
    console.log(`Migrated ${files.length} media files`);
  }
  
  async setupRedisSession(): Promise<void> {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    });
    
    // Set up pub/sub for real-time updates
    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe('session:*', 'encounter:*');
  }
  
  async validateMigration(): Promise<void> {
    // Validate data integrity after migration
    const mongoActorCount = await mongodb.collection('actors').countDocuments();
    const pgActorCount = await postgres.query('SELECT COUNT(*) FROM actors').then(r => parseInt(r.rows[0].count));
    
    if (mongoActorCount !== pgActorCount) {
      throw new Error(`Actor migration failed: MongoDB has ${mongoActorCount}, PostgreSQL has ${pgActorCount}`);
    }
    
    const mongoItemCount = await mongodb.collection('items').countDocuments();
    const pgItemCount = await postgres.query('SELECT COUNT(*) FROM campaign_items').then(r => parseInt(r.rows[0].count));
    
    if (mongoItemCount !== pgItemCount) {
      throw new Error(`Item migration failed: MongoDB has ${mongoItemCount}, PostgreSQL has ${pgItemCount}`);
    }
    
    console.log('Migration validation successful!');
  }
}
```

### Phase 2: State Management (Weeks 3-4)

```typescript
// Replace Pinia with Zustand normalized store
class MigrationPhase2 {
  async replaceStateStores(): Promise<void> {
    // Create migration shim for gradual transition
    const piniaBridge = {
      // Bridge Pinia getters to Zustand selectors
      useActorStore: () => ({
        actors: gameSelectors.getAllActors(),
        getActor: (id: string) => gameSelectors.getActor(id),
        updateActor: (actor: Actor) => gameActions.setActor(actor)
      }),
      
      // Bridge Pinia actions to Zustand actions
      useEncounterStore: () => ({
        tokens: gameSelectors.getCurrentEncounterTokens(),
        moveToken: (tokenId: string, position: Position) => 
          gameActions.moveToken(tokenId, position)
      })
    };
    
    // Replace stores incrementally
    await this.migrateComponentsToZustand();
  }
  
  async setupQueryLayer(): Promise<void> {
    // Configure TanStack Query with optimal settings
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30000,
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
            return failureCount < 3;
          }
        }
      }
    });
  }
}
```

### Phase 3: Protocol Implementation (Weeks 5-6)

```typescript
// Implement GM-authoritative protocol
class MigrationPhase3 {
  async implementActionProtocol(): Promise<void> {
    // Replace direct API calls with action requests
    const actionController = new ActionController();
    
    // Update all action-triggering components
    await this.replaceDirectAPICallsWithActions();
    
    // Implement GM approval interface
    await this.createGMApprovalUI();
  }
  
  async setupReliableMessaging(): Promise<void> {
    // Implement message acknowledgments
    this.websocketClient = new ReliableWebSocketClient();
    
    // Add message persistence for offline scenarios
    await this.setupOfflineMessageQueue();
  }
}
```

### Phase 4: Performance Optimization (Weeks 7-8)

```typescript
// Add performance monitoring and optimization
class MigrationPhase4 {
  async optimizeQueries(): Promise<void> {
    // Add database indexes based on usage patterns
    await this.analyzeQueryPatterns();
    await this.createOptimalIndexes();
    
    // Implement query result caching
    await this.setupIntelligentCaching();
  }
  
  async optimizeClientPerformance(): Promise<void> {
    // Add virtualization for large lists
    await this.implementVirtualization();
    
    // Optimize re-rendering with proper memoization
    await this.optimizeComponentMemoization();
    
    // Implement batched updates
    await this.setupBatchedStateUpdates();
  }
}
```

## Testing Strategy

### State Consistency Tests

```typescript
describe('State Consistency', () => {
  it('should maintain consistency during concurrent updates', async () => {
    const sessionId = await createTestSession();
    const encounterId = await createTestEncounter(sessionId);
    
    // Simulate concurrent token moves
    const moves = [
      { tokenId: 'token1', position: { x: 100, y: 100 } },
      { tokenId: 'token1', position: { x: 150, y: 100 } },
      { tokenId: 'token1', position: { x: 200, y: 100 } }
    ];
    
    const results = await Promise.all(
      moves.map(move => requestAction('token:move', move))
    );
    
    // Verify final state is consistent
    const finalState = await getEncounterState(encounterId);
    expect(finalState.tokens.token1.position).toEqual({ x: 200, y: 100 });
    
    // Verify all changes are in event log
    const events = await getEventLog(sessionId);
    expect(events.filter(e => e.event_type === 'token:move')).toHaveLength(3);
  });
  
  it('should handle GM disconnection gracefully', async () => {
    const sessionId = await createTestSession();
    const gmSocket = await connectAsGM(sessionId);
    const playerSocket = await connectAsPlayer(sessionId);
    
    // Player requests action
    playerSocket.emit('action:request', {
      type: 'attack',
      target: 'goblin1'
    });
    
    // GM disconnects before responding
    gmSocket.disconnect();
    
    // Verify action is queued
    await delay(1000);
    const pendingActions = await getPendingActions(sessionId);
    expect(pendingActions).toHaveLength(1);
    
    // GM reconnects
    const newGMSocket = await connectAsGM(sessionId);
    
    // Verify queued actions are presented
    const queuedActions = await waitForEvent(newGMSocket, 'action:queued');
    expect(queuedActions).toHaveLength(1);
  });
});
```

### Performance Benchmarks

```typescript
describe('Performance Benchmarks', () => {
  it('should handle 1000 token updates in under 100ms', async () => {
    const tokens = Array.from({ length: 1000 }, (_, i) => ({
      id: `token_${i}`,
      position: { x: Math.random() * 1000, y: Math.random() * 1000 }
    }));
    
    const startTime = performance.now();
    
    gameActions.updateEntities({
      tokens: tokens.reduce((acc, token) => {
        acc[token.id] = token;
        return acc;
      }, {})
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
  
  it('should maintain 60fps during heavy state updates', async () => {
    const frameTimes: number[] = [];
    let frameCount = 0;
    
    const measureFrame = () => {
      const start = performance.now();
      
      // Simulate heavy state update
      gameActions.updateEntities({
        tokens: generateRandomTokenUpdates(100)
      });
      
      requestAnimationFrame(() => {
        frameTimes.push(performance.now() - start);
        frameCount++;
        
        if (frameCount < 60) {
          measureFrame();
        }
      });
    };
    
    measureFrame();
    
    await new Promise(resolve => {
      const checkComplete = () => {
        if (frameCount >= 60) {
          resolve(undefined);
        } else {
          setTimeout(checkComplete, 10);
        }
      };
      checkComplete();
    });
    
    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(16.67); // 60fps = 16.67ms per frame
  });
});
```

## Conclusion

This optimal state architecture provides:

1. **Performance**: Sub-100ms updates for critical gameplay actions
2. **Scalability**: Handles thousands of concurrent users with horizontal scaling
3. **Reliability**: Eventual consistency with conflict resolution and audit trails  
4. **Developer Experience**: Type-safe APIs, reactive queries, and debugging tools
5. **Future-Proof**: Extensible design that can adapt to new requirements

The architecture balances complexity with performance, providing a solid foundation for a production-ready VTT system that can scale from small friend groups to large commercial deployments.

The phased migration approach ensures minimal disruption to current development while systematically improving the underlying architecture. Each phase builds upon the previous one, allowing for iterative testing and refinement.

Most importantly, this architecture is specifically designed for the GM-Authoritative model, ensuring that the GM remains the central authority while providing the technical infrastructure needed for smooth, responsive gameplay.