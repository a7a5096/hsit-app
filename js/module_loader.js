// Improved module loader with error handling and debugging
// This script ensures all pages can properly import ES modules and handles initialization

// Global error handler to catch and report script errors
window.addEventListener('error', function(event) {
  console.error('Script error caught by global handler:', event.error);
});

// Initialize the application
function initializeApp() {
  console.log('Initializing application with module support...');
  
  // Clear any user data from localStorage except auth token
  const token = localStorage.getItem('token');
  
  // Only keep the authentication token
  if (token) {
    // Temporarily store token
    const tempToken = token;
    
    // Clear localStorage completely
    localStorage.clear();
    
    // Restore only the token
    localStorage.setItem('token', tempToken);
    
    console.log('Cleared localStorage except authentication token');
  }
  
  // Find all script tags that need to import modules
  const scripts = document.querySelectorAll('script[src$=".js"]');
  
  scripts.forEach(script => {
    // Skip scripts that already have type="module"
    if (script.getAttribute('type') === 'module') return;
    
    // Get the original src
    const originalSrc = script.getAttribute('src');
    
    // Skip if not a JavaScript file
    if (!originalSrc || !originalSrc.endsWith('.js')) return;
    
    console.log(`Converting script to module: ${originalSrc}`);
    
    // Create a new script element with type="module"
    const newScript = document.createElement('script');
    newScript.setAttribute('type', 'module');
    newScript.setAttribute('src', originalSrc);
    
    // Add error handling
    newScript.onerror = function(error) {
      console.error(`Error loading module ${originalSrc}:`, error);
    };
    
    // Replace the old script with the new one
    script.parentNode.replaceChild(newScript, script);
  });
  
  console.log('Module conversion complete');
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Expose a global function to force refresh user data
window.forceRefreshUserData = function() {
  console.log('Forcing refresh of user data from backend...');
  
  // This will be implemented by individual page scripts
  if (typeof refreshUserDataFromBackend === 'function') {
    refreshUserDataFromBackend();
  } else {
    console.log('No refresh function available on this page');
    
    // Reload the page as fallback
    window.location.reload();
  }
};

// Log initialization
console.log('Module loader script loaded');
