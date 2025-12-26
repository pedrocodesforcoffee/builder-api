#!/bin/bash

# List of service files that need the generateReport method
services=(
  "budget-detail-report.service.ts"
  "wip-report.service.ts"
  "cost-to-complete-report.service.ts"
  "commitment-list-report.service.ts"
  "budget-variance-report.service.ts"
  "commitment-status-report.service.ts"
  "payment-history-report.service.ts"
  "aging-report.service.ts"
  "change-order-log-report.service.ts"
  "change-order-summary-report.service.ts"
  "subcontractor-summary-report.service.ts"
  "vendor-payments-report.service.ts"
)

for service in "${services[@]}"; do
  file="src/modules/financials/services/$service"
  if [ -f "$file" ]; then
    # Check if generateReport method already exists
    if ! grep -q "generateReport" "$file"; then
      # Find the last closing brace of the class and insert the method before it
      # Add the generateReport method as an alias to generate
      cat >> "$file.tmp" << 'EOMETHOD'

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }
EOMETHOD
      # Insert before the last }
      head -n -1 "$file" > "$file.new"
      cat "$file.tmp" >> "$file.new"
      echo "}" >> "$file.new"
      mv "$file.new" "$file"
      rm "$file.tmp"
      echo "Added generateReport to $service"
    else
      echo "generateReport already exists in $service"
    fi
  else
    echo "File not found: $file"
  fi
done

echo "Done!"
