import { convert5eToolsFeat } from './convert-5etools-feat.mjs';

// Define a type for our converted feat
interface ConvertedFeat {
  name: string;
  description: string;
  category?: string;
  ability?: Array<{
    choice: {
      from: string[];
      count?: number;
    }
  }>;
  prerequisites?: {
    ability?: Record<string, number>;
    race?: string[];
    class?: string[];
    level?: number;
    spellcasting?: boolean;
    other?: string;
  };
  benefits: Array<{
    name: string;
    description: string;
  }>;
}

// Elemental Adept data from the source
const elementalAdeptData = {
  "name": "Elemental Adept",
  "source": "XPHB",
  "page": 203,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "repeatable": true,
  "repeatableHidden": true,
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "entries": [
    "You gain the following benefits.",
    {
      "type": "entries",
      "name": "Energy Mastery",
      "entries": [
        "Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder. Spells you cast ignore Resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2."
      ]
    },
    {
      "type": "entries",
      "name": "Repeatable",
      "entries": [
        "You can take this feat more than once, but you must choose a different damage type each time for Energy Mastery."
      ]
    }
  ]
};

// Convert the feat
const convertedFeat = convert5eToolsFeat(elementalAdeptData) as ConvertedFeat;

// Print the result
console.log("Converted Elemental Adept Feat:");
console.log(JSON.stringify(convertedFeat, null, 2));

// Verify expected fields are present
console.log("\nVerification:");
console.log("- Has ability field:", convertedFeat.ability ? "✓" : "✗");
console.log("- Has prerequisites.level:", convertedFeat.prerequisites?.level ? "✓" : "✗");
console.log("- Has prerequisites.spellcasting:", convertedFeat.prerequisites?.spellcasting ? "✓" : "✗");
console.log("- Has category:", convertedFeat.category ? "✓" : "✗");
console.log("- Has benefits:", convertedFeat.benefits.length > 0 ? "✓" : "✗");
console.log("- Description is first entry:", convertedFeat.description === elementalAdeptData.entries[0] ? "✓" : "✗"); 