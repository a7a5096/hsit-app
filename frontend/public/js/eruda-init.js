// Ensure eruda is initialized on all pages
document.addEventListener('DOMContentLoaded', function() {
    // Initialize eruda for debugging if it exists and isn't already initialized
    if (typeof eruda !== 'undefined') {
        try {
            eruda.init();
            console.log("Eruda initialized successfully");
        } catch (erudaError) {
            console.warn("Failed to initialize eruda:", erudaError);
        }
    } else {
        console.log("Eruda not available, loading it dynamically");
        // Dynamically load eruda if not available
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = function() {
            if (typeof eruda !== 'undefined') {
                eruda.init();
                console.log("Eruda loaded and initialized successfully");
            }
        };
        document.head.appendChild(script);
    }
});
