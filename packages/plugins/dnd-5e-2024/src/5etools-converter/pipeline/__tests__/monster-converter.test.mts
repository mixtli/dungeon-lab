/**
 * Tests for TypedMonsterConverter
 * 
 * Focuses on validating the conversion of 5etools monster data to D&D 5e 2024 format,
 * with particular attention to spellcasting structure fixes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedMonsterConverter } from '../monster-converter.mjs';
import type { EtoolsMonster } from '../../../5etools-types/monsters.mjs';

describe('TypedMonsterConverter', () => {
  let converter: TypedMonsterConverter;

  beforeEach(() => {
    converter = new TypedMonsterConverter();
  });

  describe('Basic Monster Conversion', () => {
    it('should convert a basic monster without spellcasting', async () => {
      const basicMonster: EtoolsMonster = {
        name: 'Test Goblin',
        source: 'XPHB',
        size: ['S'],
        type: 'humanoid',
        alignment: ['N', 'E'],
        ac: [15],
        hp: { average: 7, formula: '2d6' },
        speed: { walk: 30 },
        str: 8,
        dex: 14,
        con: 10,
        int: 10,
        wis: 8,
        cha: 8,
        skill: {
          stealth: '+6'
        },
        senses: ['darkvision 60 ft.'],
        passive: 9,
        languages: ['Common', 'Goblin'],
        cr: '1/4',
        trait: [{
          name: 'Nimble Escape',
          entries: ['The goblin can take the Dash or Disengage action as a bonus action on each of its turns.']
        }],
        action: [{
          name: 'Scimitar',
          entries: ['{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}5 ({@damage 1d6 + 2}) slashing damage.']
        }]
      };

      const result = await converter.convertItem(basicMonster);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        expect(result.document.name).toBe('Test Goblin');
        expect(result.document.pluginData.name).toBe('Test Goblin');
        expect(result.document.pluginData.size).toBe('small');
        expect(result.document.pluginData.type).toBe('humanoid');
        expect(result.document.pluginData.abilities.strength).toBe(8);
        expect(result.document.pluginData.abilities.dexterity).toBe(14);
        expect(result.document.pluginData.challengeRating).toBe(0.25);
        expect(result.document.pluginData.spellcasting).toBeUndefined();
      }
    });
  });

  describe('Spellcasting Conversion', () => {
    it('should convert monster spellcasting with proper ability names and spell references', async () => {
      const spellcasterMonster: EtoolsMonster = {
        name: 'Adult Black Dragon',
        source: 'XPHB',
        size: ['H'],
        type: 'dragon',
        alignment: ['C', 'E'],
        ac: [19],
        hp: { average: 195, formula: '17d12 + 85' },
        speed: { walk: 40, fly: 80, swim: 40 },
        str: 23,
        dex: 14,
        con: 21,
        int: 14,
        wis: 13,
        cha: 17,
        save: {
          dex: '+7',
          con: '+11',
          wis: '+6',
          cha: '+8'
        },
        skill: {
          perception: '+11',
          stealth: '+7'
        },
        resist: ['acid'],
        immune: ['acid'],
        senses: ['blindsight 60 ft.', 'darkvision 120 ft.'],
        passive: 21,
        languages: ['Common', 'Draconic'],
        cr: '14',
        spellcasting: [{
          name: 'Innate Spellcasting',
          type: 'spellcasting',
          headerEntries: [
            'The dragon\'s innate spellcasting ability is Charisma (spell save {@dc 14}, {@hit 6} to hit with spell attacks). It can innately cast the following spells, requiring no material components:'
          ],
          will: [
            '{@spell Detect Magic|XPHB}',
            '{@spell Fear|XPHB}'
          ],
          daily: {
            '1e': [
              '{@spell Speak with Dead|XPHB}',
              '{@spell Vitriolic Sphere|XPHB}'
            ]
          },
          ability: 'cha'
        }],
        action: [{
          name: 'Multiattack',
          entries: ['The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.']
        }]
      };

      const result = await converter.convertItem(spellcasterMonster);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();

      if (result.document) {
        const spellcasting = result.document.pluginData.spellcasting;
        
        // Test that spellcasting exists
        expect(spellcasting).toBeDefined();
        
        if (spellcasting) {
          // Test ability name is converted from "cha" to "charisma"
          expect(spellcasting.ability).toBe('charisma');
          
          // Test spell save DC and attack bonus extraction
          expect(spellcasting.spellSaveDC).toBe(14);
          expect(spellcasting.spellAttackBonus).toBe(6);
          
          // Test at-will spells are proper references
          expect(spellcasting.spells.atWill).toBeDefined();
          expect(spellcasting.spells.atWill).toHaveLength(2);
          
          const detectMagic = spellcasting.spells.atWill![0];
          expect(detectMagic).toEqual({
            _ref: {
              type: 'vtt-document',
              slug: 'detect-magic',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
          
          const fear = spellcasting.spells.atWill![1];
          expect(fear).toEqual({
            _ref: {
              type: 'vtt-document',
              slug: 'fear',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
          
          // Test daily spells are converted from "1e" format to explicit uses
          expect(spellcasting.spells.daily).toBeDefined();
          expect(spellcasting.spells.daily).toHaveLength(2);
          
          const speakWithDead = spellcasting.spells.daily![0];
          expect(speakWithDead.uses).toBe(1);
          expect(speakWithDead.spell).toEqual({
            _ref: {
              type: 'vtt-document',
              slug: 'speak-with-dead',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
          
          const vitriolicSphere = spellcasting.spells.daily![1];
          expect(vitriolicSphere.uses).toBe(1);
          expect(vitriolicSphere.spell).toEqual({
            _ref: {
              type: 'vtt-document',
              slug: 'vitriolic-sphere',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
        }
      }
    });

    it('should handle different daily spell usage patterns', async () => {
      const testMonster: EtoolsMonster = {
        name: 'Test Caster',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [12],
        hp: { average: 20, formula: '4d8' },
        speed: { walk: 30 },
        str: 10,
        dex: 10,
        con: 10,
        int: 16,
        wis: 12,
        cha: 14,
        cr: '1',
        spellcasting: [{
          name: 'Spellcasting',
          type: 'spellcasting',
          headerEntries: [
            'The caster\'s spellcasting ability is Intelligence (spell save {@dc 13}, {@hit 5} to hit with spell attacks).'
          ],
          daily: {
            '2e': ['{@spell Magic Missile|XPHB}'],
            '3': ['{@spell Fireball|XPHB}', '{@spell Lightning Bolt|XPHB}']
          },
          ability: 'int'
        }]
      };

      const result = await converter.convertItem(testMonster);

      expect(result.success).toBe(true);
      expect(result.document?.pluginData.spellcasting).toBeDefined();

      const spellcasting = result.document!.pluginData.spellcasting!;
      
      // Test ability conversion
      expect(spellcasting.ability).toBe('intelligence');
      
      // Test different usage patterns
      expect(spellcasting.spells.daily).toHaveLength(3);
      
      // "2e" should mean 2 uses per spell
      const magicMissile = spellcasting.spells.daily!.find(s => 
        s.spell._ref.slug === 'magic-missile'
      );
      expect(magicMissile?.uses).toBe(2);
      
      // "3" should mean 3 uses total (distributed among spells)
      const fireball = spellcasting.spells.daily!.find(s => 
        s.spell._ref.slug === 'fireball'
      );
      const lightningBolt = spellcasting.spells.daily!.find(s => 
        s.spell._ref.slug === 'lightning-bolt'
      );
      expect(fireball?.uses).toBe(3);
      expect(lightningBolt?.uses).toBe(3);
    });

    it('should handle wisdom-based spellcasting', async () => {
      const testMonster: EtoolsMonster = {
        name: 'Test Cleric',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['L', 'G'],
        ac: [15],
        hp: { average: 30, formula: '6d8' },
        speed: { walk: 25 },
        str: 12,
        dex: 10,
        con: 12,
        int: 10,
        wis: 16,
        cha: 12,
        cr: '2',
        spellcasting: [{
          name: 'Spellcasting',
          type: 'spellcasting',
          ability: 'wis',
          dc: 13,
          mod: 5,
          will: ['{@spell Guidance|XPHB}', '{@spell Sacred Flame|XPHB}']
        }]
      };

      const result = await converter.convertItem(testMonster);

      expect(result.success).toBe(true);
      expect(result.document?.pluginData.spellcasting).toBeDefined();

      const spellcasting = result.document!.pluginData.spellcasting!;
      
      // Test wisdom ability
      expect(spellcasting.ability).toBe('wisdom');
      
      // Test fallback to provided DC/mod values
      expect(spellcasting.spellSaveDC).toBe(13);
      expect(spellcasting.spellAttackBonus).toBe(5);
      
      // Test at-will spells
      expect(spellcasting.spells.atWill).toHaveLength(2);
      expect(spellcasting.spells.atWill![0]._ref.slug).toBe('guidance');
      expect(spellcasting.spells.atWill![1]._ref.slug).toBe('sacred-flame');
    });
  });

  describe('Spell Reference Creation', () => {
    it('should handle spell names with special characters', async () => {
      const testMonster: EtoolsMonster = {
        name: 'Test Monster',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [10],
        hp: { average: 10, formula: '2d8' },
        speed: { walk: 30 },
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        cr: '1/8',
        spellcasting: [{
          name: 'Spellcasting',
          type: 'spellcasting',
          ability: 'cha',
          will: [
            "{@spell Melf's Acid Arrow|XPHB}",
            '{@spell Tasha\'s Hideous Laughter|XPHB}',
            '{@spell Otto\'s Irresistible Dance|XPHB}'
          ]
        }]
      };

      const result = await converter.convertItem(testMonster);
      
      expect(result.success).toBe(true);
      const spells = result.document!.pluginData.spellcasting!.spells.atWill!;
      
      // Test that apostrophes and special characters are handled in slugs
      expect(spells[0]._ref.slug).toBe('melfs-acid-arrow');
      expect(spells[1]._ref.slug).toBe('tashas-hideous-laughter');
      expect(spells[2]._ref.slug).toBe('ottos-irresistible-dance');
    });

    it('should handle spells without source information', async () => {
      const testMonster: EtoolsMonster = {
        name: 'Test Monster',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [10],
        hp: { average: 10, formula: '2d8' },
        speed: { walk: 30 },
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        cr: '1/8',
        spellcasting: [{
          name: 'Spellcasting',
          type: 'spellcasting',
          ability: 'cha',
          will: [
            '{@spell Detect Magic}', // No source specified
            'Plain Spell Name' // No 5etools markup at all
          ]
        }]
      };

      const result = await converter.convertItem(testMonster);
      
      expect(result.success).toBe(true);
      const spells = result.document!.pluginData.spellcasting!.spells.atWill!;
      
      // Should default to XPHB source when not specified
      expect(spells[0]._ref.source).toBe('xphb');
      expect(spells[0]._ref.slug).toBe('detect-magic');
      
      // Should handle plain text spell names
      expect(spells[1]._ref.source).toBe('xphb');
      expect(spells[1]._ref.slug).toBe('plain-spell-name');
    });
  });

  describe('Real World Examples', () => {
    it('should convert Adult Black Dragon exactly as requested', async () => {
      const adultBlackDragon: EtoolsMonster = {
        name: 'Adult Black Dragon',
        source: 'XPHB',
        size: ['H'],
        type: 'dragon',
        alignment: ['C', 'E'],
        ac: [19],
        hp: { average: 195, formula: '17d12 + 85' },
        speed: { walk: 40, fly: 80, swim: 40 },
        str: 23,
        dex: 14,
        con: 21,
        int: 14,
        wis: 13,
        cha: 17,
        spellcasting: [{
          name: 'Innate Spellcasting',
          type: 'spellcasting',
          headerEntries: [
            'The dragon\'s innate spellcasting ability is Charisma (spell save {@dc 14}, {@hit 6} to hit with spell attacks). It can innately cast the following spells, requiring no material components:'
          ],
          will: [
            '{@spell Detect Magic|XPHB}',
            '{@spell Fear|XPHB}'
          ],
          daily: {
            '1e': [
              '{@spell Speak with Dead|XPHB}',
              '{@spell Vitriolic Sphere|XPHB}'
            ]
          },
          ability: 'cha'
        }],
        cr: '14'
      };

      const result = await converter.convertItem(adultBlackDragon);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();

      if (result.document) {
        const spellcasting = result.document.pluginData.spellcasting!;
        
        // Verify all the user's requested fixes are working
        console.log('Adult Black Dragon spellcasting output:');
        console.log(JSON.stringify(spellcasting, null, 2));
        
        // 1. Ability should be "charisma" not "cha"
        expect(spellcasting.ability).toBe('charisma');
        
        // 2. Spells should be proper _ref structures, not embedded 5etools markup
        expect(spellcasting.spells.atWill![0]).toEqual({
          _ref: {
            type: 'vtt-document',
            slug: 'detect-magic',
            source: 'xphb',
            pluginDocumentType: 'spell'
          }
        });
        
        // 3. Daily "1e" should be converted to explicit uses count
        expect(spellcasting.spells.daily![0]).toEqual({
          spell: {
            _ref: {
              type: 'vtt-document',
              slug: 'speak-with-dead',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          },
          uses: 1
        });
        
        // Additional validation that the structure is exactly what was requested
        expect(spellcasting.spells.daily).toHaveLength(2);
        expect(spellcasting.spells.daily![1].uses).toBe(1);
        expect(spellcasting.spells.daily![1].spell._ref.slug).toBe('vitriolic-sphere');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle monsters without spellcasting gracefully', async () => {
      const nonSpellcaster: EtoolsMonster = {
        name: 'Simple Beast',
        source: 'XPHB',
        size: ['L'],
        type: 'beast',
        alignment: ['U'],
        ac: [12],
        hp: { average: 30, formula: '4d10 + 8' },
        speed: { walk: 40 },
        str: 16, dex: 12, con: 14, int: 2, wis: 10, cha: 6,
        cr: '1',
        action: [{
          name: 'Bite',
          entries: ['{@atk mw} {@hit 5} to hit, reach 5 ft., one target. {@h}8 ({@damage 1d8 + 3}) piercing damage.']
        }]
      };

      const result = await converter.convertItem(nonSpellcaster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.spellcasting).toBeUndefined();
    });

    it('should handle empty spellcasting arrays', async () => {
      const emptySpellcaster: EtoolsMonster = {
        name: 'Empty Caster',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [10],
        hp: { average: 10, formula: '2d8' },
        speed: { walk: 30 },
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        cr: '1/8',
        spellcasting: [] // Empty array
      };

      const result = await converter.convertItem(emptySpellcaster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.spellcasting).toBeUndefined();
    });

    it('should handle malformed spellcasting data gracefully', async () => {
      const malformedSpellcaster: EtoolsMonster = {
        name: 'Malformed Caster',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [10],
        hp: { average: 10, formula: '2d8' },
        speed: { walk: 30 },
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        cr: '1/8',
        spellcasting: [{
          // Missing required fields
          name: 'Incomplete Spellcasting'
        }]
      };

      const result = await converter.convertItem(malformedSpellcaster);
      
      // Should still succeed but with default values
      expect(result.success).toBe(true);
      if (result.document?.pluginData.spellcasting) {
        expect(result.document.pluginData.spellcasting.ability).toBe('charisma'); // default
        expect(result.document.pluginData.spellcasting.spellSaveDC).toBe(10); // default
        expect(result.document.pluginData.spellcasting.spellAttackBonus).toBe(0); // default
      }
    });
  });
});