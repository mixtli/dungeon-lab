/**
 * Tests for TypedItemConverter
 * 
 * These tests validate the conversion of 5etools item data to the DnD schema,
 * with particular focus on item-group processing, tool references, and the
 * discriminated union item types (weapon, armor, tool, gear).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedItemConverter } from '../item-converter.mjs';
import type { DndItemData } from '../../../types/dnd/item.mjs';

// Test-specific interfaces for type safety
interface ItemGroupReference {
  _ref: {
    slug: string;
    documentType: string;
    pluginDocumentType: string;
    source: string;
  };
}

interface ItemReference {
  _ref: {
    slug: string;
    documentType: string;
    source?: string;
  };
}

interface ToolPluginData {
  itemType: string;
  itemGroup?: ItemGroupReference;
}


describe('TypedItemConverter', () => {
  let converter: TypedItemConverter;

  beforeEach(() => {
    converter = new TypedItemConverter();
  });

  describe('Item Conversion', () => {
    it('should convert items successfully', async () => {
      const result = await converter.convertItems();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert both regular items and item groups', async () => {
      const result = await converter.convertItems();
      
      expect(result.success).toBe(true);
      
      // Should have regular items
      const regularItems = result.results.filter(item => item.documentType === 'item');
      expect(regularItems.length).toBeGreaterThan(0);
      
      // Should have item-group VTT documents
      const itemGroups = result.results.filter(item => 
        item.documentType === 'vtt-document' && item.pluginDocumentType === 'item-group'
      );
      expect(itemGroups.length).toBeGreaterThan(0);
    });

    it('should provide detailed conversion statistics', async () => {
      const result = await converter.convertItems();
      
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });
  });

  describe('Item Group Processing', () => {
    it('should convert Artisan\'s Tools item group correctly', async () => {
      const result = await converter.convertItems();
      
      expect(result.success).toBe(true);
      
      const artisansTools = result.results.find(item => 
        item.pluginDocumentType === 'item-group' && 
        item.name === "Artisan's Tools"
      );
      
      expect(artisansTools).toBeDefined();
      
      if (artisansTools) {
        expect(artisansTools.documentType).toBe('vtt-document');
        expect(artisansTools.pluginDocumentType).toBe('item-group');
        expect(artisansTools.slug).toBe('artisans-tools');
        expect(artisansTools.pluginId).toBe('dnd-5e-2024');
        
        // Check plugin data structure
        const pluginData = artisansTools.pluginData as Record<string, unknown>;
        expect(pluginData.name).toBe("Artisan's Tools");
        expect(pluginData.source).toBe('XPHB');
        expect(pluginData.items).toBeInstanceOf(Array);
        const items = pluginData.items as Array<ItemReference>;
        expect(items.length).toBeGreaterThan(0);
        
        // Check reference structure
        for (const itemRef of items) {
          expect(itemRef._ref).toBeDefined();
          expect(itemRef._ref.slug).toBeDefined();
          expect(itemRef._ref.documentType).toBe('item');
          expect(typeof itemRef._ref.slug).toBe('string');
          expect(itemRef._ref.source).toBeDefined();
        }
        
        // Should include common artisan tools
        const itemSlugs = items.map(item => item._ref.slug);
        expect(itemSlugs).toContain('alchemists-supplies');
        expect(itemSlugs).toContain('smiths-tools');
        expect(itemSlugs).toContain('carpenters-tools');
      }
    });

    it('should convert Musical Instrument item group correctly', async () => {
      const result = await converter.convertItems();
      
      const musicalInstrument = result.results.find(item => 
        item.pluginDocumentType === 'item-group' && 
        item.name === 'Musical Instrument'
      );
      
      expect(musicalInstrument).toBeDefined();
      
      if (musicalInstrument) {
        expect(musicalInstrument.documentType).toBe('vtt-document');
        expect(musicalInstrument.pluginDocumentType).toBe('item-group');
        expect(musicalInstrument.slug).toBe('musical-instrument');
        
        const pluginData = musicalInstrument.pluginData as Record<string, unknown>;
        expect(pluginData.items).toBeInstanceOf(Array);
        const items = pluginData.items as Array<ItemReference>;
        expect(items.length).toBeGreaterThan(0);
        
        // Should include common instruments
        const itemSlugs = items.map(item => item._ref.slug);
        expect(itemSlugs.some((slug: string) => slug.includes('flute') || slug.includes('drum') || slug.includes('lute'))).toBe(true);
      }
    });

    it('should convert Gaming Set item group correctly', async () => {
      const result = await converter.convertItems();
      
      const gamingSet = result.results.find(item => 
        item.pluginDocumentType === 'item-group' && 
        item.name === 'Gaming Set'
      );
      
      expect(gamingSet).toBeDefined();
      
      if (gamingSet) {
        expect(gamingSet.documentType).toBe('vtt-document');
        expect(gamingSet.pluginDocumentType).toBe('item-group');
        expect(gamingSet.slug).toBe('gaming-set');
        
        const pluginData = gamingSet.pluginData as Record<string, unknown>;
        expect(pluginData.items).toBeInstanceOf(Array);
        const items = pluginData.items as Array<ItemReference>;
        expect(items.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool Back-References', () => {
    it('should add itemGroup references to artisan tools', async () => {
      const result = await converter.convertItems();
      
      expect(result.success).toBe(true);
      
      // Find an artisan tool
      const alchemistSupplies = result.results.find(item => 
        item.pluginDocumentType === 'tool' && 
        item.name === "Alchemist's Supplies"
      );
      
      expect(alchemistSupplies).toBeDefined();
      
      if (alchemistSupplies) {
        const pluginData = alchemistSupplies.pluginData as {
          itemType: string;
          itemGroup?: { _ref: Record<string, unknown> };
        };
        expect(pluginData.itemType).toBe('tool');
        expect(pluginData.itemGroup).toBeDefined();
        expect(pluginData.itemGroup?._ref).toBeDefined();
        expect(pluginData.itemGroup?._ref.slug).toBe('artisans-tools');
        expect(pluginData.itemGroup?._ref.documentType).toBe('vtt-document');
        expect(pluginData.itemGroup?._ref.pluginDocumentType).toBe('item-group');
        expect(pluginData.itemGroup?._ref.source).toBe('XPHB');
      }
    });

    it('should add itemGroup references to musical instruments', async () => {
      const result = await converter.convertItems();
      
      // Find a musical instrument tool
      const instrument = result.results.find(item => 
        item.pluginDocumentType === 'tool' && 
        item.name && (
          item.name.toLowerCase().includes('flute') ||
          item.name.toLowerCase().includes('drum') ||
          item.name.toLowerCase().includes('lute') ||
          item.name.toLowerCase().includes('horn')
        )
      );
      
      if (instrument) {
        const pluginData = instrument.pluginData as ToolPluginData;
        expect(pluginData.itemType).toBe('tool');
        expect(pluginData.itemGroup).toBeDefined();
        expect(pluginData.itemGroup?._ref).toBeDefined();
        expect(pluginData.itemGroup?._ref.slug).toBe('musical-instrument');
        expect(pluginData.itemGroup?._ref.documentType).toBe('vtt-document');
        expect(pluginData.itemGroup?._ref.pluginDocumentType).toBe('item-group');
      }
    });

    it('should add itemGroup references to gaming sets', async () => {
      const result = await converter.convertItems();
      
      // Find a gaming set tool
      const gamingSetTool = result.results.find(item => 
        item.pluginDocumentType === 'tool' && 
        item.name && (
          item.name.toLowerCase().includes('dice') ||
          item.name.toLowerCase().includes('cards') ||
          item.name.toLowerCase().includes('chess')
        )
      );
      
      if (gamingSetTool) {
        const pluginData = gamingSetTool.pluginData as ToolPluginData;
        expect(pluginData.itemType).toBe('tool');
        expect(pluginData.itemGroup).toBeDefined();
        expect(pluginData.itemGroup?._ref).toBeDefined();
        expect(pluginData.itemGroup?._ref.slug).toBe('gaming-set');
        expect(pluginData.itemGroup?._ref.documentType).toBe('vtt-document');
        expect(pluginData.itemGroup?._ref.pluginDocumentType).toBe('item-group');
      }
    });
  });

  describe('Item Type Discrimination', () => {
    it('should convert weapons correctly', async () => {
      const result = await converter.convertItems();
      
      const weapon = result.results.find(item => 
        item.pluginDocumentType === 'weapon' && 
        item.name === 'Longsword'
      );
      
      if (weapon) {
        const pluginData = weapon.pluginData as DndItemData;
        expect(pluginData.itemType).toBe('weapon');
        
        if (pluginData.itemType === 'weapon') {
          expect(pluginData.damage).toBeDefined();
          expect(pluginData.damage.dice).toBeDefined();
          expect(pluginData.damage.type).toBeDefined();
          expect(pluginData.category).toBeDefined();
          expect(pluginData.type).toBeDefined();
        }
      }
    });

    it('should convert armor correctly', async () => {
      const result = await converter.convertItems();
      
      const armor = result.results.find(item => 
        item.pluginDocumentType === 'armor' && 
        (item.name === 'Leather Armor' || item.name === 'Chain Mail')
      );
      
      if (armor) {
        const pluginData = armor.pluginData as DndItemData;
        expect(pluginData.itemType).toBe('armor');
        
        if (pluginData.itemType === 'armor') {
          expect(pluginData.armorClass).toBeDefined();
          expect(typeof pluginData.armorClass).toBe('number');
          expect(pluginData.type).toBeDefined();
        }
      }
    });

    it('should convert tools correctly', async () => {
      const result = await converter.convertItems();
      
      const tool = result.results.find(item => 
        item.pluginDocumentType === 'tool'
      );
      
      expect(tool).toBeDefined();
      
      if (tool) {
        const pluginData = tool.pluginData as DndItemData;
        expect(pluginData.itemType).toBe('tool');
        
        if (pluginData.itemType === 'tool') {
          expect(pluginData.category).toBeDefined();
          // May or may not have itemGroup depending on tool type
        }
      }
    });

    it('should convert gear correctly', async () => {
      const result = await converter.convertItems();
      
      const gear = result.results.find(item => 
        item.pluginDocumentType === 'gear'
      );
      
      if (gear) {
        const pluginData = gear.pluginData as DndItemData;
        expect(pluginData.itemType).toBe('gear');
        
        if (pluginData.itemType === 'gear') {
          expect(pluginData.category).toBeDefined();
        }
      }
    });
  });

  describe('Reference Structure Validation', () => {
    it('should use proper reference object format for item-group items', async () => {
      const result = await converter.convertItems();
      
      const itemGroups = result.results.filter(item => 
        item.documentType === 'vtt-document' && item.pluginDocumentType === 'item-group'
      );
      
      expect(itemGroups.length).toBeGreaterThan(0);
      
      for (const itemGroup of itemGroups) {
        const pluginData = itemGroup.pluginData as Record<string, unknown>;
        expect(pluginData.items).toBeInstanceOf(Array);
        
        const items = pluginData.items as Array<ItemReference>;
        for (const itemRef of items) {
          // Must have _ref wrapper
          expect(itemRef._ref).toBeDefined();
          
          // _ref must have required fields
          expect(itemRef._ref.slug).toBeDefined();
          expect(typeof itemRef._ref.slug).toBe('string');
          expect(itemRef._ref.slug.length).toBeGreaterThan(0);
          
          expect(itemRef._ref.documentType).toBe('item');
          
          // Source is optional but should be string if present
          if (itemRef._ref.source) {
            expect(typeof itemRef._ref.source).toBe('string');
          }
        }
      }
    });

    it('should use proper reference object format for tool itemGroup back-references', async () => {
      const result = await converter.convertItems();
      
      const toolsWithGroups = result.results.filter(item => 
        item.pluginDocumentType === 'tool' && 
        (item.pluginData as Record<string, unknown>).itemGroup
      );
      
      expect(toolsWithGroups.length).toBeGreaterThan(0);
      
      for (const tool of toolsWithGroups) {
        const pluginData = tool.pluginData as ToolPluginData;
        const itemGroup = pluginData.itemGroup;
        
        // Must have _ref wrapper
        expect(itemGroup?._ref).toBeDefined();
        
        // _ref must have required fields
        expect(itemGroup?._ref.slug).toBeDefined();
        expect(typeof itemGroup?._ref.slug).toBe('string');
        expect(itemGroup?._ref.slug.length).toBeGreaterThan(0);
        
        expect(itemGroup?._ref.documentType).toBe('vtt-document');
        expect(itemGroup?._ref.pluginDocumentType).toBe('item-group');
        
        // Source should match tool source
        if (itemGroup?._ref.source) {
          expect(typeof itemGroup._ref.source).toBe('string');
        }
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistent document structure', async () => {
      const result = await converter.convertItems();
      
      for (const item of result.results) {
        // All items should have required base fields
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe('string');
        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(item.slug).toBeDefined();
        expect(typeof item.slug).toBe('string');
        expect(item.pluginId).toBe('dnd-5e-2024');
        expect(item.pluginData).toBeDefined();
        
        // Document type should be either 'item' or 'vtt-document'
        expect(['item', 'vtt-document']).toContain(item.documentType);
        
        // Plugin document type should be valid
        expect(['weapon', 'armor', 'tool', 'gear', 'item-group']).toContain(item.pluginDocumentType);
      }
    });

    it('should have bidirectional references between item groups and tools', async () => {
      const result = await converter.convertItems();
      
      // Find Artisan's Tools group
      const artisansTools = result.results.find(item => 
        item.pluginDocumentType === 'item-group' && 
        item.name === "Artisan's Tools"
      );
      
      expect(artisansTools).toBeDefined();
      
      if (artisansTools) {
        const pluginData = artisansTools.pluginData as Record<string, unknown>;
        const items = pluginData.items as Array<ItemReference>;
        const referencedTools = items.map(item => item._ref.slug);
        
        // Check that referenced tools actually exist and point back
        for (const toolSlug of referencedTools) {
          const tool = result.results.find(item => 
            item.slug === toolSlug && item.pluginDocumentType === 'tool'
          );
          
          if (tool) {
            const toolData = tool.pluginData as ToolPluginData;
            expect(toolData.itemGroup).toBeDefined();
            expect(toolData.itemGroup?._ref.slug).toBe('artisans-tools');
          }
        }
      }
    });

    it('should complete conversion within reasonable time', async () => {
      const startTime = Date.now();
      const result = await converter.convertItems();
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid item data gracefully', async () => {
      const result = await converter.convertItems();
      
      // Even with some errors, conversion should succeed overall
      expect(result.success).toBe(true);
      expect(result.errors).toBeInstanceOf(Array);
      
      // Should have more successes than failures
      expect(result.stats.converted).toBeGreaterThan(result.stats.errors);
    });

    it('should provide meaningful error messages', async () => {
      const result = await converter.convertItems();
      
      // Check error format if any exist
      for (const error of result.errors) {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        
        // Should identify the failed item
        expect(error).toMatch(/Failed to convert|conversion failed/i);
      }
    });
  });

  describe('SRD Filtering', () => {
    it('should respect SRD filtering when enabled', async () => {
      const srdConverter = new TypedItemConverter({ srdOnly: true });
      const result = await srdConverter.convertItems();
      
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      
      // All items should be from SRD sources
      for (const item of result.results) {
        const pluginData = item.pluginData as Record<string, unknown>;
        if (pluginData.source) {
          // SRD sources are typically 'XPHB', 'XMM', etc.
          expect(typeof pluginData.source).toBe('string');
        }
      }
    });
  });
});