// ... existing variables ...
let currentSize = 2; // Default size

// --- NEW: Size Picker Logic ---
const sizePicker = document.getElementById('size-picker');

sizePicker.addEventListener('click', (e) => {
    const option = e.target.closest('.size-option');
    if (option) {
        // Remove active class from others
        document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('active'));
        // Add to current
        option.classList.add('active');
        // Update variable
        currentSize = parseInt(option.dataset.size);
        statusBar.innerText = `Brush thickness set to: ${currentSize}px`;
    }
});

// --- UPDATED: Drawing Engine ---
canvas.addEventListener('mousedown', (e) => {
    saveHistory();

    drawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.fillStyle = (e.button === 2) ? bgColor : fgColor;

    // Use the currentSize variable instead of hardcoded numbers!
    ctx.lineWidth = currentSize; 
    ctx.lineCap = 'round';

    if (currentTool === 'fill') {
        const colorToUse = (e.button === 2) ? bgColor : fgColor;
        const rgbaArr = getRgbaFromHex(colorToUse);
        floodFill(startX, startY, rgbaArr);
        drawing = false; 
        return;
    }

    // Special logic: Eraser usually feels better if it's extra chunky
    if (currentTool === 'eraser') {
        ctx.lineWidth = currentSize * 3; 
    }

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }

    if (currentTool === 'stamp') {
        // You could even scale the stamp based on currentSize!
        ctx.font = `${currentSize * 4}px serif`; 
        ctx.fillText('🐱', startX - (currentSize * 2), startY + (currentSize * 1.5));
        drawing = false; 
    }
});