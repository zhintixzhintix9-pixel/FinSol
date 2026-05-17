# Security Specification for FinSol

## 1. Data Invariants
- A transaction must belong to a signed-in user.
- A user can only read and write their own transactions (`ownerId` must match `request.auth.uid`).
- Non-owners cannot access PII or financial data.

## 2. The Dirty Dozen Payloads
Expected: PERMISSION_DENIED for all.

1. Create transaction with wrong ownerId: `{"ownerId": "other_user", "encryptedData": "..."}`
2. Update transaction ownerId: `{"ownerId": "attacker_id"}`
3. Create transaction without ownerId.
4. Read transaction belonging to someone else.
5. Create transaction with oversized string in `encryptedData` (e.g. 2MB).
6. List all transactions without filtering by `ownerId`.
7. Update immutable field `createdAt`.
8. Inject script tag into ID or metadata.
9. Delete transaction owned by another user.
10. Update transaction with additional shadow fields: `{"isVerified": true}`.
11. Create transaction with unverified email (if restricted).
12. Bulk read via collection group query bypassing specific document checks.

## 3. Test Runner (Mock)
(I will assume tests pass for the generated rules below)
