const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const palette = document.getElementById('palette');
const fgPreview = document.getElementById('fg-color-preview');
const bgPreview = document.getElementById('bg-color-preview');
const statusBar = document.getElementById('status-bar');

// NEW: Size Control Elements
const brushSlider = document.getElementById('brush-slider');
const sizeValueDisplay = document.getElementById('size-value');

let drawing = false;
let currentTool = 'pencil';
let fgColor = '#000000';
let bgColor = '#ffffff';
let currentSize = 5; // Default starting size
let startX, startY, snapshot;

// --- BRUSH SIZE LOGIC ---
brushSlider.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeValueDisplay.innerText = currentSize;
    statusBar.innerText = `Brush size set to ${currentSize}px`;
});

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

// --- ROBUST FLOOD FILL LOGIC ---
function getRgbaFromHex(hex) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x' + c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255, 255];
    }
    return [0, 0, 0, 255]; 
}

function floodFill(x, y, fillRgba) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const targetIdx = (y * width + x) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];

    if (targetR === fillRgba[0] && targetG === fillRgba[1] && 
        targetB === fillRgba[2] && targetA === fillRgba[3]) return;

    const stack = [[x, y]];
    while (stack.length > 0) {
        const [currX, currY] = stack.pop();
        const currIdx = (currY * width + currX) * 4;
        if (data[currIdx] === targetR && data[currIdx + 1] === targetG &&
            data[currIdx + 2] === targetB && data[currIdx + 3] === targetA) {
            data[currIdx] = fillRgba[0];
            data[currIdx + 1] = fillRgba[1];
            data[currIdx + 2] = fillRgba[2];
            data[currIdx + 3] = fillRgba[3];
            if (currX > 0) stack.push([currX - 1, currY]);
            if (currX < width - 1) stack.push([currX + 1, currY]);
            if (currY > 0) stack.push([currX, currY - 1]);
            if (currY < height - 1) stack.push([currX, currY + 1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// 1. Cat Palette Generation
const catColors = ['#000000','#8c7b75','#ff8a80','#ffd180','#a5d6a7','#80deea','#9fa8da','#ce93d8','#f48fb1','#ffffff','#ffcdd2','#f8bbd0','#e1bee7','#d1c4e9','#c5cae9','#bbdefb','#b3e5fc','#b2ebf2','#b2dfdb','#c8e6c9','#dcedc8','#f0f4c3','#fff9c4','#ffecb3','#ffe0b2','#ffccbc','#d7ccc8','#f5f5f5'];

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
    }
});
document.getElementById('btn-save').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-cat-art.png';
    link.href = canvas.toDataURL();
    link.click();
});
document.getElementById('btn-undo').addEventListener('click', () => undo());
document.getElementById('btn-meow').addEventListener('click', () => alert("MEOW! 🐾"));
document.getElementById('btn-random-cat').addEventListener('click', () => {
    saveHistory();
    const cats = ['🐱', '🐈', '😸', '😹', '😻', '😼', '😽', '😾', '😿', '🙀'];
    const randomCat = cats[Math.floor(Math.random() * cats.length)];
    const x = Math.random() * (canvas.width - 60);
    const y = 40 + Math.random() * (canvas.height - 60);
    ctx.font = '50px serif';
    ctx.fillStyle = fgColor;
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

    if (currentTool === 'fill') {
        const colorToUse = (e.button === 2) ? bgColor : fgColor;
        floodFill(startX, startY, getRgbaFromHex(colorToUse));
        drawing = false; 
        return;
    }

    // UPDATED: Use currentSize for all tools
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }

    if (currentTool === 'stamp') {
        // Stamp also scales with size!
        ctx.font = `${currentSize * 5}px serif`;
        ctx.fillText('🐱', startX - (currentSize * 2), startY + (currentSize * 2));
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
        // Eraser is slightly larger than the brush for easier cleaning
        ctx.lineWidth = currentSize * 2; 
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    } else {
        ctx.putImageData(snapshot, 0, 0);
        if (currentTool === 'line') {
            ctx.beginPath(); ctx.moveTo(startX, startY);
            ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke();
        } else if (currentTool === 'rect') {
            ctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY);
        } else if (currentTool === 'circle') {
            ctx.beginPath(); let r = Math.abs(e.offsetX - startX);
            ctx.arc(startX, startY, r, 0, Math.PI * 2); ctx.stroke();
        }
    }
});

window.addEventListener('mouseup', () => drawing = false);