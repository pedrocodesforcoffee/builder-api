const fs = require('fs');
const { execSync } = require('child_process');

// Get all files with TS1255 errors
const errorsOutput = execSync('npx tsc --noEmit 2>&1 | grep "error TS1255"', { encoding: 'utf-8' });
const errors = errorsOutput.trim().split('\n').filter(line => line.trim());

// Group errors by file
const fileErrors = {};
errors.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\):/);
  if (match) {
    const [, filePath, lineNum, colNum] = match;
    if (!fileErrors[filePath]) {
      fileErrors[filePath] = [];
    }
    fileErrors[filePath].push({ line: parseInt(lineNum), col: parseInt(colNum) });
  }
});

// Process each file
Object.entries(fileErrors).forEach(([filePath, errorPositions]) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Sort by line number descending to avoid offset issues
    errorPositions.sort((a, b) => b.line - a.line || b.col - a.col);
    
    errorPositions.forEach(({ line, col }) => {
      const lineIndex = line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) return;
      
      const lineContent = lines[lineIndex];
      // Remove the ! from the position (col is 1-based, but includes surrounding chars)
      // Find and remove !: pattern
      lines[lineIndex] = lineContent.replace(/!:/g, ':');
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!');
