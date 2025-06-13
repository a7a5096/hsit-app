document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelImage = document.getElementById('wheelImage');
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
        { name: "A.I. BOT #5 (Value $3000)", type: "bot", color: "#ffe600" }, // 1 - yellow/green
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 2 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 3 - white
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#f00" }, // 4 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 5 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#06f" },// 6 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 7 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 8 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#f00" }, // 9 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 10 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#06f" },// 11 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 12 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 13 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#f00" }, // 14 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 15 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#06f" },// 16 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 17 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 18 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#f00" }, // 19 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 20 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#06f" },// 21 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 22 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 23 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#f00" }, // 24 - red
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
        try {
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const response = await fetch(`${API_URL}/api/wheel/balance`, {
                method: 'GET',
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch UBT balance');
            }

            const data = await response.json();
            currentUserUbtBalance = data.balance;
            
            if (ubtBalanceDisplay) {
                ubtBalanceDisplay.textContent = data.balance.toFixed(2);
            }
        } catch (error) {
            console.error('Error fetching UBT balance:', error);
            showSpinError('Error loading your UBT balance. Please try again later.');
        }
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
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-auth-token': token 
                },
                body: JSON.stringify({
                    betAmount: COST_PER_SPIN
                })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Spin request failed.");

            // Find the prize in our local PRIZES array that matches the backend result
            const prizeIndex = PRIZES.findIndex(p => p.name === result.prize);
            if (prizeIndex === -1) {
                throw new Error('Invalid prize received from server');
            }

            const targetAngle = prizeIndex * SEGMENT_ANGLE;
            const randomSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
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
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.creditsAdded || 0;
                    if (newUbtBalanceDisplay && typeof result.newBalance === 'number') {
                        newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    }
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
