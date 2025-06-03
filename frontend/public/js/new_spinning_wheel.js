// js/new_spinning_wheel.js

import { getBalance, updateBalance } from './balanceManager.js';

// --- DOM Elements ---
const wheel = document.querySelector('.wheel');
const spinButton = document.getElementById('spin-button');
const betAmountInput = document.getElementById('bet-amount');
const balanceDisplay = document.getElementById('ubt-balance');
const resultMessage = document.querySelector('.result-message');

// --- Game Configuration ---
const segments = [
    { color: 'black', multiplier: 0, prizeText: 'No prize', start: 0, end: 0.50 },    // 50%
    { color: 'green', multiplier: 1, prizeText: '1x your bet', start: 0.50, end: 0.75 }, // 25%
    { color: 'blue',  multiplier: 2, prizeText: '2x your bet', start: 0.75, end: 0.90 },  // 15%
    { color: 'red',   multiplier: 10, prizeText: '10x your bet!', start: 0.90, end: 1.00 }   // 10%
];
const MIN_BET = 0.1;
const MAX_BET = 50;
const API_URL = "https://hsit-backend.onrender.com";

let currentBalance = null;
let isSpinning = false;

// --- Functions ---

/**
 * Updates the balance display on the page.
 */
function displayBalance() {
    if (currentBalance && typeof currentBalance.ubt === 'number') {
        balanceDisplay.textContent = currentBalance.ubt.toFixed(2);
    } else {
        balanceDisplay.textContent = "N/A";
    }
}

/**
 * Determines the winning segment based on percentages.
 * @returns {object} The winning segment object.
 */
function getWinningSegment() {
    const rand = Math.random();
    return segments.find(segment => rand >= segment.start && rand < segment.end);
}

/**
 * Handles the spin button click.
 */
async function handleSpin() {
    if (isSpinning) return;

    const betAmount = parseFloat(betAmountInput.value);

    // --- Input Validation ---
    if (isNaN(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
        alert(`Please enter a bet between ${MIN_BET} and ${MAX_BET} UBT.`);
        return;
    }
    if (!currentBalance || currentBalance.ubt < betAmount) {
        alert("Insufficient balance for this bet.");
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    resultMessage.textContent = "Spinning...";
    resultMessage.style.color = "white";

    const winningSegment = getWinningSegment();
    const segmentSpan = (winningSegment.end - winningSegment.start) * 360;
    const randomAngleWithinSegment = Math.random() * segmentSpan;
    const targetAngle = (winningSegment.start * 360) + randomAngleWithinSegment;
    
    // Add rotations for effect and aim for the top pointer.
    const totalRotation = 360 * 6 + (360 - targetAngle);

    wheel.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(async () => {
        const winnings = betAmount * winningSegment.multiplier;

        try {
            // --- Secure Backend Call to Finalize Spin ---
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/wheel/new-spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
                body: JSON.stringify({ betAmount, winnings })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'An error occurred during the spin.');
            
            updateBalance(result.balances);

            if (winnings > 0) {
                resultMessage.textContent = `You won ${winnings.toFixed(2)} UBT! (${winningSegment.prizeText})`;
                resultMessage.style.color = "#2ecc71"; // Green for win
            } else {
                resultMessage.textContent = "No prize. Better luck next time!";
                resultMessage.style.color = "#e74c3c"; // Red for loss
            }

        } catch (error) {
            console.error('Spin finalization failed:', error);
            alert(`Error: ${error.message}. Your balance has not been changed.`);
            resultMessage.textContent = "An error occurred.";
            await getBalance(true); // Re-sync balance after error
        } finally {
            isSpinning = false;
            spinButton.disabled = false;
        }

    }, 5000); // Must match CSS transition duration
}

/**
 * Initializes the game page.
 */
async function initialize() {
    spinButton.addEventListener('click', handleSpin);
    document.addEventListener('balanceUpdated', (event) => {
        currentBalance = event.detail;
        displayBalance();
    });

    try {
        currentBalance = await getBalance(true); // Force refresh on load
        displayBalance();
    } catch (error) {
        console.error("Could not fetch initial balance:", error);
        balanceDisplay.textContent = "Error";
    }
}

// --- Start the game ---
initialize();
