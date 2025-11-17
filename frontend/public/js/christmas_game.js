document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const selectedBetDisplay = document.getElementById('selectedBetDisplay');
    const playButton = document.getElementById('playButton');
    const giftsContainer = document.getElementById('giftsContainer');
    const gameError = document.getElementById('gameError');
    const betButtons = document.querySelectorAll('.bet-btn');
    
    // Modal elements
    const resultModal = document.getElementById('resultModal');
    const resultContent = document.getElementById('resultContent');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultAmount = document.getElementById('resultAmount');
    const resultBalance = document.getElementById('resultBalance');
    const resultCloseBtn = document.getElementById('resultCloseBtn');

    // Game state and configuration
    const token = localStorage.getItem('token');
    let currentUserUbtBalance = 0;
    let selectedBetAmount = 10;
    let isPlaying = false;
    let gameActive = false;

    // Prize structure matching the wheel (32 segments with same probabilities)
    const PRIZE_DISTRIBUTION = [
        { type: "bot", name: "A.I. BOT #5 (Value $3000)", icon: "🤖", count: 1 }, // 3.125%
        { type: "multiplier", multiplier: 10, name: "10x Win", icon: "💰", count: 4 }, // 12.5%
        { type: "multiplier", multiplier: 2, name: "2x Win", icon: "💵", count: 6 }, // 18.75%
        { type: "multiplier", multiplier: 1, name: "1x Win", icon: "💸", count: 8 }, // 25%
        { type: "multiplier", multiplier: 0, name: "Lose", icon: "🎄", count: 13 } // 40.625%
    ];

    // Gift box icons for unopened boxes
    const GIFT_ICONS = ['🎁', '🎀', '🎄', '⛄', '🔔', '⭐', '🎅', '🦌'];

    function showGameError(message) {
        if(gameError) {
            gameError.textContent = message;
            gameError.style.display = 'block';
            setTimeout(() => {
                gameError.style.display = 'none';
            }, 5000);
        }
    }
    
    function clearMessages() {
        if (gameError) gameError.style.display = 'none';
    }
    
    // Show result modal with prize-scaled animations
    function showResultModal(prize, winnings, newBalance) {
        // Determine prize icon and text
        let icon = '🎄';
        let title = 'Try Again!';
        let modalClass = '';
        
        if (prize.includes('BOT')) {
            icon = '🤖';
            title = 'GRAND PRIZE!';
            modalClass = 'grand-prize';
        } else if (prize.includes('10x')) {
            icon = '💰';
            title = 'JACKPOT!';
            modalClass = 'big-win';
        } else if (prize.includes('2x')) {
            icon = '💵';
            title = 'Nice Win!';
            modalClass = 'big-win';
        } else if (prize.includes('1x')) {
            icon = '💸';
            title = 'Break Even!';
            modalClass = '';
        } else {
            icon = '🎄';
            title = 'Better Luck Next Time!';
            modalClass = '';
        }
        
        // Set modal content
        resultIcon.textContent = icon;
        resultTitle.textContent = title;
        
        if (winnings > 0) {
            resultAmount.textContent = `+${winnings.toFixed(2)} UBT`;
            resultAmount.style.color = '#00ff88';
        } else {
            resultAmount.textContent = prize;
            resultAmount.style.color = '#ff4757';
        }
        
        resultBalance.textContent = `New Balance: ${newBalance.toFixed(2)} UBT`;
        
        // Reset and apply modal class
        resultContent.className = 'result-content';
        if (modalClass) {
            resultContent.classList.add(modalClass);
        }
        
        // Show modal
        resultModal.classList.add('show');
    }
    
    // Close modal handler
    resultCloseBtn.addEventListener('click', () => {
        resultModal.classList.remove('show');
    });
    
    // Close modal on background click
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            resultModal.classList.remove('show');
        }
    });

    // Bet amount selection
    betButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameActive) {
                showGameError('Please finish the current game before changing bet amount.');
                return;
            }
            betButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedBetAmount = parseInt(btn.dataset.bet);
            selectedBetDisplay.textContent = selectedBetAmount;
            clearMessages();
        });
    });

    // Generate 100 gift boxes
    function createGiftBoxes() {
        giftsContainer.innerHTML = '';
        for (let i = 0; i < 100; i++) {
            const giftBox = document.createElement('div');
            giftBox.className = 'gift-box';
            giftBox.dataset.index = i;
            
            const icon = document.createElement('div');
            icon.className = 'gift-icon';
            icon.textContent = GIFT_ICONS[i % GIFT_ICONS.length];
            
            const prizeReveal = document.createElement('div');
            prizeReveal.className = 'prize-reveal';
            
            giftBox.appendChild(icon);
            giftBox.appendChild(prizeReveal);
            
            giftBox.addEventListener('click', () => handleGiftClick(giftBox));
            
            giftsContainer.appendChild(giftBox);
        }
    }

    // Fetch user balance
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
            showGameError('Error loading your UBT balance. Please try again later.');
        }
    }

    // Start game button handler
    playButton.addEventListener('click', async () => {
        if (gameActive) {
            showGameError('Game already in progress!');
            return;
        }

        clearMessages();

        if (currentUserUbtBalance < selectedBetAmount) {
            showGameError(`Not enough UBT. You need ${selectedBetAmount} UBT to play.`);
            return;
        }

        gameActive = true;
        playButton.disabled = true;
        playButton.textContent = '🎮 Game Active - Pick a Gift! 🎮';
        
        // Enable all gift boxes
        const allGifts = document.querySelectorAll('.gift-box');
        allGifts.forEach(gift => {
            gift.classList.remove('disabled', 'revealed');
            const icon = gift.querySelector('.gift-icon');
            const reveal = gift.querySelector('.prize-reveal');
            if (icon) icon.style.display = 'block';
            if (reveal) reveal.style.display = 'none';
        });
    });

    // Handle gift box click
    async function handleGiftClick(giftBox) {
        if (!gameActive || isPlaying || giftBox.classList.contains('disabled')) {
            return;
        }

        isPlaying = true;
        
        // Disable all other boxes
        const allGifts = document.querySelectorAll('.gift-box');
        allGifts.forEach(gift => {
            if (gift !== giftBox) {
                gift.classList.add('disabled');
            }
        });

        // Add flip animation
        giftBox.classList.add('flipping');

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            
            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-auth-token': token 
                },
                body: JSON.stringify({
                    betAmount: selectedBetAmount
                })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Game request failed.");

            // Wait for flip animation to complete
            setTimeout(() => {
                giftBox.classList.remove('flipping');
                
                // Determine prize icon based on result
                let prizeIcon = '🎄';
                let prizeText = result.prize;
                
                if (result.prize.includes('BOT')) {
                    prizeIcon = '🤖';
                    prizeText = 'A.I. BOT!';
                } else if (result.prize.includes('10x')) {
                    prizeIcon = '💰';
                    prizeText = '10x WIN!';
                } else if (result.prize.includes('2x')) {
                    prizeIcon = '💵';
                    prizeText = '2x WIN!';
                } else if (result.prize.includes('1x')) {
                    prizeIcon = '💸';
                    prizeText = '1x WIN!';
                } else {
                    prizeIcon = '🎄';
                    prizeText = 'Try Again!';
                }

                // Reveal the prize
                const prizeReveal = giftBox.querySelector('.prize-reveal');
                if (prizeReveal) {
                    prizeReveal.innerHTML = `<div style="font-size: 2.5rem;">${prizeIcon}</div><div style="font-size: 0.9rem; margin-top: 5px;">${prizeText}</div>`;
                }
                giftBox.classList.add('revealed');

                // Update balance display
                if (result.success && typeof result.newBalance === 'number') {
                    if (ubtBalanceDisplay) {
                        ubtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                        currentUserUbtBalance = result.newBalance;
                    }
                    
                    // Show modal with result
                    showResultModal(result.prize, result.creditsAdded || 0, result.newBalance);
                    
                    // Celebratory effect for wins
                    if (result.creditsAdded > 0) {
                        createConfetti();
                        playWinSound();
                    }
                } else {
                    showGameError(result.message);
                }

                // Reset game state
                gameActive = false;
                isPlaying = false;
                playButton.disabled = false;
                playButton.textContent = '🎁 Start New Game 🎁';

            }, 600); // Match flip animation duration

        } catch (error) {
            console.error('Game error:', error);
            showGameError(error.message || 'An error occurred.');
            giftBox.classList.remove('flipping');
            gameActive = false;
            isPlaying = false;
            playButton.disabled = false;
            playButton.textContent = '🎁 Start Game 🎁';
            
            // Re-enable all boxes
            allGifts.forEach(gift => gift.classList.remove('disabled'));
        }
    }

    // Create confetti effect for wins
    function createConfetti() {
        const colors = ['#ffd700', '#ff0000', '#00ff00', '#00ff88', '#ff69b4', '#87ceeb'];
        const symbols = ['❄', '⭐', '🎄', '🎁', '🔔', '✨'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.fontSize = '20px';
                confetti.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-20px';
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '9999';
                confetti.style.opacity = '1';
                confetti.style.transition = 'all 3s ease-out';
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.style.top = window.innerHeight + 'px';
                    confetti.style.opacity = '0';
                    confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
                }, 50);
                
                setTimeout(() => {
                    confetti.remove();
                }, 3100);
            }, i * 30);
        }
    }

    // Play win sound (simple beep using Web Audio API)
    function playWinSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    // Initialize the page
    function initialize() {
        createGiftBoxes();
        fetchUserUbtBalance();
    }

    initialize();
});
