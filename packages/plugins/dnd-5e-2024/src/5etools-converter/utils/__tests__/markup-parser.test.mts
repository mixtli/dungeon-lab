/**
 * Unit tests for 5etools markup parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseAttackType,
  parseAttackBonus,
  parseReachRange,
  parseAverageDamage,
  parseDamageFormulas,
  parseAdditionalDamage,
  parseSavingThrow,
  parseAreaOfEffect,
  parseRecharge,
  parseEffectsOnMiss,
  parseActionMarkup
} from '../markup-parser.mjs';

describe('5etools Markup Parser', () => {
  describe('parseAttackType', () => {
    it('should parse melee attack type', () => {
      const text = '{@atkr m} {@hit 5}, reach 5 ft.';
      expect(parseAttackType(text)).toBe('melee');
    });

    it('should parse ranged attack type', () => {
      const text = '{@atkr r} {@hit 5}, range 25/50 ft.';
      expect(parseAttackType(text)).toBe('ranged');
    });

    it('should parse both melee and ranged', () => {
      const text = '{@atkr m,r} {@hit 5}, reach 5 ft. or range 120 ft.';
      expect(parseAttackType(text)).toBe('both');
    });

    it('should return undefined for non-attack actions', () => {
      const text = 'The creature moves up to its speed.';
      expect(parseAttackType(text)).toBeUndefined();
    });
  });

  describe('parseAttackBonus', () => {
    it('should parse positive attack bonus', () => {
      const text = '{@atkr m} {@hit 5}, reach 5 ft.';
      expect(parseAttackBonus(text)).toBe(5);
    });

    it('should parse negative attack bonus', () => {
      const text = '{@atkr m} {@hit -2}, reach 5 ft.';
      expect(parseAttackBonus(text)).toBe(-2);
    });

    it('should parse attack bonus with explicit plus', () => {
      const text = '{@atkr m} {@hit +7}, reach 5 ft.';
      expect(parseAttackBonus(text)).toBe(7);
    });

    it('should return undefined when no hit bonus present', () => {
      const text = 'The creature moves up to its speed.';
      expect(parseAttackBonus(text)).toBeUndefined();
    });
  });

  describe('parseReachRange', () => {
    it('should parse melee reach', () => {
      const text = '{@atkr m} {@hit 5}, reach 10 ft.';
      const result = parseReachRange(text);
      expect(result.reach).toBe(10);
      expect(result.range).toBeUndefined();
    });

    it('should parse ranged attack with single range', () => {
      const text = '{@atkr r} {@hit 5}, range 120 ft.';
      const result = parseReachRange(text);
      expect(result.reach).toBeUndefined();
      expect(result.range).toEqual({ normal: 120, long: undefined });
    });

    it('should parse ranged attack with normal/long range', () => {
      const text = '{@atkr r} {@hit 5}, range 25/50 ft.';
      const result = parseReachRange(text);
      expect(result.reach).toBeUndefined();
      expect(result.range).toEqual({ normal: 25, long: 50 });
    });

    it('should parse both reach and range', () => {
      const text = '{@atkr m,r} {@hit 5}, reach 5 ft. or range 120 ft.';
      const result = parseReachRange(text);
      expect(result.reach).toBe(5);
      expect(result.range).toEqual({ normal: 120, long: undefined });
    });
  });

  describe('parseAverageDamage', () => {
    it('should parse average damage', () => {
      const text = '{@atkr m} {@hit 5}, reach 5 ft. {@h}14 ({@damage 2d6 + 7})';
      expect(parseAverageDamage(text)).toBe(14);
    });

    it('should return undefined when no average damage present', () => {
      const text = '{@atkr m} {@hit 5}, reach 5 ft.';
      expect(parseAverageDamage(text)).toBeUndefined();
    });
  });

  describe('parseDamageFormulas', () => {
    it('should parse simple damage formula', () => {
      const text = '{@h}14 ({@damage 2d6 + 7}) Slashing damage';
      const result = parseDamageFormulas(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        damage: '2d6 + 7',
        average: 14,
        type: 'slashing'
      });
    });

    it('should parse damage formula without average', () => {
      const text = '({@damage 1d8 + 3}) Piercing damage';
      const result = parseDamageFormulas(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        damage: '1d8 + 3',
        average: undefined,
        type: 'piercing'
      });
    });

    it('should parse multiple damage formulas', () => {
      const text = '{@h}7 ({@damage 1d8 + 3}) Bludgeoning damage plus 11 ({@damage 2d10}) Lightning damage';
      const result = parseDamageFormulas(text);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        damage: '1d8 + 3',
        average: 7,
        type: 'bludgeoning'
      });
      expect(result[1]).toEqual({
        damage: '2d10',
        average: 11,
        type: 'lightning'
      });
    });
  });

  describe('parseAdditionalDamage', () => {
    it('should parse additional damage', () => {
      const text = 'plus 11 ({@damage 2d10}) Lightning damage';
      const result = parseAdditionalDamage(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        damage: '2d10',
        type: 'lightning',
        average: 11
      });
    });

    it('should parse multiple additional damages', () => {
      const text = 'plus 7 ({@damage 2d6}) Cold damage plus 5 ({@damage 2d4}) Fire damage';
      const result = parseAdditionalDamage(text);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        damage: '2d6',
        type: 'cold',
        average: 7
      });
      expect(result[1]).toEqual({
        damage: '2d4',
        type: 'fire',
        average: 5
      });
    });
  });

  describe('parseSavingThrow', () => {
    it('should parse saving throw', () => {
      const text = '{@actSave dex} {@dc 18}, each creature in the area';
      const result = parseSavingThrow(text);
      expect(result).toEqual({
        ability: 'dex',
        dc: 18
      });
    });

    it('should return undefined when incomplete save data', () => {
      const text = '{@actSave dex} but no DC specified';
      expect(parseSavingThrow(text)).toBeUndefined();
    });
  });

  describe('parseAreaOfEffect', () => {
    it('should parse cone area', () => {
      const text = 'each creature in a 60-foot {@variantrule Cone [Area of Effect]|XPHB|Cone}';
      const result = parseAreaOfEffect(text);
      expect(result).toEqual({
        shape: 'cone',
        size: '60-foot'
      });
    });

    it('should parse line area', () => {
      const text = 'each creature in a 30-foot-long, 5-foot-wide {@variantrule Line [Area of Effect]|XPHB|Line}';
      const result = parseAreaOfEffect(text);
      expect(result).toEqual({
        shape: 'line',
        size: '30-foot-long, 5-foot-wide'
      });
    });

    it('should parse sphere area', () => {
      const text = 'each creature in a 20-foot-radius {@variantrule Sphere [Area of Effect]|XPHB|Sphere}';
      const result = parseAreaOfEffect(text);
      expect(result).toEqual({
        shape: 'sphere',
        size: '20-foot-radius'
      });
    });
  });

  describe('parseRecharge', () => {
    it('should parse recharge 5-6', () => {
      const text = 'Acid Breath {@recharge 5}';
      expect(parseRecharge(text)).toBe('5-6');
    });

    it('should parse recharge 4-6', () => {
      const text = 'Lightning Breath {@recharge 4}';
      expect(parseRecharge(text)).toBe('4-6');
    });

    it('should parse recharge 6 only', () => {
      const text = 'Special Ability {@recharge}';
      expect(parseRecharge(text)).toBe('6');
    });
  });

  describe('parseEffectsOnMiss', () => {
    it('should parse hit-or-miss effects', () => {
      const text = '{@hom}The target takes half damage.';
      const result = parseEffectsOnMiss(text);
      expect(result).toBe('The target takes half damage.');
    });
  });

  describe('parseActionMarkup - Integration Tests', () => {
    it('should parse complete melee attack', () => {
      const text = '{@atkr m} {@hit 11}, reach 5 ft. {@h}14 ({@damage 2d6 + 7}) Slashing damage plus 7 ({@damage 2d6}) Cold damage.';
      const result = parseActionMarkup(text);
      
      expect(result.attackType).toBe('melee');
      expect(result.attackBonus).toBe(11);
      expect(result.reach).toBe(5);
      expect(result.averageDamage).toBe(14);
      expect(result.damage).toBe('2d6 + 7');
      expect(result.damageType).toBe('slashing');
      expect(result.additionalDamage).toHaveLength(1);
      expect(result.additionalDamage?.[0]).toEqual({
        damage: '2d6',
        type: 'cold',
        average: 7
      });
    });

    it('should parse breath weapon with save', () => {
      const text = '{@actSave dex} {@dc 18}, each creature in a 60-foot {@variantrule Cone [Area of Effect]|XPHB|Cone}. {@actSaveFail} 45 ({@damage 10d8}) Cold damage';
      const result = parseActionMarkup(text);
      
      expect(result.ability).toBe('dex');
      expect(result.dc).toBe(18);
      expect(result.areaOfEffect).toEqual({
        shape: 'cone',
        size: '60-foot'
      });
    });

    it('should parse recharge ability', () => {
      const text = 'Fire Breath {@recharge 5}. {@actSave dex} {@dc 15}';
      const result = parseActionMarkup(text);
      
      expect(result.recharge).toBe('5-6');
      expect(result.ability).toBe('dex');
      expect(result.dc).toBe(15);
    });

    it('should handle non-attack actions gracefully', () => {
      const text = 'The creature moves up to its speed without provoking opportunity attacks.';
      const result = parseActionMarkup(text);
      
      // Should not throw and should return mostly undefined values
      expect(result.attackType).toBeUndefined();
      expect(result.attackBonus).toBeUndefined();
      expect(result.damage).toBeUndefined();
    });
  });
});