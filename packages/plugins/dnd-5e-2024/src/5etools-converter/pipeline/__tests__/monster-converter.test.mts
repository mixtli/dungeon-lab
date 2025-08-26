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
              documentType: 'vtt-document',
              slug: 'detect-magic',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
          
          const fear = spellcasting.spells.atWill![1];
          expect(fear).toEqual({
            _ref: {
              documentType: 'vtt-document',
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
              documentType: 'vtt-document',
              slug: 'speak-with-dead',
              source: 'xphb',
              pluginDocumentType: 'spell'
            }
          });
          
          const vitriolicSphere = spellcasting.spells.daily![1];
          expect(vitriolicSphere.uses).toBe(1);
          expect(vitriolicSphere.spell).toEqual({
            _ref: {
              documentType: 'vtt-document',
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
            documentType: 'vtt-document',
            slug: 'detect-magic',
            source: 'xphb',
            pluginDocumentType: 'spell'
          }
        });
        
        // 3. Daily "1e" should be converted to explicit uses count
        expect(spellcasting.spells.daily![0]).toEqual({
          spell: {
            _ref: {
              documentType: 'vtt-document',
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

  describe('Action Parsing with 5etools Markup', () => {
    it('should parse melee attack actions with structured data', async () => {
      const attackMonster: EtoolsMonster = {
        name: 'Test Warrior',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [15],
        hp: { average: 25, formula: '4d8 + 4' },
        speed: { walk: 30 },
        str: 16, dex: 12, con: 12, int: 10, wis: 10, cha: 10,
        cr: '1',
        action: [{
          name: 'Longsword',
          entries: ['{@atkr m} {@hit 5}, reach 5 ft. {@h}7 ({@damage 1d8 + 3}) Slashing damage.']
        }]
      };

      const result = await converter.convertItem(attackMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();
      expect(result.document!.pluginData.actions).toHaveLength(1);

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Longsword');
      expect(action.attackType).toBe('melee');
      expect(action.attackBonus).toBe(5);
      expect(action.reach).toBe(5);
      expect(action.averageDamage).toBe(7);
      expect(action.damage).toBe('1d8 + 3');
      expect(action.damageType).toBe('slashing');
    });

    it('should parse ranged attack actions with range data', async () => {
      const archerMonster: EtoolsMonster = {
        name: 'Test Archer',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [14],
        hp: { average: 20, formula: '3d8 + 3' },
        speed: { walk: 30 },
        str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 10,
        cr: '1/2',
        action: [{
          name: 'Longbow',
          entries: ['{@atkr r} {@hit 5}, range 150/600 ft. {@h}7 ({@damage 1d8 + 3}) Piercing damage.']
        }]
      };

      const result = await converter.convertItem(archerMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Longbow');
      expect(action.attackType).toBe('ranged');
      expect(action.attackBonus).toBe(5);
      expect(action.range).toEqual({ normal: 150, long: 600 });
      expect(action.averageDamage).toBe(7);
      expect(action.damage).toBe('1d8 + 3');
      expect(action.damageType).toBe('piercing');
    });

    it('should parse attacks with additional damage types', async () => {
      const dragonMonster: EtoolsMonster = {
        name: 'Young Dragon',
        source: 'XPHB',
        size: ['L'],
        type: 'dragon',
        alignment: ['C', 'E'],
        ac: [17],
        hp: { average: 75, formula: '10d10 + 20' },
        speed: { walk: 40, fly: 80 },
        str: 19, dex: 14, con: 15, int: 12, wis: 11, cha: 15,
        cr: '4',
        action: [{
          name: 'Claw',
          entries: ['{@atkr m} {@hit 7}, reach 5 ft. {@h}11 ({@damage 2d6 + 4}) Slashing damage plus 3 ({@damage 1d6}) Fire damage.']
        }]
      };

      const result = await converter.convertItem(dragonMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Claw');
      expect(action.attackType).toBe('melee');
      expect(action.attackBonus).toBe(7);
      expect(action.averageDamage).toBe(11);
      expect(action.damage).toBe('2d6 + 4');
      expect(action.damageType).toBe('slashing');
      expect(action.additionalDamage).toHaveLength(1);
      expect(action.additionalDamage![0]).toEqual({
        damage: '1d6',
        type: 'fire',
        average: 3
      });
    });

    it('should parse save-based abilities with area effects', async () => {
      const breathWeaponMonster: EtoolsMonster = {
        name: 'Dragon Wyrmling',
        source: 'XPHB',
        size: ['M'],
        type: 'dragon',
        alignment: ['C', 'E'],
        ac: [16],
        hp: { average: 32, formula: '5d8 + 10' },
        speed: { walk: 30, fly: 60 },
        str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 13,
        cr: '2',
        action: [{
          name: 'Fire Breath',
          entries: ['{@recharge 5} {@actSave dex} {@dc 12}, each creature in a 15-foot {@variantrule Cone [Area of Effect]|XPHB|Cone}. {@actSaveFail} 21 ({@damage 6d6}) Fire damage.']
        }]
      };

      const result = await converter.convertItem(breathWeaponMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Fire Breath');
      expect(action.recharge).toBe('5-6');
      expect(action.savingThrow).toEqual({
        ability: 'dex',
        dc: 12
      });
      expect(action.areaOfEffect).toEqual({
        shape: 'cone',
        size: '15-foot'
      });
    });

    it('should handle versatile weapons (both melee and ranged)', async () => {
      const versatileMonster: EtoolsMonster = {
        name: 'Javelin Thrower',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [13],
        hp: { average: 16, formula: '3d8 + 3' },
        speed: { walk: 30 },
        str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10,
        cr: '1/4',
        action: [{
          name: 'Javelin',
          entries: ['{@atkr m,r} {@hit 4}, reach 5 ft. or range 30/120 ft. {@h}5 ({@damage 1d6 + 2}) Piercing damage.']
        }]
      };

      const result = await converter.convertItem(versatileMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Javelin');
      expect(action.attackType).toBe('both');
      expect(action.attackBonus).toBe(4);
      expect(action.reach).toBe(5);
      expect(action.range).toEqual({ normal: 30, long: 120 });
      expect(action.averageDamage).toBe(5);
      expect(action.damage).toBe('1d6 + 2');
      expect(action.damageType).toBe('piercing');
    });

    it('should handle non-attack actions gracefully', async () => {
      const utilityMonster: EtoolsMonster = {
        name: 'Test Creature',
        source: 'XPHB',
        size: ['M'],
        type: 'humanoid',
        alignment: ['N'],
        ac: [10],
        hp: { average: 10, formula: '2d8 + 2' },
        speed: { walk: 30 },
        str: 10, dex: 10, con: 12, int: 10, wis: 10, cha: 10,
        cr: '1/8',
        action: [{
          name: 'Dash',
          entries: ['The creature moves up to its speed without provoking opportunity attacks.']
        }]
      };

      const result = await converter.convertItem(utilityMonster);
      
      expect(result.success).toBe(true);
      expect(result.document?.pluginData.actions).toBeDefined();

      const action = result.document!.pluginData.actions![0];
      expect(action.name).toBe('Dash');
      expect(action.description).toContain('moves up to its speed');
      // Non-attack actions should not have attack-specific fields
      expect(action.attackType).toBeUndefined();
      expect(action.attackBonus).toBeUndefined();
      expect(action.damage).toBeUndefined();
    });
  });
});