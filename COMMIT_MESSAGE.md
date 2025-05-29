# UBT Logo and Dashboard Button Update

This commit adds the following features:

1. Replaces the logo on the index page with the first frame of the provided GIF
2. Adds a white letterbox with black text showing the UBT/USDT exchange rate at the bottom of the logo
3. Adds a dedicated button on the dashboard with the same icon, linking to the UBT exchange page
4. Implements a backend API to fetch and store the live UBT/USDT exchange rate
5. Ensures the exchange rate updates dynamically through frontend integration

## Technical Details

- Created a new ExchangeRate model for database persistence
- Added new API endpoints for fetching and updating exchange rates
- Implemented frontend JavaScript to dynamically update the logo overlay
- Ensured all changes are production-ready and database-driven
