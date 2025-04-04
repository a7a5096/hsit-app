document.addEventListener('DOMContentLoaded', () => {
    const wheel = document.getElementById('luckyWheel');
    const spinButton = document.getElementById('spinButton');
    const wheelResult = document.getElementById('wheelResult');

    // Define the segments IN THE ORDER THEY APPEAR CLOCKWISE ON THE WHEEL
    const segments = [
        { label: "1 UBT", value: 1 },    // Segment 1 (e.g., 0-40 degrees)
        { label: "Sorry", value: 0 },    // Segment 2 (e.g., 40-80 degrees)
        { label: "20 USDT", value: 20 }, // Segment 3
        { label: "Sorry", value: 0 },    // Segment 4
        { label: "10 UBT", value: 10 }, // Segment 5
        { label: "Sorry", value: 0 },    // Segment 6
        { label: "Sorry", value: 0 },    // Segment 7
        { label: "Sorry", value: 0 },    // Segment 8
        { label: "Sorry", value: 0 }     // Segment 9
    ];

    const segmentCount = segments.length;
    const segmentAngle = 360 / segmentCount; // Angle per segment (40 degrees)
    let isSpinning = false;
    let currentRotation = 0; // Keep track of the wheel's rotation

    spinButton.addEventListener('click', () => {
        if (isSpinning) return; // Don't spin if already spinning

        isSpinning = true;
        spinButton.disabled = true;
        wheelResult.textContent = 'Spinning...';

        // Calculate random stop angle
        // Add multiple full rotations for visual effect (e.g., 3 to 7 rotations)
        const randomRotations = Math.floor(Math.random() * 5) + 3; // 3 to 7 full spins
        const randomStopOffset = Math.random() * 360; // Random position within the last spin
        const totalRotation = (randomRotations * 360) + randomStopOffset;

        // Calculate the final rotation relative to the initial state
        const finalRotation = (currentRotation + totalRotation) % 360;

        // Apply the rotation using CSS transition
        wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Smooth spin animation
        wheel.style.transform = `rotate(${currentRotation + totalRotation}deg)`;

        // Update current rotation for the next spin
        currentRotation += totalRotation;

        // Determine the winning segment after the animation ends
        setTimeout(() => {
            const actualStopAngle = finalRotation; // The angle where it actually stopped (0-359)

            // --- Determine Winning Segment ---
            // Adjust angle based on where the pointer is. Assuming pointer is at the top (0 degrees),
            // the middle of the first segment is used as its reference point.
            // We need to find which segment range the *opposite* angle (where the pointer points) falls into.
            // Example: If wheel stops at 10deg, pointer points at 350deg relative to wheel start.

            // Normalize the angle to determine the segment index based on the *pointer* position
            // Pointer is static at the top (0 deg). We need to see which segment lands there.
            // A segment's *center* angle determines its position.
            // Segment 1 center: segmentAngle / 2
            // Segment 2 center: segmentAngle * 1.5
            // ...
            // Segment N center: segmentAngle * (N - 0.5)

            // Find the segment whose range contains the effective stop angle (relative to pointer)
            // Effective angle calculation needs careful thought depending on setup.
            // Let's simplify: find the segment index based on the final angle, assuming segment 1 starts at 0 deg.
            // Adjust index based on pointer position (often pointer points slightly before 0 deg start of seg 1)
            // Let's assume the pointer points directly at the top border between last and first segment.

            const winningSegmentIndex = Math.floor( (360 - (actualStopAngle % 360)) / segmentAngle ) % segmentCount;


            const winningSegment = segments[winningSegmentIndex];

            wheelResult.textContent = `You won: ${winningSegment.label}!`;
            isSpinning = false;
            spinButton.disabled = false;

            // Optional: Reset transition if you want immediate rotation changes next time
             // wheel.style.transition = 'none';

        }, 4000); // Match the timeout to the CSS transition duration
    });

    // Optional: Position segments visually if not using a background image
    const segmentElements = wheel.querySelectorAll('.segment');
    segmentElements.forEach((seg, index) => {
        const angle = segmentAngle * index + (segmentAngle / 2); // Position text in middle of segment
        // Adjust positioning based on wheel size and desired text placement
        seg.style.transform = `rotate(${angle}deg) translate(0, -110px) rotate(-${angle}deg)`; // Example positioning
        // You might need more complex CSS or SVG/Canvas for perfect segment visuals
    });

});