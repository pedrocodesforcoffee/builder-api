#!/bin/bash

# Script to fix TS2564 errors by adding definite assignment assertion (!) to properties
# This adds ! to property declarations that:
# - Don't already have ! or ?
# - Don't have a default value (no = after the type)
# - Are followed by a colon and type annotation

find src/modules/financials/dto -name "*.dto.ts" -type f | while read file; do
  echo "Processing: $file"
  # Use sed to add ! after property name before : type annotation
  # Pattern: matches "  propertyName: Type" and converts to "  propertyName!: Type"
  # But skips lines that already have ! or ? or = (defaults)
  sed -i.bak -E '
    # Skip if line already has ! or ? or =
    /[!?=]/!{
      # Match property declarations (name: type or name:type)
      s/^([[:space:]]+)([a-zA-Z_][a-zA-Z0-9_]*)[[:space:]]*:[[:space:]]/\1\2!: /
    }
  ' "$file"
  rm "${file}.bak"
done

echo "Done fixing DTOs"
