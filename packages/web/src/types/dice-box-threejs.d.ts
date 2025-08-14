// Type declarations for @3d-dice/dice-box-threejs

declare module '@3d-dice/dice-box-threejs' {
  export interface DiceRollResult {
    notation: string;
    sets: unknown[];
    modifier: number;
    total: number;
  }

  export interface DiceBoxConfig {
    assetPath?: string;
    theme?: string;
    framerate?: number;
    sounds?: boolean;
    theme_colorset?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRollComplete?: (results: any) => void;
  }

  export default class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roll(notation: string): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reroll(diceIdArray: string[]): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(notation: string): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remove(diceIdArray: string[]): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDiceResults(id?: string): any;
  }
}