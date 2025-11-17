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

    // Prize structure matching the ACTUAL wheel_image.png layout (32 segments, clockwise from top)
    const PRIZES = [
        { name: "A.I. BOT #5 (Value $3000)", type: "bot", color: "#50C878" }, // 0 - green/yellow WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 1 - black narrow
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#DC143C" }, // 2 - red WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 3 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 4 - white narrow
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 5 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 6 - white narrow
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#DC143C" }, // 7 - red WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 8 - black narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 9 - blue WIDE
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 10 - white narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 11 - blue WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 12 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 13 - white narrow
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 14 - black narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 15 - blue WIDE
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 16 - white narrow
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 17 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 18 - white narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 19 - blue WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 20 - black narrow
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#DC143C" }, // 21 - red WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 22 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 23 - white narrow
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 24 - black narrow
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 25 - white narrow
        { name: "10x Win", type: "multiplier", multiplier: 10, color: "#DC143C" }, // 26 - red WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 27 - black narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 28 - blue WIDE
        { name: "1x Win", type: "multiplier", multiplier: 1, color: "#FFF" }, // 29 - white narrow
        { name: "2x Win", type: "multiplier", multiplier: 2, color: "#4169E1" }, // 30 - blue WIDE
        { name: "Lose", type: "multiplier", multiplier: 0, color: "#000" }, // 31 - black narrow
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

            // Calculate rotation to land on the correct prize
            // The wheel has 32 segments, each is 11.25 degrees (360/32)
            // Segments are numbered 0-31, starting from the top and going clockwise
            // We need to rotate the wheel so the prize lands at the pointer (top center)
            // The pointer points to the CENTER of a segment
            
            // Calculate the angle to rotate TO (where the prize should end up)
            // Since segment 0 starts at top, we rotate counter-clockwise by prizeIndex segments
            const targetAngle = -(prizeIndex * SEGMENT_ANGLE);
            
            // Add multiple full rotations for visual effect (6-8 full spins)
            const randomSpins = 6 + Math.floor(Math.random() * 3);
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
