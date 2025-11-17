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
    let totalRotation = 0; // Track cumulative rotation

    // This prize structure MUST match the backend's `wheel.js` and your wheel_image.png segments
    const PRIZES = [
        { name: "A.I. BOT #5 (Value $3000)", type: "bot", color: "#ffe600" }, // 1 - yellow/green
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 2 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 3 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 4 - white
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#f00" }, // 5 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 6 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 7 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 8 - white
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 9 - blue
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 10 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#f00" }, // 11 - red
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 12 - white
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 13 - blue
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 14 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 15 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 16 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 17 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 18 - white
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 19 - blue
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 20 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 21 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 22 - black
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#06f" }, // 23 - blue
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 24 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 25 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 26 - white
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#f00" }, // 27 - red
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 28 - black
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 29 - white
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" },   // 30 - black
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#f00" }, // 31 - red
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#fff" }, // 32 - white
    ];
    const SEGMENT_COUNT = PRIZES.length;
    const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

    function showSpinError(message) {
        if(spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
            setTimeout(() => {
                spinError.style.display = 'none';
            }, 5000);
        }
    }
    
    function clearMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = 'Spin the wheel to win prizes!';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
    }
    
    // --- Setup Functions ---
    function buildLegend() {
        if (!prizeLegend) return;
        const legendContent = document.createElement('div');
        const uniquePrizes = [...new Map(PRIZES.map(item => [item.name, item])).values()];
        uniquePrizes.forEach(prize => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `<span class="color-box" style="background-color: ${prize.color};"></span><span class="prize-description">${prize.name}</span>`;
            legendContent.appendChild(legendItem);
        });
        prizeLegend.appendChild(legendContent);
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
        wheelImage.classList.add('spinning');

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

            // Calculate rotation - the wheel spins clockwise, so we need to account for that
            // We want the pointer at the top to land on the prize
            const targetAngle = 360 - (prizeIndex * SEGMENT_ANGLE) - (SEGMENT_ANGLE / 2);
            const randomSpins = 6 + Math.floor(Math.random() * 3); // 6-8 full spins for dramatic effect
            const spinRotation = (randomSpins * 360) + targetAngle;
            
            // Add to cumulative rotation
            totalRotation += spinRotation;
            
            if (wheelImage) {
                wheelImage.style.transition = 'transform 6s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                wheelImage.style.transform = `rotate(${totalRotation}deg)`;
            }

            // Show result after animation completes
            setTimeout(() => {
                wheelImage.classList.remove('spinning');
                isSpinning = false;
                spinButton.disabled = false;
                spinButton.textContent = 'Spin Again!';
                
                if (result.success) {
                    if (resultMessage) {
                        resultMessage.textContent = result.message;
                        resultMessage.style.color = result.creditsAdded > 0 ? '#00ff88' : '#ff4757';
                    }
                    if (winningsAmountDisplay) {
                        winningsAmountDisplay.textContent = (result.creditsAdded || 0).toFixed(2);
                        winningsAmountDisplay.style.color = result.creditsAdded > 0 ? '#00ff88' : '#ff4757';
                    }
                    if (newUbtBalanceDisplay && typeof result.newBalance === 'number') {
                        newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    }
                    if (ubtBalanceDisplay && typeof result.newBalance === 'number') {
                        ubtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                        currentUserUbtBalance = result.newBalance;
                    }
                    
                    // Celebratory effect for wins
                    if (result.creditsAdded > 0) {
                        createConfetti();
                    }
                } else {
                    showSpinError(result.message);
                }
            }, 6200); // Match CSS transition duration + buffer

        } catch (error) {
            console.error('Spin error:', error);
            showSpinError(error.message || 'An error occurred.');
            wheelImage.classList.remove('spinning');
            isSpinning = false;
            spinButton.disabled = false;
            spinButton.textContent = 'Spin Now!';
        }
    }

    // Create confetti effect for wins
    function createConfetti() {
        const colors = ['#00ff88', '#00b8ff', '#ffcc00', '#ff4757'];
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-10px';
                confetti.style.borderRadius = '50%';
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '9999';
                confetti.style.opacity = '1';
                confetti.style.transition = 'all 2s ease-out';
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.style.top = window.innerHeight + 'px';
                    confetti.style.opacity = '0';
                    confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
                }, 50);
                
                setTimeout(() => {
                    confetti.remove();
                }, 2100);
            }, i * 50);
        }
    }

    // --- Initial Setup ---
    function initialize() {
        if (!wheelImage) {
            console.error("The wheel image element with id 'wheelImage' was not found!");
            return;
        }
        wheelImage.style.transform = 'rotate(0deg)';
        if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;
        buildLegend();
        fetchUserUbtBalance();
        if (spinButton) spinButton.addEventListener('click', handleSpin);
    }

    initialize();
});
