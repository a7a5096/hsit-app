document.addEventListener("DOMContentLoaded", () => {
    console.log("AI Products page loaded.");
    displayUserUBTBalance();
    initializePurchaseModals();
});

function displayUserUBTBalance() {
    // Attempt to find an existing balance display or create one if necessary.
    // For now, let's assume there's an element with id="user-ubt-balance" in ai_products.html
    // If not, this part will need adjustment in the HTML or here.
    let ubtBalanceElement = document.getElementById("user-ubt-balance");

    // If the element doesn't exist, create and prepend it to the main content area for visibility.
    if (!ubtBalanceElement) {
        const mainElement = document.querySelector(".products-main");
        if (mainElement) {
            const balanceContainer = document.createElement("div");
            balanceContainer.className = "user-balance-container card-style"; // Apply some styling
            balanceContainer.style.textAlign = "center";
            balanceContainer.style.padding = "10px";
            balanceContainer.style.marginBottom = "20px";
            balanceContainer.innerHTML = "Your UBT Balance: <span id=\"user-ubt-balance\">Loading...</span>";
            mainElement.prepend(balanceContainer);
            ubtBalanceElement = document.getElementById("user-ubt-balance");
        }
    }

    if (ubtBalanceElement) {
        try {
            const userDataString = localStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                if (userData && userData.balances && typeof userData.balances.ubt !== "undefined") {
                    ubtBalanceElement.textContent = userData.balances.ubt.toFixed(2) + " UBT";
                    console.log("UBT Balance displayed on AI Products page:", userData.balances.ubt.toFixed(2));
                } else {
                    ubtBalanceElement.textContent = "N/A";
                    console.warn("UBT balance not found in userData on AI Products page.");
                }
            } else {
                ubtBalanceElement.textContent = "N/A";
                console.warn("User data not found in localStorage on AI Products page.");
            }
        } catch (error) {
            ubtBalanceElement.textContent = "Error";
            console.error("Error displaying UBT balance on AI Products page:", error);
        }
    }
}

function initializePurchaseModals() {
    const buyButtons = document.querySelectorAll(".btn-buy");
    const modal = document.getElementById("purchaseModal");
    const purchaseDetails = document.getElementById("purchaseDetails");
    const confirmPurchaseButton = document.getElementById("confirmPurchase");
    const cancelPurchaseButton = document.getElementById("cancelPurchase");
    let currentBotId = null;

    if (!modal || !purchaseDetails || !confirmPurchaseButton || !cancelPurchaseButton) {
        console.error("Modal elements not found. Purchase functionality will be affected.");
        return;
    }

    buyButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            currentBotId = button.getAttribute("data-bot-id");
            const productCard = button.closest(".product-card");
            const botName = productCard.querySelector(".product-logo").innerText.replace("\n", " ");
            const botCostText = button.innerText.match(/\(([^)]+)\)/)[1]; // Extracts "100 UBT" from "Buy Now (100 UBT)"
            
            purchaseDetails.innerHTML = `<p>You are about to purchase:</p>
                                       <p><strong>${botName}</strong></p>
                                       <p>Cost: <strong>${botCostText}</strong></p>
                                       <p>Are you sure you want to proceed?</p>`;
            modal.style.display = "block";
        });
    });

    cancelPurchaseButton.addEventListener("click", () => {
        modal.style.display = "none";
        currentBotId = null;
    });

    confirmPurchaseButton.addEventListener("click", async () => {
        if (!currentBotId) return;

        console.log(`Attempting to purchase bot ID: ${currentBotId}`);
        // Placeholder for actual purchase logic (API call)
        // This would involve: 
        // 1. Getting the token: const token = localStorage.getItem("token");
        // 2. Making a fetch POST request to a backend endpoint like `${API_URL}/api/bots/purchase`
        //    with { botId: currentBotId } in the body and the token in headers.
        // 3. Handling the response (success/failure), updating user balance, etc.

        // Simulate API call
        showTemporaryMessage("Processing purchase...", "info", modal);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        // --- MOCK RESPONSE --- 
        // This part should be replaced with actual API call and response handling
        const mockSuccess = Math.random() > 0.3; // Simulate success/failure
        const userDataString = localStorage.getItem("userData");
        let newBalance = null;
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            const botCostText = purchaseDetails.querySelector("strong:nth-of-type(2)").textContent;
            const botCost = parseFloat(botCostText.replace(" UBT", ""));
            if (userData.balances.ubt >= botCost && mockSuccess) {
                userData.balances.ubt -= botCost;
                newBalance = userData.balances.ubt;
                localStorage.setItem("userData", JSON.stringify(userData));
                displayUserUBTBalance(); // Refresh balance display on page
                 showTemporaryMessage("Purchase successful! Your new balance is " + newBalance.toFixed(2) + " UBT.", "success", modal);
            } else if (!mockSuccess) {
                showTemporaryMessage("Purchase failed. Server error. Please try again.", "error", modal);
            } else {
                showTemporaryMessage("Purchase failed. Insufficient UBT balance.", "error", modal);
            }
        } else {
            showTemporaryMessage("Purchase failed. User data not found.", "error", modal);
        }
        // --- END MOCK RESPONSE ---
        
        // Hide modal after a delay to show message
        setTimeout(() => {
            modal.style.display = "none";
            currentBotId = null;
        }, 3000);
    });

    // Close modal if clicked outside of it
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
            currentBotId = null;
        }
    });
}

function showTemporaryMessage(message, type, modalElement) {
    let messageDiv = modalElement.querySelector(".temp-message");
    if (!messageDiv) {
        messageDiv = document.createElement("div");
        messageDiv.className = "temp-message";
        messageDiv.style.padding = "10px";
        messageDiv.style.marginTop = "10px";
        messageDiv.style.borderRadius = "4px";
        messageDiv.style.textAlign = "center";
        // Insert it before the buttons
        const buttonGroup = modalElement.querySelector(".button-group");
        modalElement.querySelector(".modal-content").insertBefore(messageDiv, buttonGroup);
    }
    messageDiv.textContent = message;
    messageDiv.style.backgroundColor = type === "success" ? "#4CAF50" : type === "error" ? "#F44336" : "#2196F3";
    messageDiv.style.color = "white";
    messageDiv.style.display = "block";

    // Optional: auto-hide after a few seconds if modal isn't closing itself
    // setTimeout(() => { messageDiv.style.display = "none"; }, 3000);
}

