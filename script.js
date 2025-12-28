const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const palette = document.getElementById('palette');
const fgPreview = document.getElementById('fg-color-preview');
const bgPreview = document.getElementById('bg-color-preview');
const statusBar = document.getElementById('status-bar');

let drawing = false;
let currentTool = 'pencil';
let fgColor = '#000000';
let bgColor = '#ffffff';
let startX, startY, snapshot;

// --- UNDO SYSTEM ---
let undoStack = [];
const maxHistory = 20;

function saveHistory() {
    if (undoStack.length >= maxHistory) {
        undoStack.shift();
    }
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function undo() {
    if (undoStack.length > 0) {
        let previousState = undoStack.pop();
        ctx.putImageData(previousState, 0, 0);
        statusBar.innerText = "Undo successful! 🐾";
    } else {
        statusBar.innerText = "Nothing left to undo, meow!";
    }
}

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

// --- FLOOD FILL LOGIC ---
function hexToRgba(hex) {
    // Converts #ffffff to [255, 255, 255, 255]
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
}

function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Get the color of the pixel we clicked on
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // If we're clicking on the same color as the fill color, stop (avoid infinite loop)
    if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2] && startA === fillColor[3]) {
        return;
    }

    // Stack-based fill algorithm
    const pixelStack = [[startX, startY]];

    while (pixelStack.length > 0) {
        const [x, y] = pixelStack.pop();
        const currentPos = (y * width + x) * 4;

        // Check if current pixel matches start color
        if (data[currentPos] === startR &&
            data[currentPos + 1] === startG &&
            data[currentPos + 2] === startB &&
            data[currentPos + 3] === startA) {

            // Color the pixel
            data[currentPos] = fillColor[0];
            data[currentPos + 1] = fillColor[1];
            data[currentPos + 2] = fillColor[2];
            data[currentPos + 3] = fillColor[3];

            // Add neighbors to stack (checking boundaries)
            if (x > 0) pixelStack.push([x - 1, y]);
            if (x < width - 1) pixelStack.push([x + 1, y]);
            if (y > 0) pixelStack.push([x, y - 1]);
            if (y < height - 1) pixelStack.push([x, y + 1]);
        }
    }
    // Put the modified data back on the canvas
    ctx.putImageData(imageData, 0, 0);
}

// 1. Cat Palette Generation
const catColors = [
    '#000000','#8c7b75','#ff8a80','#ffd180','#a5d6a7','#80deea','#9fa8da','#ce93d8','#f48fb1','#ffffff',
    '#ffcdd2','#f8bbd0','#e1bee7','#d1c4e9','#c5cae9','#bbdefb','#b3e5fc','#b2ebf2','#b2dfdb','#c8e6c9',
    '#dcedc8','#f0f4c3','#fff9c4','#ffecb3','#ffe0b2','#ffccbc','#d7ccc8','#f5f5f5'
];

catColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            fgColor = color;
            fgPreview.style.backgroundColor = color;
        } else {
            bgColor = color;
            bgPreview.style.backgroundColor = color;
        }
    });
    palette.appendChild(swatch);
});

// 2. Tool Logic
toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool');
    if (btn) {
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
        statusBar.innerText = `Selected Tool: ${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}`;
    }
});

// 3. Menu Dropdown Toggling
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const isActive = item.classList.contains('active');
        closeAllMenus();
        if (!isActive) item.classList.add('active');
        e.stopPropagation();
    });
});

window.addEventListener('click', () => closeAllMenus());

function closeAllMenus() {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
}

// 4. Menu Actions Logic
document.getElementById('btn-new').addEventListener('click', () => {
    if(confirm("Purr-ge the canvas?")) {
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusBar.innerText = "Canvas cleared!";
    }
});

document.getElementById('btn-save').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-cat-art.png';
    link.href = canvas.toDataURL();
    link.click();
    statusBar.innerText = "Masterpiece saved!";
});

document.getElementById('btn-undo').addEventListener('click', () => {
    undo();
});

document.getElementById('btn-meow').addEventListener('click', () => {
    alert("MEOW! 🐾");
});

document.getElementById('btn-random-cat').addEventListener('click', () => {
    saveHistory();
    const cats = ['🐱', '🐈', '😸', '😹', '😻', '😼', '😽', '😾', '😿', '🙀'];
    const randomCat = cats[Math.floor(Math.random() * cats.length)];
    const x = Math.random() * (canvas.width - 60);
    const y = 40 + Math.random() * (canvas.height - 60);
    ctx.font = '50px serif';
    ctx.fillText(randomCat, x, y);
});

// 5. Drawing Engine
canvas.oncontextmenu = (e) => e.preventDefault();

canvas.addEventListener('mousedown', (e) => {
    saveHistory();

    drawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.fillStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.lineWidth = currentTool === 'brush' ? 8 : 2;
    ctx.lineCap = 'round';

    // SPECIAL FILL TOOL CHECK
    if (currentTool === 'fill') {
        const fillColor = hexToRgba(ctx.fillStyle);
        floodFill(startX, startY, fillColor);
        drawing = false; // Fill is instantaneous
        return;
    }

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }

    if (currentTool === 'stamp') {
        ctx.font = '40px serif';
        ctx.fillText('🐱', startX - 20, startY + 15);
        drawing = false; 
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    if (currentTool === 'pencil' || currentTool === 'brush') {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    } else if (currentTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    } else {
        ctx.putImageData(snapshot, 0, 0);
        if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        } else if (currentTool === 'rect') {
            ctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY);
        } else if (currentTool === 'circle') {
            ctx.beginPath();
            let r = Math.abs(e.offsetX - startX);
            ctx.arc(startX, startY, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
});

window.addEventListener('mouseup', () => drawing = false);