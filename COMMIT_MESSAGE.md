# HSIT App Bug Fixes

This commit addresses several critical issues in the HSIT app:

1. Transaction Schema Validation Errors:
   - Fixed currency enum to properly handle 'UBT' (uppercase) instead of 'ubt'
   - Added automatic uppercase conversion for currency values
   - Added USDT to supported currencies list
   - Ensured all required fields (fromAddress, txHash, ubtAmount) are properly handled

2. Daily Sign-in Functionality:
   - Updated backend route to properly handle currency case
   - Fixed transaction creation during daily sign-in to include all required fields
   - Improved error handling and validation

3. Frontend Script Errors:
   - Added proper Eruda initialization to fix console debugging
   - Enhanced error handling in frontend code

All fixes have been validated in the production environment and confirmed working.
