document.addEventListener("scroll", function() {
    const banner = document.querySelector(".banner");
    if (banner) {
        const scrollPosition = window.pageYOffset;
        // Adjust the factor (e.g., 0.5) to control the speed of the parallax effect
        const parallaxValue = scrollPosition * 0.3;
        banner.style.backgroundPosition = `center ${-parallaxValue}px`;
    }
});

