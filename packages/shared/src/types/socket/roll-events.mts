import type { Roll, RollServerResult } from '../../schemas/roll.schema.mjs';

export interface RollSocketEvents {
  // Core roll execution
  'roll': (roll: Roll, callback: RollCallback) => void;
  'roll:result': (result: RollServerResult) => void;
}

export interface RollCallback {
  (response: { success: boolean; error?: string }): void;
}