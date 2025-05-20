/**
 * Update hamburger menu to include all required sections
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Hamburger menu component loaded');
    
    // Get hamburger menu element
    const hamburgerMenu = document.getElementById('hamburger-menu');
    if (!hamburgerMenu) {
        console.error('Hamburger menu element not found');
        return;
    }
    
    // Update hamburger menu with all required sections
    updateHamburgerMenu();
});

/**
 * Update hamburger menu with all required sections
 */
function updateHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    if (!hamburgerMenu) return;
    
    // Define menu items
    const menuItems = [
        { name: 'Dashboard', url: 'dashboard.html', icon: 'dashboard' },
        { name: 'Asset Center', url: 'asset_center.html', icon: 'account_balance_wallet' },
        { name: 'AI Bot', url: 'ai_products.html', icon: 'smart_toy' },
        { name: 'My Team', url: 'my_team.html', icon: 'people' },
        { name: 'Spinning Wheel', url: 'spinning_wheel_game.html', icon: 'casino' },
        { name: 'Feeling Lucky', url: 'feeling_lucky.html', icon: 'stars' },
        { name: 'Transactions', url: 'transactions.html', icon: 'receipt_long' },
        { name: 'UBT Exchange', url: 'ubt_exchange.html', icon: 'currency_exchange' },
        { name: 'Deposit', url: 'deposit.html', icon: 'add_circle' }
    ];
    
    // Clear existing menu items
    hamburgerMenu.innerHTML = '';
    
    // Add menu items
    menuItems.forEach(item => {
        const menuItem = document.createElement('a');
        menuItem.href = item.url;
        menuItem.className = 'menu-item';
        
        // Create icon element
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = item.icon;
        
        // Create text element
        const text = document.createElement('span');
        text.textContent = item.name;
        
        // Append icon and text to menu item
        menuItem.appendChild(icon);
        menuItem.appendChild(text);
        
        // Append menu item to hamburger menu
        hamburgerMenu.appendChild(menuItem);
    });
}
