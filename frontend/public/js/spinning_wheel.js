document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelElement = document.getElementById('wheel');
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

    // This structure MUST match the backend's `wheel.js` PRIZES array
    const PRIZES = [
        { name: "10x Win!", color: 'rgb(255, 0, 0)', type: 'ubt' },  
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "1x Win", color: 'rgb(0, 0, 255)', type: 'ubt' },
        { name: "2x Win!", color: 'rgb(255, 255, 0)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "1x Win", color: 'rgb(0, 0, 255)', type: 'ubt' },
        { name: "Lose", color: 'rgb(0, 0, 0)', type: 'ubt' },
        { name: "10x Win!", color: 'rgb(255, 0, 0)', type: 'ubt' },
        { name: "Free AI Bot!", color: '#FFD700', type: 'bot' },
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
    function buildWheelAndLegend() {
        if (wheelElement) {
            wheelElement.innerHTML = '';
            const offset = -SEGMENT_ANGLE / 2; // Offset to center pointer on the middle of a segment
            PRIZES.forEach((prize, index) => {
                const segment = document.createElement('div');
                segment.className = 'wheel-segment';
                segment.style.backgroundColor = prize.color;
                // This CSS creates the wedge shapes. It requires specific CSS for .wheel-segment in your stylesheet.
                segment.style.transform = `rotate(${index * SEGMENT_ANGLE + offset}deg) skewY(${90 - SEGMENT_ANGLE}deg)`;
                
                const label = document.createElement('span');
                label.className = 'segment-label';
                label.textContent = prize.name;
                // This counter-transforms the text to make it readable
                label.style.transform = `skewY(${-(90 - SEGMENT_ANGLE)}deg) rotate(${SEGMENT_ANGLE / 2}deg)`;
                
                segment.appendChild(label);
                wheelElement.appendChild(segment);
            });
        }
        if (prizeLegend) {
            prizeLegend.innerHTML = '<h3>Prize Legend</h3>';
            const uniquePrizes = [...new Map(PRIZES.map(item => [item.name, item])).values()];
            uniquePrizes.forEach(prize => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `<span class="color-box" style="background-color: ${prize.color};"></span><span class="prize-description">${prize.name}</span>`;
                prizeLegend.appendChild(legendItem);
            });
        }
    }

    // --- Core Logic ---
    async function fetchUserUbtBalance() {
        if (!token) {
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A";
            showSpinError("Please log in to play.");
            if(spinButton) spinButton.disabled = true;
            return;
        }
        console.log("Fetching user balance...");
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error("Failed to fetch balance from server.");
            
            const data = await response.json();
            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                currentUserUbtBalance = data.balances.ubt;
                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (spinButton) spinButton.disabled = false;
            } else {
                throw new Error("Invalid balance data received from server.");
            }
        } catch (error) {
            console.error('Error fetching UBT balance:', error);
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
            showSpinError(error.message || "Could not load your UBT balance.");
            if(spinButton) spinButton.disabled = true;
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

            // Find the index of the winning prize to determine where the wheel should stop
            const prizeIndex = PRIZES.findIndex(p => p.name === result.prize.name);
            const targetAngle = prizeIndex >= 0 ? prizeIndex * SEGMENT_ANGLE : Math.random() * 360; // fallback to random angle
            
            // Animate wheel to the winning segment
            const randomSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full spins for effect
            // We use the negative targetAngle because a positive rotate() goes clockwise. The pointer is at the top (0 degrees).
            // To make the wheel stop with segment N under the pointer, we rotate the wheel by -N*angle.
            const finalRotation = (randomSpins * 360) - targetAngle;
            
            wheelElement.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelElement.style.transform = `rotate(${finalRotation}deg)`;

            // Handle results after animation finishes
            setTimeout(() => {
                isSpinning = false;
                spinButton.disabled = false;
                spinButton.textContent = 'Spin Now!';
                if (result.success) {
                    if (resultMessage) resultMessage.textContent = result.message;
                    if (winningsAmountDisplay) {
                        const winnings = result.prize.type === 'bot' ? (result.prize.bonusUbt || 0) : (SPIN_COST * result.prize.multiplier);
                        winningsAmountDisplay.textContent = winnings;
                    }
                    if (newUbtBalanceDisplay && typeof result.newBalance === 'number') {
                        newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    }
                    // Update main balance display
                    if (ubtBalanceDisplay && typeof result.newBalance === 'number') {
                        ubtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                        currentUserUbtBalance = result.newBalance; // Update local state
                    }
                } else {
                    showSpinError(result.message);
                }
            }, 5100); // Delay should be slightly longer than CSS transition duration

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
        buildWheelAndLegend();
        fetchUserUbtBalance();
        if (spinButton) spinButton.addEventListener('click', handleSpin);
    }

    initialize();
});
