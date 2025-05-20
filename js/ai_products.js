// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';


// Script to handle AI products functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Get user data
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Bot definitions
  const bots = [
    {
      id: 1,
      name: "Starter Bot",
      cost: 100,
      lockPeriod: 2,
      dailyPayment: 10,
      bonuses: [],
      principalReturn: true,
      description: "Our entry-level AI trading bot is perfect for new users looking to experience the benefits of automated trading with minimal commitment."
    },
    {
      id: 2,
      name: "Standard Bot",
      cost: 500,
      lockPeriod: 14,
      dailyPayment: 10,
      bonuses: [],
      principalReturn: true,
      description: "Our standard AI trading bot offers a balanced approach to automated trading with a moderate lock-in period and guaranteed principal return."
    },
    {
      id: 3,
      name: "Premium Bot",
      cost: 3000,
      lockPeriod: 30,
      dailyPayment: 10,
      bonuses: [
        { day: 3, amount: 300 }
      ],
      principalReturn: true,
      description: "Our premium AI trading bot is designed for serious investors looking for consistent returns with an early bonus payment."
    },
    {
      id: 4,
      name: "Advanced Bot",
      cost: 10000,
      lockPeriod: 100,
      dailyPayment: 15,
      bonuses: [
        { day: 3, amount: 500 },
        { day: 33, amount: 500 },
        { day: 63, amount: 500 }
      ],
      principalReturn: true,
      description: "Our advanced AI trading bot offers higher daily returns and multiple bonus payments throughout the lock-in period."
    },
    {
      id: 5,
      name: "Elite Bot",
      cost: 100000,
      lockPeriod: 300,
      dailyPayment: 100,
      bonuses: Array.from({ length: 10 }, (_, i) => ({ day: (i + 1) * 30, amount: 1000 })),
      principalReturn: true,
      vipBenefits: true,
      description: "Our elite AI trading bot is our premium offering for high-net-worth investors seeking substantial returns with VIP benefits."
    }
  ];
  
  // Elements
  const buyButtons = document.querySelectorAll('.btn-buy');
  const purchaseModal = document.getElementById('purchaseModal');
  const purchaseDetails = document.getElementById('purchaseDetails');
  const confirmPurchaseBtn = document.getElementById('confirmPurchase');
  const cancelPurchaseBtn = document.getElementById('cancelPurchase');
  
  // Add event listeners to buy buttons
  buyButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const botId = parseInt(this.getAttribute('data-bot-id'));
      const bot = bots.find(b => b.id === botId);
      
      if (!bot) {
        showMessage('Bot not found', 'error');
        return;
      }
      
      // Show purchase modal
      showPurchaseModal(bot);
    });
  });
  
  // Show purchase modal
  function showPurchaseModal(bot) {
    if (!purchaseModal || !purchaseDetails) return;
    
    // Calculate total return
    const dailyReturns = bot.dailyPayment * bot.lockPeriod;
    const bonusReturns = bot.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
    const principalReturn = bot.principalReturn ? bot.cost : 0;
    const totalReturn = dailyReturns + bonusReturns + principalReturn;
    
    // Create details HTML
    purchaseDetails.innerHTML = `
      <div class="purchase-summary">
        <h3>${bot.name}</h3>
        <p>${bot.description}</p>
        
        <div class="purchase-details">
          <div class="detail-row">
            <span class="detail-label">Cost:</span>
            <span class="detail-value">${bot.cost} UBT</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lock-in Period:</span>
            <span class="detail-value">${bot.lockPeriod} days</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Daily Payment:</span>
            <span class="detail-value">${bot.dailyPayment} UBT</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Daily Payments:</span>
            <span class="detail-value">${dailyReturns} UBT</span>
          </div>
          ${bot.bonuses.length > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Bonus Payments:</span>
            <span class="detail-value">${bonusReturns} UBT</span>
          </div>
          ` : ''}
          ${bot.principalReturn ? `
          <div class="detail-row">
            <span class="detail-label">Principal Return:</span>
            <span class="detail-value">${bot.cost} UBT</span>
          </div>
          ` : ''}
          <div class="detail-row total-row">
            <span class="detail-label">Total Return:</span>
            <span class="detail-value">${totalReturn} UBT</span>
          </div>
          <div class="detail-row profit-row">
            <span class="detail-label">Total Profit:</span>
            <span class="detail-value">${totalReturn - bot.cost} UBT</span>
          </div>
        </div>
        
        <div class="balance-check">
          <p>Your current UBT balance: <strong>${userData.balances?.ubt || 0} UBT</strong></p>
          ${(userData.balances?.ubt || 0) < bot.cost ? 
            `<p class="balance-warning">You don't have enough UBT to purchase this bot. Please deposit more UBT or exchange other crypto for UBT.</p>` : 
            `<p class="balance-sufficient">You have sufficient UBT to purchase this bot.</p>`
          }
        </div>
      </div>
    `;
    
    // Show modal
    purchaseModal.style.display = 'flex';
    
    // Update confirm button state
    confirmPurchaseBtn.disabled = (userData.balances?.ubt || 0) < bot.cost;
    
    // Store bot ID for purchase
    confirmPurchaseBtn.setAttribute('data-bot-id', bot.id);
  }
  
  // Handle purchase confirmation
  confirmPurchaseBtn.addEventListener('click', async function() {
    const botId = parseInt(this.getAttribute('data-bot-id'));
    const bot = bots.find(b => b.id === botId);
    
    if (!bot) {
      showMessage('Bot not found', 'error');
      return;
    }
    
    try {
      // Make purchase API call
      const response = await fetch(`${API_URL}/api/bots/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ botId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Purchase failed');
      }
      
      // Update user data
      if (userData.balances) {
        userData.balances.ubt = (userData.balances.ubt || 0) - bot.cost;
      }
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Show success message
      showMessage(`Successfully purchased ${bot.name}!`, 'success');
      
      // Close modal
      purchaseModal.style.display = 'none';
      
      // If this is the starter bot linked to dashboard promotion, update dashboard
      if (botId === 1) {
        localStorage.setItem('promotionClaimed', 'true');
      }
      
      // If this is the elite bot, show VIP message
      if (botId === 5) {
        showVIPMessage();
      }
    } catch (error) {
      console.error('Error purchasing bot:', error);
      showMessage(error.message, 'error');
    }
  });
  
  // Handle purchase cancellation
  cancelPurchaseBtn.addEventListener('click', function() {
    purchaseModal.style.display = 'none';
  });
  
  // Show VIP message for elite bot
  function showVIPMessage() {
    const vipModal = document.createElement('div');
    vipModal.className = 'modal';
    vipModal.innerHTML = `
      <div class="modal-content vip-modal">
        <h2>Welcome to VIP Status!</h2>
        <p>Congratulations on purchasing the Elite Bot! You have been assigned a dedicated VIP investment advisor who will ensure you receive the best possible service.</p>
        <p>Your advisor will contact you shortly to introduce themselves and provide you with their direct contact information.</p>
        <p>As a VIP member, you will receive:</p>
        <ul>
          <li>Priority exchange service for UBT to USDT at preferential rates</li>
          <li>Personalized investment advice</li>
          <li>Early access to new bot releases</li>
          <li>Expedited withdrawal processing</li>
        </ul>
        <button class="btn btn-primary" id="closeVipModal">Continue</button>
      </div>
    `;
    
    document.body.appendChild(vipModal);
    
    const closeBtn = document.getElementById('closeVipModal');
    closeBtn.addEventListener('click', function() {
      vipModal.remove();
    });
    
    vipModal.style.display = 'flex';
  }
  
  // Link starter bot to dashboard promotion
  function linkStarterBotToDashboardPromotion() {
    // This function would be called when the page loads
    // It would check if the user came from the dashboard promotion
    const urlParams = new URLSearchParams(window.location.search);
    const fromPromotion = urlParams.get('from') === 'dashboard-promotion';
    
    if (fromPromotion) {
      // Automatically scroll to and highlight the starter bot
      const starterBotCard = document.querySelector('[data-bot-id="1"]').closest('.product-card');
      if (starterBotCard) {
        starterBotCard.scrollIntoView({ behavior: 'smooth' });
        starterBotCard.classList.add('highlighted-card');
        
        // Remove highlight after a few seconds
        setTimeout(() => {
          starterBotCard.classList.remove('highlighted-card');
        }, 3000);
      }
    }
  }
  
  // Initialize
  linkStarterBotToDashboardPromotion();
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
