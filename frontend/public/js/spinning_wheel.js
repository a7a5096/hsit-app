// Spinning wheel logic script
document.addEventListener("DOMContentLoaded", () => {
    console.log("Spinning wheel page loaded.");
    displayUBTBalance();

    const spinButton = document.getElementById("spin-button");
    if (spinButton) {
        spinButton.addEventListener("click", handleSpin);
    }

    // Correct the Home link to point to the dashboard
    const homeLink = document.querySelector("header nav a[href='index.html']");
    if (homeLink) {
        homeLink.href = "dashboard.html";
    }
});

function displayUBTBalance() {
    const ubtBalanceElement = document.getElementById("ubt-balance");
    if (ubtBalanceElement) {
        try {
            const userDataString = localStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                if (userData && userData.balances && typeof userData.balances.ubt !== "undefined") {
                    ubtBalanceElement.textContent = userData.balances.ubt.toFixed(2);
                    console.log("UBT Balance displayed:", userData.balances.ubt.toFixed(2));
                } else {
                    ubtBalanceElement.textContent = "N/A";
                    console.warn("UBT balance not found in userData:", userData);
                }
            } else {
                ubtBalanceElement.textContent = "N/A";
                console.warn("User data not found in localStorage.");
            }
        } catch (error) {
            ubtBalanceElement.textContent = "Error";
            console.error("Error displaying UBT balance:", error);
        }
    }
}

function handleSpin() {
    console.log("Spin button clicked. Implement spin logic here.");
    // Placeholder for actual spin logic
    // 1. Get wager amount
    // 2. Validate wager against balance
    // 3. Call backend API to perform spin and get result
    // 4. Update UBT balance based on result
    // 5. Display result and new balance
    const resultMessage = document.getElementById("result-message");
    const winningsAmount = document.getElementById("winnings-amount");
    const newUbtBalance = document.getElementById("new-ubt-balance");

    if(resultMessage) resultMessage.textContent = "Spinning...";
    if(winningsAmount) winningsAmount.textContent = "0";
    if(newUbtBalance) newUbtBalance.textContent = "N/A";

    // Simulate a spin result after a delay
    setTimeout(() => {
        const mockWinnings = Math.floor(Math.random() * 50) - 10; // Win or lose some
        if(resultMessage) resultMessage.textContent = mockWinnings >= 0 ? `You won ${mockWinnings} UBT!` : `You lost ${Math.abs(mockWinnings)} UBT.`;
        if(winningsAmount) winningsAmount.textContent = mockWinnings.toString();
        
        // Update balance (this should ideally come from server response)
        const userDataString = localStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            if (userData && userData.balances && typeof userData.balances.ubt !== "undefined") {
                userData.balances.ubt += mockWinnings;
                localStorage.setItem("userData", JSON.stringify(userData)); // Update local storage
                displayUBTBalance(); // Refresh displayed balance
                if(newUbtBalance) newUbtBalance.textContent = userData.balances.ubt.toFixed(2);
            }
        }
    }, 2000);
}

