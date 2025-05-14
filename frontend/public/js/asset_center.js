document.addEventListener("DOMContentLoaded", () => {
    console.log("Asset Center page loaded.");
    displayUserBalances();
    // Placeholder for other Asset Center functionalities like displaying purchased bots
});

function displayUserBalances() {
    const balancesListElement = document.querySelector(".balances-list");
    const totalValueElement = document.querySelector(".total-value"); // For estimated total value

    if (!balancesListElement) {
        console.error("Balances list element not found.");
        return;
    }

    balancesListElement.innerHTML = ''; // Clear any existing content

    try {
        const userDataString = localStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            console.log("User data from localStorage:", userData);

            if (userData && userData.balances) {
                let estimatedTotalUSD = 0;

                // Display UBT balance
                if (typeof userData.balances.ubt !== "undefined") {
                    const ubtBalance = parseFloat(userData.balances.ubt);
                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <div class="balance-item">
                            <span class="currency-name">UBT (Utility Balance Token)</span>
                            <span class="currency-amount">${ubtBalance.toFixed(2)} UBT</span>
                        </div>
                    `;
                    balancesListElement.appendChild(listItem);
                    console.log("UBT Balance displayed:", ubtBalance.toFixed(2));
                    // Assuming 1 UBT = $1 for simplicity in total estimation, adjust if there's a conversion rate
                    estimatedTotalUSD += ubtBalance; 
                } else {
                    console.warn("UBT balance not found in userData.balances");
                     const listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <div class="balance-item">
                            <span class="currency-name">UBT (Utility Balance Token)</span>
                            <span class="currency-amount">N/A</span>
                        </div>
                    `;
                    balancesListElement.appendChild(listItem);
                }
                
                // Add other currency balances here if they exist in userData.balances
                // Example for BTC (if it were present):
                // if (typeof userData.balances.btc !== "undefined") {
                //     const btcBalance = parseFloat(userData.balances.btc);
                //     // Assume you have a function to get BTC to USD rate
                //     // const btcToUsdRate = await getCryptoRate("BTC"); 
                //     // estimatedTotalUSD += btcBalance * btcToUsdRate;
                //     const listItem = document.createElement("li");
                //     listItem.innerHTML = `
                //         <div class="balance-item">
                //             <span class="currency-name">Bitcoin (BTC)</span>
                //             <span class="currency-amount">${btcBalance.toFixed(8)} BTC</span>
                //         </div>
                //     `;
                //     balancesListElement.appendChild(listItem);
                // }

                if (totalValueElement) {
                    totalValueElement.innerHTML = `$ ${estimatedTotalUSD.toFixed(2)} <span class="currency-note">USD</span>`;
                }

            } else {
                console.warn("Balances object not found in userData:", userData);
                balancesListElement.innerHTML = "<li>No balance data available.</li>";
            }
        } else {
            console.warn("User data not found in localStorage.");
            balancesListElement.innerHTML = "<li>Please log in to see your balances.</li>";
            if (totalValueElement) {
                 totalValueElement.innerHTML = `$ 0.00 <span class="currency-note">USD</span>`;
            }
        }
    } catch (error) {
        console.error("Error displaying user balances:", error);
        balancesListElement.innerHTML = "<li>Error loading balances.</li>";
    }
}

// Placeholder for fetching purchased bots - to be implemented if needed
function displayPurchasedBots() {
    const botsContainer = document.querySelector(".purchased-bots-container");
    // Logic to fetch and display bots
}

