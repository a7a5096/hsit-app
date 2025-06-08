document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelImage = document.getElementById('wheelImage'); // <-- Changed from wheelElement
    const prizeLegend = document.getElementById('prize-legend');
    const resultMessage = document.getElementById('result-message');
    const winningsAmountDisplay = document.getElementById('winningsAmount');
    const newUbtBalanceDisplay = document.getElementById('newUbtBalance');
    const spinError = document.getElementById('spinError');

    // Game state and configuration
    const token = localStorage.getItem('token');
    let currentUserUbtBalance = 0;
    const COST_PER_SPIN = 10;
    let isSpinning = false;

    // This prize structure MUST match the backend's `wheel.js` and your wheel_image.png segments
    const PRIZES = [
       
        
wwww
bbbb
wwww
rrrr
bbbb
blbl
wwww
rrrr
wwww
rrrr
wwww
blbl
    
        
        
        { name: "Free AI Bot!", color: '#FFD700' }, 
        { name: "1x Win", color: 'rgb(255, 255, 255)' },
        { name: "Lose", color: 'rgb(0, 0, 0)' },
        { name: "1x Win", color: 'rgb(255, 255, 255)' },
        { name: "10x Win!", color: 'rgb(255, 0, 0)' },
        { name: "Lose", color: 'rgb(0, 0, 0)' },
        { name: "2x Win!", color: 'rgb(255, 255, 0)' },
        { name: "1x Win", color: 'rgb(255, 255, 255)' },
        { name: "10x Win!", color: 'rgb(255, 0, 0)' },
        
        { name: "Lose", color: 'rgb(0, 0, 0)' },
        { name: "1x Win", color: 'rgb(0, 0, 255)' },
        { name: "Lose", color: 'rgb(0, 0, 0)' },
        { name: "2x Win!", color: 'rgb(255, 255, 0)' },
        { name: "Lose", color: 'rgb(0, 0, 0)' },
    ];
    const SEGMENT_COUNT = PRIZES.length;
    const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;


    function showSpinError(message) {
        if(spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
    }
    
    function clearMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
    }
    
    // --- Setup Functions ---
    function buildLegend() {
        if (!prizeLegend) return;
        prizeLegend.innerHTML = '<h3>Prize Legend</h3>';
        const uniquePrizes = [...new Map(PRIZES.map(item => [item.name, item])).values()];
        uniquePrizes.forEach(prize => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `<span class="color-box" style="background-color: ${prize.color};"></span><span class="prize-description">${prize.name}</span>`;
            prizeLegend.appendChild(legendItem);
        });
    }

    // --- Core Logic ---
    async function fetchUserUbtBalance() {
        // ... (This function remains the same as before) ...
    }

    async function handleSpin() {
        if (isSpinning) return;
        
        clearMessages();
        if (currentUserUbtBalance < COST_PER_SPIN) {
            showSpinError(`Not enough UBT. Cost is ${COST_PER_SPIN} UBT.`);
            return;
        }
        
        isSpinning = true;
        spinButton.disabled = true;
        spinButton.textContent = 'Spinning...';

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Spin request failed.");

            const prizeIndex = PRIZES.findIndex(p => p.name === result.prize.name);
            const targetAngle = prizeIndex >= 0 ? prizeIndex * SEGMENT_ANGLE : Math.random() * 360;
            
            const randomSpins = 5 + Math.floor(Math.random() * 3);
            const currentRotation = parseFloat(wheelImage.style.transform.replace(/[^0-9-.]/g, '')) || 0;
            const finalRotation = currentRotation - (currentRotation % 360) + (randomSpins * 360) + targetAngle;
            
            if (wheelImage) {
                wheelImage.style.transform = `rotate(${finalRotation}deg)`;
            }

            setTimeout(() => {
                isSpinning = false;
                spinButton.disabled = false;
                spinButton.textContent = 'Spin Now!';
                if (result.success) {
                    if (resultMessage) resultMessage.textContent = result.message;
                    const winnings = result.prize.type === 'bot' ? (result.prize.bonusUbt || 0) : (COST_PER_SPIN * result.prize.multiplier);
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = winnings;
                    if (newUbtBalanceDisplay && typeof result.newBalance === 'number') newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    if (ubtBalanceDisplay && typeof result.newBalance === 'number') {
                        ubtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                        currentUserUbtBalance = result.newBalance;
                    }
                } else {
                    showSpinError(result.message);
                }
            }, 5100); // Match CSS transition duration + a small buffer

        } catch (error) {
            console.error('Spin error:', error);
            showSpinError(error.message || 'An error occurred.');
            isSpinning = false;
            spinButton.disabled = false;
            spinButton.textContent = 'Spin Now!';
        }
    }

    // --- Initial Setup ---
    function initialize() {
        if (!wheelImage) {
            console.error("The wheel image element with id 'wheelImage' was not found!");
            return;
        }
        wheelImage.style.transform = 'rotate(0deg)'; // Ensure initial state
        if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;
        buildLegend(); // Still useful to show prizes
        fetchUserUbtBalance();
        if (spinButton) spinButton.addEventListener('click', handleSpin);
    }

    initialize();
});
