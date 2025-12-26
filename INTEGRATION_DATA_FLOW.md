# Critical Integrations Data Flow

## OCO Approval Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   OCO APPROVAL WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

User Action: Approve OCO (id, userId, approvedAmount?)
                    ↓
         OwnerChangeOrderService.approve()
                    ↓
         ┌──────────────────────┐
         │  Start Transaction   │
         └──────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 1. Update OwnerChangeOrder        │
    │    - status = APPROVED            │
    │    - approvedAmount = amount      │
    │    - approvedAt = now             │
    │    - approvedById = userId        │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 2. Update PrimeContract           │
    │    currentAmount += approvedAmount│
    │                                    │
    │    ✅ EXIT CRITERIA #1            │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 3. Update Budget (if configured)  │
    │                                    │
    │    ✅ EXIT CRITERIA #3            │
    └───────────────────────────────────┘
                    ↓
        ┌─────────────────────┐
        │ budgetImpactType?   │
        └─────────────────────┘
                    ↓
         ┌──────────┼──────────┐
         │          │          │
    CONTINGENCY  LINE_ITEM  NEW_LINE
         │          │          │
         ↓          ↓          ↓
    Reduce      Increase    Create New
    Budget      Budgeted    Budget Line
  contingency     Cost        (future)
         │          │          │
         └──────────┴──────────┘
                    ↓
         ┌──────────────────────┐
         │  Commit Transaction  │
         └──────────────────────┘
                    ↓
              Return OCO

┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET IMPACT TYPES                           │
└─────────────────────────────────────────────────────────────────┘

CONTINGENCY Impact:
┌──────────────┐      ┌──────────────────┐
│    Budget    │      │  Before: $100K   │
│              │  →   │  OCO: -$20K      │
│ contingency  │      │  After: $80K     │
└──────────────┘      └──────────────────┘

LINE_ITEM Impact:
┌──────────────────┐      ┌──────────────────┐
│ BudgetLineItem   │      │  Before: $50K    │
│ (Cost Code 123)  │  →   │  OCO: +$10K      │
│ budgetedCost     │      │  After: $60K     │
└──────────────────┘      └──────────────────┘

NEW_LINE Impact:
┌──────────────────┐      ┌──────────────────┐
│   New Scope      │      │  Create new      │
│ (Cost Code 456)  │  →   │  BudgetLineItem  │
│                  │      │  with OCO amount │
└──────────────────┘      └──────────────────┘
```

## CCO Approval Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   CCO APPROVAL WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

User Action: Approve CCO (id, userId, approvedAmount?)
                    ↓
      CommitmentChangeOrderService.approve()
                    ↓
         ┌──────────────────────┐
         │  Start Transaction   │
         └──────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 1. Update CommitmentChangeOrder   │
    │    - status = APPROVED            │
    │    - approvedAmount = amount      │
    │    - approvedAt = now             │
    │    - approvedById = userId        │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 2. Update Commitment              │
    │    currentAmount += approvedAmount│
    │                                    │
    │    ✅ EXIT CRITERIA #2            │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ 3. Update Budget Committed Costs  │
    │    (if costCodeId provided)       │
    │                                    │
    │    ✅ EXIT CRITERIA #3            │
    └───────────────────────────────────┘
                    ↓
        ┌─────────────────────┐
        │   costCodeId?       │
        └─────────────────────┘
                    ↓
               ┌────┴────┐
               │   YES   │
               └────┬────┘
                    ↓
    Find Active BudgetLineItem by costCodeId
                    ↓
    ┌───────────────────────────────────┐
    │ Update BudgetLineItem             │
    │ committedCost += approvedAmount   │
    └───────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │  Commit Transaction  │
         └──────────────────────┘
                    ↓
              Return CCO

┌─────────────────────────────────────────────────────────────────┐
│             COMMITTED COST TRACKING                              │
└─────────────────────────────────────────────────────────────────┘

BudgetLineItem Progression:

┌────────────┬────────────────┬─────────────┬──────────────┐
│   Phase    │ budgetedCost   │committed    │ actualCost   │
│            │                │Cost         │              │
├────────────┼────────────────┼─────────────┼──────────────┤
│ Initial    │    $100,000    │     $0      │     $0       │
│ Budget     │                │             │              │
├────────────┼────────────────┼─────────────┼──────────────┤
│ After CCO  │    $100,000    │  $80,000    │     $0       │
│ Approved   │                │  ↑ Added    │              │
├────────────┼────────────────┼─────────────┼──────────────┤
│ After      │    $100,000    │  $80,000    │  $50,000     │
│ Pay Apps   │                │             │  ↑ Added     │
└────────────┴────────────────┴─────────────┴──────────────┘

Variance Analysis:
• Budget Remaining = budgetedCost - committedCost
• Exposure = committedCost - actualCost
• Total Variance = budgetedCost - actualCost
```

## Complete Integration Example

```
┌─────────────────────────────────────────────────────────────────┐
│             END-TO-END CHANGE ORDER INTEGRATION                  │
└─────────────────────────────────────────────────────────────────┘

Scenario: Owner adds scope, contractor increases subcontract

Step 1: Approve OCO for +$50,000
    ↓
┌─────────────────────────────┐
│ PrimeContract               │
│ originalAmount: $1,000,000  │
│ currentAmount:  $1,000,000  │ → currentAmount: $1,050,000
└─────────────────────────────┘   (+$50,000)
    ↓
┌─────────────────────────────┐
│ Budget                      │
│ contingency: $50,000        │ → contingency: $0
└─────────────────────────────┘   (-$50,000)

Step 2: Approve CCO for +$40,000 (to cover the work)
    ↓
┌─────────────────────────────┐
│ Commitment (Subcontract)    │
│ originalAmount: $300,000    │
│ currentAmount:  $300,000    │ → currentAmount: $340,000
└─────────────────────────────┘   (+$40,000)
    ↓
┌─────────────────────────────┐
│ BudgetLineItem              │
│ budgetedCost: $100,000      │   budgetedCost: $100,000
│ committedCost: $80,000      │ → committedCost: $120,000
│ actualCost: $50,000         │   actualCost: $50,000
└─────────────────────────────┘   (+$40,000)

Result:
• Prime contract increased by $50K (revenue)
• Subcontract increased by $40K (cost)
• Net margin increase: $10K
• Budget contingency used: $50K
• Budget committed costs increased: $40K
```

## Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE TRANSACTION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

BEGIN TRANSACTION
    │
    ├─── UPDATE change_order
    │    SET status = 'APPROVED',
    │        approved_amount = $50000,
    │        approved_at = NOW(),
    │        approved_by_id = 'user-123'
    │
    ├─── UPDATE prime_contract
    │    SET current_amount = current_amount + $50000
    │    WHERE id = 'pc-001'
    │
    ├─── UPDATE budget
    │    SET contingency = contingency - $50000
    │    WHERE project_id = 'proj-001'
    │      AND status = 'ACTIVE'
    │
    └─── IF ALL SUCCESS:
             COMMIT
         ELSE:
             ROLLBACK (no changes applied)

┌─────────────────────────────────────────────────────────────────┐
│                   TRANSACTION GUARANTEES                         │
└─────────────────────────────────────────────────────────────────┘

✅ Atomicity:   All updates succeed or all fail
✅ Consistency: No half-updated states
✅ Isolation:   Concurrent operations don't interfere
✅ Durability:  Committed changes are permanent
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR SCENARIOS                              │
└─────────────────────────────────────────────────────────────────┘

Scenario 1: Prime Contract Not Found
    approve() → Find PrimeContract → NOT FOUND
                        ↓
                 Log warning
                        ↓
                 Continue (don't fail)
                        ↓
                 Return success

Scenario 2: Budget Line Item Not Found
    updateBudgetImpact() → Find BudgetLineItem → NOT FOUND
                        ↓
                 Log warning
                        ↓
                 Continue (don't fail)
                        ↓
                 Return success

Scenario 3: Negative Contingency
    updateBudgetImpact() → Calculate new contingency → NEGATIVE
                        ↓
                 Log warning
                        ↓
                 Apply anyway (don't fail)
                        ↓
                 Return success

Scenario 4: Database Error
    transaction() → Any operation fails → ERROR
                        ↓
                 ROLLBACK all changes
                        ↓
                 Throw exception
                        ↓
                 Return 500 error to client
```

## API Usage Examples

```typescript
// Example 1: Approve OCO with full amount
POST /api/financials/owner-change-orders/:id/approve
{
  "notes": "Approved by project manager"
}

// Example 2: Approve OCO with reduced amount
POST /api/financials/owner-change-orders/:id/approve
{
  "approvedAmount": 45000,  // Original was $50K
  "notes": "Approved with 10% reduction"
}

// Example 3: Approve CCO with custom amount
POST /api/financials/commitment-change-orders/:id/approve
{
  "approvedAmount": 38000,  // Original was $40K
  "notes": "Negotiated down from original request"
}
```

## Summary

The critical integrations ensure that:

1. **Revenue tracking**: OCO approvals immediately update prime contract value
2. **Cost tracking**: CCO approvals immediately update commitment value
3. **Budget tracking**: Both OCO and CCO approvals flow through to budget
4. **Data consistency**: All updates happen atomically in transactions
5. **Financial precision**: Decimal.js prevents rounding errors
6. **Audit trail**: Comprehensive logging of all changes
