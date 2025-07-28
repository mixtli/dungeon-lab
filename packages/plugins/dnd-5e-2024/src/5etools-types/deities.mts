/**
 * 5etools deity type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export type EtoolsAlignment = 'L' | 'N' | 'C' | 'G' | 'E' | 'LG' | 'NG' | 'CG' | 'LN' | 'CN' | 'LE' | 'NE' | 'CE' | 'U';

export type EtoolsDomain = 
  | 'Arcana' | 'Death' | 'Forge' | 'Grave' | 'Knowledge' | 'Life' | 'Light'
  | 'Nature' | 'Order' | 'Peace' | 'Tempest' | 'Trickery' | 'Twilight' | 'War';

export interface EtoolsDeity {
  name: string;
  source: string;
  page?: number;
  pantheon?: string;
  alignment?: EtoolsAlignment[];
  category?: string;
  domains?: EtoolsDomain[];
  province?: string;
  symbol?: string;
  entries?: EtoolsEntry[];
  srd?: boolean;
  basicRules?: boolean;
  srd52?: boolean;
  altNames?: string[];
  title?: string;
  /** Some deities may have additional lore properties */
  customExtensionOf?: string;
  reprintedAs?: string[];
  [key: string]: unknown;
}

export interface EtoolsDeityData {
  deity: EtoolsDeity[];
}