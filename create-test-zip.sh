#!/bin/bash

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Create structure
mkdir -p content/documents

# Copy files
cp /tmp/minimal-test-pack/manifest.json .
cp /tmp/minimal-test-pack/content/documents/document-magic-missile.json content/documents/

# Create ZIP
zip -r /Users/mixtli/Projects/dungeon-lab/minimal-test-pack-final.zip .

# Clean up
rm -rf "$TEMP_DIR"