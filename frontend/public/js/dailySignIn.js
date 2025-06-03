// js/dailySignIn.js (Modified)

import { updateBalance } from './balanceManager.js'; // Import the update function

// ... inside the event listener for the daily sign-in button, after a successful API call ...
.then(data => {
    if (data.success) {
        // ... show success message ...
        
        // Update the balance using the manager
        if (data.balances) {
            updateBalance(data.balances);
        }
        
        // Update the button text with the new UBT balance from the response
        if (data.balances && data.balances.ubt !== undefined) {
            const signInText = document.getElementById('signInText');
            if(signInText) {
                signInText.textContent = `UBT: ${data.balances.ubt.toFixed(2)}`;
            }
        }
        
        // ... disable button ...
    } else {
        // ... handle error ...
    }
})
// ...
