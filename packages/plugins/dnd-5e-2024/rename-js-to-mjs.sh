#!/bin/bash

# Script to rename all .js files to .mjs in the D&D 5e 2024 plugin dist directory

# Check if the dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: Dist directory does not exist"
  exit 1
fi

# Find all .js files and rename them to .mjs
echo "Renaming .js files to .mjs..."
find dist -name "*.js" | while read file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file to $new_file"
  mv "$file" "$new_file"
done

# Update .js.map files to .mjs.map
echo "Renaming .js.map files to .mjs.map..."
find dist -name "*.js.map" | while read file; do
  new_file="${file%.js.map}.mjs.map"
  echo "Renaming $file to $new_file"
  mv "$file" "$new_file"
done

# Update references in .d.ts files
echo "Updating references in .d.ts files..."
find dist -name "*.d.ts" | while read file; do
  # Rename the file to .d.mts
  new_file="${file%.d.ts}.d.mts"
  echo "Renaming $file to $new_file"
  mv "$file" "$new_file"
done

# Update references in .d.ts.map files
echo "Updating references in .d.ts.map files..."
find dist -name "*.d.ts.map" | while read file; do
  # Rename the file to .d.mts.map
  new_file="${file%.d.ts.map}.d.mts.map"
  echo "Renaming $file to $new_file"
  mv "$file" "$new_file"
done

echo "Conversion complete!" 