document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton'); // Using 'spinButton'
    
    // New elements from user's HTML
    const wheelElement = document.getElementById('wheel'); // The main wheel div
    const resultMessage = document.getElementById('result-message');
    const winningsAmountDisplay = document.getElementById('winningsAmount');
    const newUbtBalanceDisplay = document.getElementById('newUbtBalance');
    const spinError = document.getElementById('spinError');

    const token = localStorage.getItem('token');
    let currentUserUbtBalance = 0;
    const COST_PER_SPIN = 10; 

    if (spinCostDisplay) {
        spinCostDisplay.textContent = COST_PER_SPIN;
    }

    function showSpinError(message) {
        if (spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
    }
    
    function clearSpinMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = 'N/A';
    }

    async function fetchUserUbtBalance() {
        if (!token) {
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A (Not Logged In)";
            showSpinError("Please log in to play.");
            if(spinButton) spinButton.disabled = true;
            return 0;
        }
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                 const errData = await response.json().catch(()=> ({message: "Error fetching balance"}));
                 throw new Error(errData.message);
            }
            const data = await response.json();
            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                currentUserUbtBalance = data.balances.ubt;
                if (
