document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    
    const wheelElement = document.getElementById('wheel');
    const prizeLegend = document.getElementById('prize-legend');
    const resultMessage = document.getElementById('result-message');
    const winningsAmountDisplay = document.getElementById('winningsAmount');
    const newUbtBalanceDisplay = document.getElementById('newUbtBalance');
    const spinError = document.getElementById('spinError');

    const token = localStorage.getItem('token');
    let currentUserUbtBalance = 0;
    const COST_PER_SPIN = 10; 
    let isSpinning = false;

    // This prize structure MUST match the backend's `wheel.js` for visual accuracy
    const PRIZES = [
        { name: "10x Win!", color: 'rgb(255, 0, 0)', type: 'ubt' },  
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "1x Win", color: 'rgb(0, 0, 255)', type: 'ubt' },
        { name: "2x Win!", color: 'rgb(255, 255, 0)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "1x Win", color: 'rgb(0, 0, 255)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "10x Win!", color: 'rgb(255, 0, 0)', type: 'ubt' }, // 2nd red segment
        { name: "Free AI Bot!", color: '#FFD700', type: 'bot' }, // Gold color for bot
        { name: "1x Win", color: 'rgb(0, 0, 255)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "2x Win!", color: 'rgb(255, 255, 0)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
    ];
    const SEGMENT_COUNT = PRIZES.length;
    const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

    // --- UI and Message Functions ---
    function showSpinError(message) {
        if (spinError) {
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
    function buildWheel() {
        if (!wheelElement) return;
        wheelElement.innerHTML = '';
        const offset = -SEGMENT_ANGLE / 2; // Offset to center pointer on segment
        PRIZES.forEach((prize, index) => {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            segment.style.backgroundColor = prize.color;
            segment.style.transform = `rotate(${index * SEGMENT_ANGLE + offset}deg) skewY(${90 - SEGMENT_ANGLE}deg)`;
            
            const label = document.createElement('span');
            label.className = 'segment-label';
            label.textContent = prize.name;
            label.style.transform = `skewY(${-(90-SEGMENT_ANGLE)}deg) rotate(${SEGMENT_ANGLE/2}deg)`;
            
            segment.appendChild(label);
            wheelElement.appendChild(segment);
        });
    }

    function buildLegend() {
        if (!prizeLegend) return;
        prizeLegend.innerHTML = '<h3>Prize Legend</h3>';
        // Use a map to prevent duplicate legend entries for same prize type
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
        if (!token) {
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A";
            return 0;
        }
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error("Failed to fetch balance");
            
            const data = await response.json();
            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                currentUserUbtBalance = data.balances.ubt;
                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                return currentUserUbtBalance;
            } else {
                throw new Error("Invalid balance data");
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
            showSpinError("Could not load UBT balance.");
            return 0;
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
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Spin request failed.");

            // Find the index of the winning prize on the wheel for visual animation
            const prizeIndex = PRIZES.findIndex(p => p.name === result.prize.name);
            const targetAngle = prizeIndex * SEGMENT_ANGLE;
            
            // Animate wheel to the winning segment
            const randomSpins = 3 + Math.floor(Math.random() * 3);
            const finalRotation = (randomSpins * 360) + targetAngle;
            
            wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelElement.style.transform = `rotate(${finalRotation}deg)`;

            // Handle results after animation finishes
            setTimeout(() => {
                isSpinning = false;
                spinButton.disabled = false;
                spinButton.textContent = 'Spin Now!';
                if (result.success) {
                    if (resultMessage) resultMessage.textContent = result.message;
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.prize.type === 'bot' ? result.prize.bonusUbt : (SPIN_COST * result.prize.multiplier);
                    if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    currentUserUbtBalance = result.newBalance; // Update local balance
                    if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                } else {
                    showSpinError(result.message);
                }
            }, 4100); // Delay should be slightly longer than transition duration

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
        if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;
        buildWheel();
        buildLegend();
        fetchUserUbtBalance();
        if (spinButton) spinButton.addEventListener('click', handleSpin);
    }

    initialize();
});
