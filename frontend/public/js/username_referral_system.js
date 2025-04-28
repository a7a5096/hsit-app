/**
 * HSIT App - Combined Referral System Implementation
 * This script combines all referral system components into a single file for easy deployment
 */

// Self-executing function to avoid global namespace pollution
(function() {
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing username-based referral system...');
        
        // Only run on the My Team page
        if (window.location.href.includes('my_team.html')) {
            initReferralSystem();
        }
    });

    /**
     * Initialize the complete referral system
     */
    function initReferralSystem() {
        try {
            // Get the user's username
            const username = getUserIdentifier();
            
            if (!username) {
                console.error('Could not determine username');
                return;
            }
            
            console.log('User identified as:', username);
            
            // Update the invitation code section
            updateInvitationCodeSection(username);
            
            // Update the instructions text
            updateInstructionsText();
            
            // Add detailed referral instructions
            addReferralInstructions(username);
            
            console.log('Username-based referral system initialized successfully');
        } catch (error) {
            console.error('Error initializing referral system:', error);
        }
    }

    /**
     * Get the user's identifier (email or username)
     */
    function getUserIdentifier() {
        // Try to get email from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let userEmail = urlParams.get('email');
        
        // If not in URL, try localStorage
        if (!userEmail) {
            userEmail = localStorage.getItem('userEmail');
        }
        
        // If still not found, try other common storage locations
        if (!userEmail) {
            userEmail = sessionStorage.getItem('userEmail') || 
                       localStorage.getItem('username') || 
                       sessionStorage.getItem('username');
        }
        
        // Extract username from email if needed
        if (userEmail && userEmail.includes('@')) {
            // Use the part before @ as username
            return userEmail.split('@')[0];
        }
        
        return userEmail;
    }

    /**
     * Update the invitation code section to show username
     */
    function updateInvitationCodeSection(username) {
        // Find the invitation code container (the element showing "Loading...")
        const loadingElement = findElementByText('Loading...');
        
        if (!loadingElement) {
            console.error('Could not find invitation code container');
            return;
        }
        
        // Replace the loading text with the username
        loadingElement.textContent = username;
        loadingElement.style.backgroundColor = '#f0f8ff'; // Light blue background
        loadingElement.style.fontWeight = 'bold';
        loadingElement.style.padding = '10px';
        loadingElement.style.borderRadius = '4px';
        
        // Find the generate button
        const generateButton = findElementByText('Generate New Code', 'button');
        
        if (generateButton) {
            // Hide the generate button as it's no longer needed
            generateButton.style.display = 'none';
        }
        
        // Make sure there's a copy button
        ensureCopyButton(username, loadingElement);
    }

    /**
     * Update the instructions text
     */
    function updateInstructionsText() {
        // Find the instruction text
        const instructionElement = findElementContainingText('Share this code to invite');
        
        if (instructionElement) {
            instructionElement.innerHTML = '<strong>Your username is your referral code.</strong> Share your username with new members and ask them to enter it when they sign up. Bonuses for successful referrals are paid in UBT tokens.';
        }
    }

    /**
     * Add detailed referral instructions to the My Team page
     */
    function addReferralInstructions(username) {
        // Find the bonus rules section
        const bonusRulesElement = findElementContainingText('Bonus Rules');
        
        if (!bonusRulesElement) {
            console.error('Could not find bonus rules section');
            return;
        }
        
        // Create the instructions component
        const instructionsElement = createInstructionsElement(username);
        
        // Insert the instructions after the bonus rules
        const bonusRulesParent = bonusRulesElement.parentNode;
        const insertAfterElement = findLastBonusRuleItem(bonusRulesParent) || bonusRulesElement;
        
        insertAfterElement.parentNode.insertBefore(instructionsElement, insertAfterElement.nextSibling);
    }

    /**
     * Create the instructions element with detailed steps
     */
    function createInstructionsElement(username) {
        const container = document.createElement('div');
        container.style.marginTop = '20px';
        container.style.marginBottom = '20px';
        container.style.padding = '15px';
        container.style.backgroundColor = '#f9f9f9';
        container.style.border = '1px solid #e0e0e0';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        
        const title = document.createElement('h3');
        title.textContent = 'How to Share Your Referral Code';
        title.style.marginTop = '0';
        title.style.marginBottom = '10px';
        title.style.color = '#333';
        container.appendChild(title);
        
        const description = document.createElement('p');
        description.innerHTML = 'Your username <strong>' + username + '</strong> is your referral code. Share it with others using these steps:';
        description.style.marginBottom = '15px';
        container.appendChild(description);
        
        const steps = [
            'Tell new members to visit <strong>hsitapp.link</strong> and click "Sign Up"',
            'During signup, they should enter your username in the "Referral Code" field',
            'Once they purchase a bot, you\'ll receive your UBT bonus automatically',
            'Track your team members and earned bonuses in the table below'
        ];
        
        const stepsList = document.createElement('ol');
        stepsList.style.paddingLeft = '20px';
        stepsList.style.marginBottom = '15px';
        
        steps.forEach(step => {
            const listItem = document.createElement('li');
            listItem.innerHTML = step;
            listItem.style.marginBottom = '8px';
            stepsList.appendChild(listItem);
        });
        
        container.appendChild(stepsList);
        
        const tipBox = document.createElement('div');
        tipBox.style.backgroundColor = '#e8f5e9';
        tipBox.style.padding = '10px';
        tipBox.style.borderRadius = '4px';
        tipBox.style.marginTop = '10px';
        
        const tipTitle = document.createElement('strong');
        tipTitle.textContent = 'Pro Tip: ';
        tipBox.appendChild(tipTitle);
        
        const tipText = document.createTextNode('The more active members you refer, the more UBT you earn! Remember, you also get bonuses from your direct invites\' referrals.');
        tipBox.appendChild(tipText);
        
        container.appendChild(tipBox);
        
        return container;
    }

    /**
     * Ensure there's a copy button for the username
     */
    function ensureCopyButton(username, referenceElement) {
        // Check if copy button already exists
        let copyButton = findElementByText('Copy', 'button');
        
        if (!copyButton) {
            // Create a new copy button
            copyButton = document.createElement('button');
            copyButton.textContent = 'Copy';
            copyButton.style.marginLeft = '10px';
            copyButton.style.padding = '5px 10px';
            copyButton.style.backgroundColor = '#4CAF50';
            copyButton.style.color = 'white';
            copyButton.style.border = 'none';
            copyButton.style.borderRadius = '4px';
            copyButton.style.cursor = 'pointer';
            
            // Add the button next to the username
            referenceElement.parentNode.insertBefore(copyButton, referenceElement.nextSibling);
        }
        
        // Set up the copy functionality
        copyButton.onclick = function() {
            copyToClipboard(username);
            alert('Username copied to clipboard!');
        };
    }

    /**
     * Find the last bonus rule list item
     */
    function findLastBonusRuleItem(parentElement) {
        const listItems = parentElement.querySelectorAll('li');
        return listItems.length > 0 ? listItems[listItems.length - 1] : null;
    }

    /**
     * Helper function to find an element by its text content
     */
    function findElementByText(text, tag = null) {
        const elements = tag ? document.getElementsByTagName(tag) : document.querySelectorAll('*');
        
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].textContent.trim() === text) {
                return elements[i];
            }
        }
        
        return null;
    }

    /**
     * Helper function to find an element containing specific text
     */
    function findElementContainingText(text) {
        const elements = document.querySelectorAll('*');
        
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].textContent.includes(text)) {
                return elements[i];
            }
        }
        
        return null;
    }

    /**
     * Helper function to copy text to clipboard
     */
    function copyToClipboard(text) {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-1000px';
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    }
})();
