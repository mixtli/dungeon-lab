#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { convert5eToolsClass, NormalizedData } from './convert-5etools-class.mjs';

function main(): void {
    if (process.argv.length < 3) {
        console.log("Usage: ts-node normalize_class.ts <path_to_class_json>");
        process.exit(1);
    }
    
    const filePath = process.argv[2];
    if (!fs.existsSync(filePath)) {
        console.log(`Error: File ${filePath} not found`);
        process.exit(1);
    }
    
    try {
        // Read the input file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Convert the data
        const normalizedData = convert5eToolsClass(data);
        
        // Write the output
        const outputFile = `normalized_${path.basename(filePath)}`;
        fs.writeFileSync(
            outputFile,
            JSON.stringify(normalizedData, null, 2),
            { encoding: 'utf-8' }
        );
        
        console.log(`Normalized data written to ${outputFile}`);
    } catch (e) {
        console.error(`Error processing file:`, e);
        process.exit(1);
    }
}

main();