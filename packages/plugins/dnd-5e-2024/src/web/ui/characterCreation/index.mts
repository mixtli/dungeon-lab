// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin.mjs';
import { z } from 'zod';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from './helpers.js';
import { characterCreationFormSchema } from './schema.mjs';

/**
 * Character Creation Component for D&D 5e
 * Handles the creation of new characters with a form-based interface
 */
export class CharacterCreationComponent extends PluginComponent {
  constructor(api: IPluginAPI) {
    super('characterCreation', 'D&D 5e Character Creation', api);
  }

  protected getTemplate(): string {
    return template;
  }

  protected getStyles(): string {
    return styles;
  }

  protected registerHelpers(): void {
    super.registerHelpers();
    registerHelpers(this.handlebars);
  }

  async onMount(container: HTMLElement): Promise<void> {
    await super.onMount(container);
    this.setupFormHandlers();
  }

  /**
   * Validates form data against the character creation schema
   */
  validateForm(data: unknown): z.SafeParseReturnType<unknown, unknown> {
    return characterCreationFormSchema.safeParse(data);
  }

  /**
   * Translates form data into the full character schema format
   */
  translateFormData(formData: z.infer<typeof characterCreationFormSchema>): Record<string, unknown> {
    // Calculate ability modifiers
    const calculateModifier = (score: number) => Math.floor((score - 10) / 2);

    // Create ability score objects with modifiers and saving throws
    const abilities = Object.entries(formData.abilities).reduce((acc, [ability, score]) => {
      acc[ability] = {
        score,
        modifier: calculateModifier(score),
        savingThrow: {
          proficient: false,
          bonus: 0
        }
      };
      return acc;
    }, {} as Record<string, any>);

    // Get hit die type based on class
    const getHitDieType = (className: string): 'd6' | 'd8' | 'd10' | 'd12' => {
      switch (className.toLowerCase()) {
        case 'barbarian': return 'd12';
        case 'fighter':
        case 'paladin':
        case 'ranger': return 'd10';
        case 'sorcerer':
        case 'wizard': return 'd6';
        default: return 'd8';
      }
    };

    // Translate to full character format
    return {
      species: formData.race, // Map race to species
      classes: [{
        name: formData.class,
        level: formData.level,
        hitDiceType: getHitDieType(formData.class)
      }],
      background: formData.background,
      alignment: formData.alignment,
      experiencePoints: 0,
      proficiencyBonus: 2,
      armorClass: 10 + calculateModifier(formData.abilities.dexterity),
      initiative: calculateModifier(formData.abilities.dexterity),
      speed: 30, // Default speed, should be based on race in the future
      hitPoints: {
        maximum: formData.hitPoints.maximum,
        current: formData.hitPoints.maximum,
      },
      hitDice: {
        total: formData.level,
        current: formData.level,
        type: getHitDieType(formData.class)
      },
      abilities,
      equipment: [],
      features: [],
      biography: {}
    };
  }

  private setupFormHandlers(): void {
    if (!this.container) return;

    // Update ability score modifiers
    const abilityInputs = this.container.querySelectorAll<HTMLInputElement>('input[name^="data.abilities."]');
    abilityInputs.forEach(input => {
      input.addEventListener('change', () => {
        const ability = input.name.split('.')[2];
        const modId = `mod-${ability.substring(0, 3)}`;
        const modSpan = this.container?.querySelector(`#${modId}`);
        if (modSpan) {
          const score = parseInt(input.value) || 0;
          modSpan.textContent = this.calculateAbilityModifier(score).toString();
        }
      });
    });

    // Update HP based on class, level and constitution
    const hpFactors = this.container.querySelectorAll<HTMLInputElement>('#character-class, #character-level, #ability-con');
    hpFactors.forEach(input => {
      input.addEventListener('change', () => {
        this.updateMaxHP();
      });
    });
  }

  private calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  private updateMaxHP(): void {
    if (!this.container) return;

    const classSelect = this.container.querySelector<HTMLSelectElement>('#character-class');
    const levelInput = this.container.querySelector<HTMLInputElement>('#character-level');
    const conInput = this.container.querySelector<HTMLInputElement>('#ability-con');
    const hpInput = this.container.querySelector<HTMLInputElement>('#hp-max');

    if (!classSelect || !levelInput || !conInput || !hpInput) return;

    const characterClass = classSelect.value;
    const level = parseInt(levelInput.value) || 1;
    const constitution = parseInt(conInput.value) || 10;
    const conMod = this.calculateAbilityModifier(constitution);

    // Calculate max HP based on class hit die
    let hitDie = 0;
    switch (characterClass) {
      case 'barbarian':
        hitDie = 12;
        break;
      case 'fighter':
      case 'paladin':
      case 'ranger':
        hitDie = 10;
        break;
      case 'bard':
      case 'cleric':
      case 'druid':
      case 'monk':
      case 'rogue':
      case 'warlock':
        hitDie = 8;
        break;
      case 'sorcerer':
      case 'wizard':
        hitDie = 6;
        break;
      default:
        hitDie = 8;
    }

    // First level: maximum hit die + CON mod
    let maxHP = hitDie + conMod;

    // Additional levels: average hit die + CON mod per level
    if (level > 1) {
      const averageRoll = Math.floor(hitDie / 2) + 1;
      maxHP += (averageRoll + conMod) * (level - 1);
    }

    hpInput.value = maxHP.toString();
  }
}

// Export the component class
export default CharacterCreationComponent;

