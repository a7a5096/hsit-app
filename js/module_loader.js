// HTML script type="module" fix for all pages
// This script ensures all pages can properly import ES modules

document.addEventListener('DOMContentLoaded', function() {
  // Find all script tags that need to import modules
  const scripts = document.querySelectorAll('script[src$=".js"]');
  
  scripts.forEach(script => {
    // Skip scripts that already have type="module"
    if (script.getAttribute('type') === 'module') return;
    
    // Get the original src
    const originalSrc = script.getAttribute('src');
    
    // Skip if not a JavaScript file
    if (!originalSrc || !originalSrc.endsWith('.js')) return;
    
    // Create a new script element with type="module"
    const newScript = document.createElement('script');
    newScript.setAttribute('type', 'module');
    newScript.setAttribute('src', originalSrc);
    
    // Replace the old script with the new one
    script.parentNode.replaceChild(newScript, script);
  });
});
