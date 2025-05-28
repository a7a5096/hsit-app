# Fix Duplicate Index in UserAddress Model

This commit fixes the login failure issue (Status 400) by resolving duplicate MongoDB schema index warnings.

## Problem
- The UserAddress model had duplicate index definitions on the userId field:
  1. `index: true` property in the field definition
  2. Explicit `userAddressSchema.index({ userId: 1 }, { unique: true })` call
- This redundancy created conflicts at the database level, causing Mongoose warnings
- The index conflicts were causing authentication failures, resulting in 400/401 errors

## Solution
- Removed the redundant `index: true` property from the userId field definition
- Created a database script to clean up duplicate indexes in production
- Validated the fix by running the script and confirming index removal

## Files Changed
- backend/models/UserAddress.js - Removed redundant index
- backend/scripts/fix_duplicate_index.js - Added script to clean database indexes

## Testing
- Executed the fix script in production environment
- Confirmed duplicate indexes were successfully removed
- Verified that the MongoDB schema warnings no longer appear
