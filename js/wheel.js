/**
 * Updated spinning wheel game implementation
 * Uses database-driven UBT balance management
 */
document.addEventListener('DOMContentLoaded', () => {
    const wheel = document.getElementById('luckyWheel');
    const spinButton = document.getElementById('spinButton');
    const wheelResult = document.getElementById('wheelResult');
    const balanceDisplay = document.getElementById('ubtBalance');
    const API_URL = 'https://hsit-backend.onrender.com';

    // Define the segments IN THE ORDER THEY APPEAR CLOCKWISE ON THE WHEEL
    const segments = [
        { label: "1 UBT", value: 1, currency: "ubt" },
        { label: "Sorry", value: 0, currency: "none" },
        { label: "20 USDT", value: 20, currency: "usdt" },
        { label: "Sorry", value: 0, currency: "none" },
        { label: "10 UBT", value: 10, currency: "ubt" },
        { label: "Sorry", value: 0, currency: "none" }
    ];

    const segmentCount = segments.length;
    const segmentAngle = 360 / segmentCount;
    let isSpinning = false;
    let currentRotation = 0; // Keep track of the wheel's rotation

    // Fetch UBT balance from the backend
    async function fetchUBTBalance() {
        try {
            const token = localStorage.getItem('token');
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
            
            if (balanceDisplay) {
                balanceDisplay.textContent = data.balance.toFixed(2);
            }
            
            return data.balance;
        } catch (error) {
            console.error('Error fetching UBT balance:', error);
            showMessage('Error loading your UBT balance. Please try again later.', 'error');
            return 0;
        }
    }

    // Process wheel spin via backend
    async function processWheelSpin() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/index.html';
                return null;
            }

            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to process wheel spin');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error processing wheel spin:', error);
            showMessage(error.message || 'Error processing your spin. Please try again later.', 'error');
            return null;
        }
    }

    // Initialize the wheel
    async function initWheel() {
        await fetchUBTBalance();
        
        // Optional: Position segments visually if not using a background image
        const segmentElements = wheel.querySelectorAll('.segment');
        segmentElements.forEach((seg, index) => {
            const angle = segmentAngle * index + (segmentAngle / 2);
            seg.style.transform = `rotate(${angle}deg) translate(0, -110px) rotate(-${angle}deg)`;
        });
    }

    // Handle spin button click
    spinButton.addEventListener('click', async () => {
        if (isSpinning) return; // Don't spin if already spinning

        isSpinning = true;
        spinButton.disabled = true;
        wheelResult.textContent = 'Spinning...';

        // Process the spin on the backend
        const spinResult = await processWheelSpin();
        
        if (!spinResult) {
            isSpinning = false;
            spinButton.disabled = false;
            wheelResult.textContent = 'Spin failed. Try again.';
            return;
        }

        // Calculate rotation to show the winning segment
        const winningSegmentIndex = spinResult.result.segmentIndex;
        
        // Add multiple full rotations for visual effect (e.g., 3 to 7 rotations)
        const randomRotations = Math.floor(Math.random() * 5) + 3; // 3 to 7 full spins
        
        // Calculate the angle to the winning segment
        // We need to rotate so that the winning segment lands at the top (pointer position)
        // The winning segment's center should be at the top (0 degrees)
        const winningSegmentAngle = segmentAngle * winningSegmentIndex;
        
        // Calculate total rotation: random full rotations + angle to winning segment
        // We add 360 - winningSegmentAngle because we want the segment to stop at the top
        const totalRotation = (randomRotations * 360) + (360 - winningSegmentAngle);

        // Apply the rotation using CSS transition
        wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheel.style.transform = `rotate(${currentRotation + totalRotation}deg)`;

        // Update current rotation for the next spin
        currentRotation += totalRotation;

        // Update UI after the animation ends
        setTimeout(async () => {
            // Update the result text
            wheelResult.textContent = `You won: ${spinResult.result.prize}!`;
            
            // Update the UBT balance display
            if (balanceDisplay) {
                balanceDisplay.textContent = spinResult.result.newBalance.toFixed(2);
            }
            
            isSpinning = false;
            spinButton.disabled = false;
        }, 4000); // Match the timeout to the CSS transition duration
    });

    // Show message function
    function showMessage(message, type = 'info') {
        // Check if status message element exists
        let statusElement = document.getElementById('statusMessage');
        
        // If not, create one
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'statusMessage';
            statusElement.className = 'status-message';
            document.body.prepend(statusElement);
        }
        
        // Set message and class
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Show message
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    // Initialize the wheel
    initWheel();
});
