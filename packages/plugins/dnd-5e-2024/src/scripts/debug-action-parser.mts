#!/usr/bin/env tsx
/**
 * Debug script to test action parser with Fire Breath example
 */
import { parseActionData } from '../5etools-converter/utils/reference-transformer.mjs';
import { formatEntries } from '../5etools-converter/utils/conversion-utils.mjs';
import { scanTextForReferences } from '../5etools-converter/utils/reference-parser.mjs';

const fireBreathEntries = [
  "{@actSave dex} {@dc 17}, each creature in a 30-foot {@variantrule Cone [Area of Effect]|XPHB|Cone}. {@actSaveFail} 56 ({@damage 16d6}) Fire damage. {@actSaveSuccess} Half damage."
];

// Format entries to get raw text
const rawText = formatEntries(fireBreathEntries);
console.log('Raw text after formatEntries:');
console.log(JSON.stringify(rawText, null, 2));
console.log('\n');

// Check what references are found
console.log('Scanning for references...');
const matches = scanTextForReferences(rawText);
console.log(`Found ${matches.length} references`);
matches.forEach((match, i) => {
  console.log(`Match ${i + 1}: type="${match.reference.type}", name="${match.reference.name}", match="${match.match}"`);
});
console.log('\n');

// Parse action data
const parsedData = parseActionData(rawText);
console.log('Parsed action data:');
console.log(JSON.stringify(parsedData, null, 2));
console.log('\n');

// Check references
console.log('Number of references:', parsedData.references.length);
parsedData.references.forEach((ref, index) => {
  console.log(`Reference ${index + 1}:`, JSON.stringify(ref, null, 2));
});

// Test with simpler input
console.log('\n\nTesting with simpler actSave reference:');
const simpleTest = parseActionData('{@actSave dex} {@dc 15}');
console.log('Description:', simpleTest.description);
console.log('References:', simpleTest.references.length);
console.log('Saving throw:', simpleTest.savingThrow);