// UBT Exchange Rate Updater
// This script fetches the current UBT/USDT exchange rate from the backend
// and updates the logo overlay dynamically

// Configuration
const UPDATE_INTERVAL = 5 * 60 * 1000; // Update every 5 minutes
const API_ENDPOINT = '/api/exchange-rates/ubt-usdt';

// Function to fetch the current exchange rate
async function fetchExchangeRate() {
  try {
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('API returned error');
    }
    
    return {
      rate: data.rate,
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error('Error fetching UBT/USDT rate:', error);
    // Return a fallback rate in case of error
    return {
      rate: 0.0325,
      lastUpdated: new Date()
    };
  }
}

// Function to update the dashboard button icon with the current rate
async function updateLogoWithRate() {
  try {
    // Fetch the current rate
    const { rate } = await fetchExchangeRate();
    
    // Format the rate to 4 decimal places
    const formattedRate = rate.toFixed(4);
    
    // Create a new image with the rate overlay
    await createButtonIconWithRateOverlay(formattedRate);
    
    console.log(`Dashboard button icon updated with rate: ${formattedRate}`);
  } catch (error) {
    console.error('Error updating dashboard button icon:', error);
  }
}

// Function to create the dashboard button icon with rate overlay
async function createButtonIconWithRateOverlay(rate) {
  // This function uses the Canvas API to create a new icon with the rate overlay
  // and updates only the dashboard button icon
  
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create a new image element for the icon
      const iconImg = new Image();
      
      // Set up the onload handler
      iconImg.onload = function() {
        // Set canvas dimensions to match the icon
        canvas.width = iconImg.width;
        canvas.height = iconImg.height;
        
        // Draw the icon on the canvas
        ctx.drawImage(iconImg, 0, 0);
        
        // Create white letterbox at the bottom
        const letterboxHeight = 20;
        const letterboxY = canvas.height - letterboxHeight;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, letterboxY, canvas.width, letterboxHeight);
        
        // Add the UBT/USDT rate text in black
        const text = `UBT/USDT: ${rate}`;
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        
        // Calculate text position to center it
        const textWidth = ctx.measureText(text).width;
        const textX = (canvas.width - textWidth) / 2;
        const textY = letterboxY + 14; // Vertically center in the letterbox
        
        // Draw the text
        ctx.fillText(text, textX, textY);
        
        // Get the data URL of the canvas
        const dataUrl = canvas.toDataURL('image/png');
        
        // Update only the dashboard button icon
        const buttonIcon = document.querySelector('a[href="ubt_exchange.html"] img');
        if (buttonIcon) {
          buttonIcon.src = dataUrl;
        }
        
        resolve();
      };
      
      // Set up error handler
      iconImg.onerror = function() {
        reject(new Error('Failed to load icon image'));
      };
      
      // Set the source of the image to the original icon
      // Use a cache-busting query parameter to ensure we get the latest version
      iconImg.src = `/images/ubt_logo_frame.png?t=${Date.now()}`;
      
    } catch (error) {
      reject(error);
    }
  });
}

// Initialize: update the logo immediately and then set up periodic updates
document.addEventListener('DOMContentLoaded', function() {
  // Update immediately on page load
  updateLogoWithRate();
  
  // Set up periodic updates
  setInterval(updateLogoWithRate, UPDATE_INTERVAL);
  
  console.log('UBT Exchange Rate Updater initialized');
});
