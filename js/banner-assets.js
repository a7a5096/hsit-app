// Initialize banner assets from database
async function initializeBannerAssets() {
  try {
    // Fetch banner assets for dashboard page from API
    const response = await fetch('/api/banner-assets/page/dashboard');
    
    if (!response.ok) {
      throw new Error('Failed to fetch banner assets');
    }
    
    const bannerAssets = await response.json();
    
    // If no banner assets found in database, use default assets
    if (!bannerAssets || bannerAssets.length === 0) {
      console.log('No banner assets found in database, using defaults');
      return;
    }
    
    // Clear existing banner content
    const bannerSection = document.querySelector('.banner');
    if (bannerSection) {
      bannerSection.innerHTML = '';
      
      // Add banner assets in order of z-index
      bannerAssets.forEach(asset => {
        const img = document.createElement('img');
        img.src = asset.path;
        img.alt = asset.name;
        img.className = asset.type === 'background' ? 'banner-background-video' : 'banner-content';
        bannerSection.appendChild(img);
      });
    }
  } catch (error) {
    console.error('Error loading banner assets:', error);
    
    // Fallback to default banner structure if API fails
    const bannerSection = document.querySelector('.banner');
    if (bannerSection) {
      bannerSection.innerHTML = `
        <img src="images/IMG_6204.gif" alt="Animated Background" class="banner-background-video">
        <img src="banner.png" alt="AI Trading Banner" class="banner-content">
      `;
    }
  }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeBannerAssets();
});

// Export for module usage
export { initializeBannerAssets };
