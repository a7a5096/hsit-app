// Remove Eruda debugging tool references or initialize properly
// This file should be included in dashboard.html to fix Eruda script errors

// Check if Eruda is being used in the project
if (typeof eruda !== 'undefined') {
  // Initialize Eruda properly if it's available
  eruda.init();
} else {
  // Create a dummy eruda object to prevent errors
  window.eruda = {
    init: function() {
      console.log('Eruda debugging disabled in production');
      return true;
    }
  };
}

// Log initialization
console.log('Eruda initialization handler loaded');
