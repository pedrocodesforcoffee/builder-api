const fs = require('fs');

const services = [
  'budget-detail-report.service.ts',
  'wip-report.service.ts',
  'cost-to-complete-report.service.ts',
  'commitment-list-report.service.ts',
  'budget-variance-report.service.ts',
  'commitment-status-report.service.ts',
  'payment-history-report.service.ts',
  'aging-report.service.ts',
  'change-order-log-report.service.ts',
  'change-order-summary-report.service.ts',
  'subcontractor-summary-report.service.ts',
  'vendor-payments-report.service.ts'
];

const methodToAdd = `
  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }
`;

services.forEach(serviceName => {
  const filePath = `src/modules/financials/services/${serviceName}`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if generateReport already exists
    if (content.includes('generateReport')) {
      console.log(`generateReport already exists in ${serviceName}`);
      return;
    }
    
    // Find the last closing brace
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex === -1) {
      console.error(`Could not find closing brace in ${serviceName}`);
      return;
    }
    
    // Insert the method before the last closing brace
    const newContent = content.substring(0, lastBraceIndex) + methodToAdd + '\n' + content.substring(lastBraceIndex);
    
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Added generateReport to ${serviceName}`);
  } catch (error) {
    console.error(`Error processing ${serviceName}:`, error.message);
  }
});

console.log('Done!');
