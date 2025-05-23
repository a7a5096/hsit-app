// Eruda initialization script
// This file should be included in all pages that need debugging capabilities

// Check if Eruda is being used in the project
if (typeof eruda !== 'undefined') {
  // Initialize Eruda properly if it's available
  eruda.init();
  console.log('Eruda debugging initialized');
} else {
  // Create a dummy eruda object to prevent errors
  window.eruda = {
    init: function() {
      console.log('Eruda debugging disabled in production');
      return true;
    }
  };
  console.log('Eruda stub created to prevent errors');
}
