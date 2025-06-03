# Implement static file solution for GIF behind banner

This commit simplifies the previous approach by using a static file solution to play the GIF behind the banner on the dashboard page:

1. Removed all database-driven banner asset code
2. Implemented a simple CSS solution to layer the GIF behind the banner using z-index positioning
3. Kept the static file references in the HTML

This solution ensures the GIF plays behind the banner while using a simpler static file approach as requested.
