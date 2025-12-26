const fs = require('fs');
const { execSync } = require('child_process');

// Get all TS18046 errors
const errorsOutput = execSync('npx tsc --noEmit 2>&1 | grep "TS18046" | grep "src/"', { encoding: 'utf-8' });
const errors = errorsOutput.trim().split('\n').filter(line => line.trim());

// Group by file
const fileErrors = {};
errors.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\):/);
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
    
    // Sort descending to avoid offset issues
    lineNumbers.sort((a, b) => b - a);
    
    lineNumbers.forEach(lineNum => {
      const lineIndex = lineNum - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) return;
      
      const line = lines[lineIndex];
      
      // Replace common patterns:
      // error.message -> (error as Error).message
      // error.stack -> (error as Error).stack
      // this.logger.error(..., error) -> this.logger.error(..., error as Error)
      
      let newLine = line;
      
      // Pattern 1: error.message or error.stack
      if (/\berror\.(message|stack|name)\b/.test(line)) {
        newLine = line.replace(/\berror\.(message|stack|name)\b/g, '(error as Error).$1');
      }
      // Pattern 2: logger.error with error
      else if (/logger\.(error|warn|debug)\([^)]*,\s*error\s*\)/.test(line)) {
        newLine = line.replace(/(\blogger\.(error|warn|debug)\([^)]*,\s*)error(\s*\))/, '$1error as Error$3');
      }
      // Pattern 3: throw error or return error
      else if (/throw\s+error\b/.test(line) || /return\s+error\b/.test(line)) {
        newLine = line.replace(/\berror\b/, 'error as Error');
      }
      
      if (newLine !== line) {
        lines[lineIndex] = newLine;
      }
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!');
