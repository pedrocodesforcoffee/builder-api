const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files with TS2564 errors
const errorsOutput = execSync('npx tsc --noEmit 2>&1 | grep "error TS2564"', { encoding: 'utf-8' });
const errors = errorsOutput.trim().split('\n').filter(line => line.trim());

// Group errors by file
const fileErrors = {};
errors.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),\d+\):/);
  if (match) {
    const [, filePath, lineNum] = match;
    if (!fileErrors[filePath]) {
      fileErrors[filePath] = [];
    }
    fileErrors[filePath].push(parseInt(lineNum));
  }
});

// Process each file
Object.entries(fileErrors).forEach(([filePath, lineNumbers]) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Sort line numbers in descending order to avoid offset issues
    lineNumbers.sort((a, b) => b - a);
    
    lineNumbers.forEach(lineNum => {
      const lineIndex = lineNum - 1; // Convert to 0-based
      if (lineIndex < 0 || lineIndex >= lines.length) return;
      
      const line = lines[lineIndex];
      // Match property declaration: "propertyName: Type" or "propertyName:Type"
      // Skip if already has ! or ? or =
      if (!/[!?=]/.test(line)) {
        // Add ! after property name, before :
        lines[lineIndex] = line.replace(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*/, '$1$2!: ');
      }
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!');
