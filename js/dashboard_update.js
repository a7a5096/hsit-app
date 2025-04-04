// Update the dashboard.html to include a link to the new Feeling Lucky page
// This script should be added to the dashboard.js file

document.addEventListener('DOMContentLoaded', () => {
    // Find the navigation menu or section where the Lucky Wheel link was
    const navMenu = document.querySelector('.nav-menu') || document.querySelector('.dashboard-links');
    
    if (navMenu) {
        // Look for the existing Lucky Wheel link
        const existingWheelLink = Array.from(navMenu.querySelectorAll('a')).find(link => 
            link.textContent.includes('Lucky Wheel') || 
            link.href.includes('lucky_wheel.html')
        );
        
        if (existingWheelLink) {
            // Replace the existing link with the new Feeling Lucky link
            existingWheelLink.href = 'feeling_lucky.html';
            existingWheelLink.textContent = existingWheelLink.textContent.replace('Lucky Wheel', 'Feeling Lucky');
        } else {
            // If no existing link found, create a new one
            const newLuckyLink = document.createElement('a');
            newLuckyLink.href = 'feeling_lucky.html';
            newLuckyLink.className = existingWheelLink ? existingWheelLink.className : 'dashboard-link';
            newLuckyLink.innerHTML = '<i class="fas fa-dice"></i> Feeling Lucky';
            navMenu.appendChild(newLuckyLink);
        }
    }
});
