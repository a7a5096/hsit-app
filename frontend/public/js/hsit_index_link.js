/**
 * HSIT App - Dashboard Link Addition
 * This script adds a link to the Hang Seng Information Technology Index under a new "HSIT Private Internet Income Company" section
 */

// Self-executing function to avoid global namespace pollution
(function() {
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing HSIT Index link addition...');
        addHSITIndexLink();
    });

    /**
     * Add HSIT Index link to the dashboard
     */
    function addHSITIndexLink() {
        try {
            // Find the Service section
            const serviceSection = document.querySelector('h2:contains("Service")') || 
                                  document.querySelector('h2.service') ||
                                  document.querySelector('.service h2');
            
            if (!serviceSection) {
                console.error('Could not find Service section');
                // If Service section not found, try to find Common Operations section
                const commonOpsSection = document.querySelector('h2:contains("Common Operations")') ||
                                        document.querySelector('h2.common-operations') ||
                                        document.querySelector('.common-operations h2');
                
                if (commonOpsSection) {
                    // Add after Common Operations section
                    addHSITSectionAfterElement(commonOpsSection.parentNode);
                } else {
                    // Last resort: Add to the end of the main content
                    const mainContent = document.querySelector('main') || document.body;
                    addHSITSectionToElement(mainContent);
                }
            } else {
                // Add before Service section
                addHSITSectionBeforeElement(serviceSection.parentNode);
            }
            
            console.log('HSIT Index link added successfully');
        } catch (error) {
            console.error('Error adding HSIT Index link:', error);
        }
    }

    /**
     * Add HSIT section before the specified element
     */
    function addHSITSectionBeforeElement(element) {
        const hsitSection = createHSITSection();
        element.parentNode.insertBefore(hsitSection, element);
    }

    /**
     * Add HSIT section after the specified element
     */
    function addHSITSectionAfterElement(element) {
        const hsitSection = createHSITSection();
        element.parentNode.insertBefore(hsitSection, element.nextSibling);
    }

    /**
     * Add HSIT section to the specified element
     */
    function addHSITSectionToElement(element) {
        const hsitSection = createHSITSection();
        element.appendChild(hsitSection);
    }

    /**
     * Create the HSIT section with the index link
     */
    function createHSITSection() {
        // Create section container
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'hsit-private-section';
        sectionContainer.style.marginTop = '20px';
        sectionContainer.style.marginBottom = '20px';
        
        // Match the styling of other sections
        const existingSection = document.querySelector('.service') || document.querySelector('section');
        if (existingSection) {
            sectionContainer.style.backgroundColor = getComputedStyle(existingSection).backgroundColor;
            sectionContainer.style.padding = getComputedStyle(existingSection).padding;
            sectionContainer.style.borderRadius = getComputedStyle(existingSection).borderRadius;
        } else {
            // Default styling if no existing section is found
            sectionContainer.style.backgroundColor = '#1e1e2d';
            sectionContainer.style.padding = '20px';
            sectionContainer.style.borderRadius = '5px';
        }
        
        // Create section header
        const sectionHeader = document.createElement('h2');
        sectionHeader.textContent = 'HSIT Private Internet Income Company';
        sectionHeader.style.color = '#ffffff';
        sectionHeader.style.marginTop = '0';
        sectionHeader.style.marginBottom = '15px';
        sectionHeader.style.fontSize = '1.5rem';
        
        // Create link container
        const linkContainer = document.createElement('div');
        linkContainer.style.display = 'flex';
        linkContainer.style.flexWrap = 'wrap';
        linkContainer.style.gap = '10px';
        
        // Create index link
        const indexLink = createIndexLink();
        
        // Assemble the section
        linkContainer.appendChild(indexLink);
        sectionContainer.appendChild(sectionHeader);
        sectionContainer.appendChild(linkContainer);
        
        return sectionContainer;
    }

    /**
     * Create the index link element
     */
    function createIndexLink() {
        // Create link container
        const linkElement = document.createElement('a');
        linkElement.href = 'https://ca.investing.com/indices/hs-information-technology';
        linkElement.target = '_blank'; // Open in new tab
        linkElement.rel = 'noopener noreferrer'; // Security best practice
        
        // Style the link to match other dashboard links
        const existingLink = document.querySelector('.common-operations a') || document.querySelector('a.btn');
        if (existingLink) {
            // Copy styling from existing links
            const existingStyles = getComputedStyle(existingLink);
            linkElement.style.display = existingStyles.display;
            linkElement.style.padding = existingStyles.padding;
            linkElement.style.backgroundColor = existingStyles.backgroundColor;
            linkElement.style.color = existingStyles.color;
            linkElement.style.textDecoration = 'none';
            linkElement.style.borderRadius = existingStyles.borderRadius;
            linkElement.style.textAlign = 'center';
            linkElement.style.minWidth = '120px';
        } else {
            // Default styling if no existing link is found
            linkElement.style.display = 'flex';
            linkElement.style.flexDirection = 'column';
            linkElement.style.alignItems = 'center';
            linkElement.style.justifyContent = 'center';
            linkElement.style.padding = '15px';
            linkElement.style.backgroundColor = '#2d2d42';
            linkElement.style.color = '#ffffff';
            linkElement.style.textDecoration = 'none';
            linkElement.style.borderRadius = '5px';
            linkElement.style.textAlign = 'center';
            linkElement.style.minWidth = '120px';
        }
        
        // Create icon
        const icon = document.createElement('img');
        icon.src = 'https://static.investing.com/favicon.ico'; // Investing.com favicon
        icon.alt = 'HSIT Index';
        icon.style.width = '32px';
        icon.style.height = '32px';
        icon.style.marginBottom = '8px';
        
        // Create text
        const text = document.createElement('span');
        text.textContent = 'HSIT Index';
        
        // Assemble the link
        linkElement.appendChild(icon);
        linkElement.appendChild(text);
        
        // Add hover effect
        linkElement.onmouseover = function() {
            this.style.backgroundColor = '#3e3e5a';
        };
        linkElement.onmouseout = function() {
            if (existingLink) {
                this.style.backgroundColor = getComputedStyle(existingLink).backgroundColor;
            } else {
                this.style.backgroundColor = '#2d2d42';
            }
        };
        
        return linkElement;
    }

    /**
     * Helper function to find an element containing specific text
     */
    Document.prototype.querySelector = function(selector) {
        if (selector.includes(':contains')) {
            const parts = selector.split(':contains');
            const tag = parts[0];
            const text = parts[1].replace(/['"()]/g, '');
            
            const elements = this.querySelectorAll(tag || '*');
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].textContent.includes(text)) {
                    return elements[i];
                }
            }
            return null;
        } else {
            return Document.prototype.querySelector.call(this, selector);
        }
    };
})();
