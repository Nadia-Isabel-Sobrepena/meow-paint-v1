const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const palette = document.getElementById('palette');
const fgPreview = document.getElementById('fg-color-preview');
const bgPreview = document.getElementById('bg-color-preview');
const statusBar = document.getElementById('status-bar');
const brushSlider = document.getElementById('brush-slider');
const sizeValueDisplay = document.getElementById('size-value');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValueDisplay = document.getElementById('opacity-value');

const textInput = document.getElementById('text-input-overlay');
const fontToolbar = document.getElementById('font-toolbar');
const fontFamilySelect = document.getElementById('font-family');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
let isBold = false;
let isItalic = false;
let isDraggingText = false;
let textDragStartX, textDragStartY;

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: Math.floor(clientX - rect.left),
        y: Math.floor(clientY - rect.top)
    };
}

// --- SPLASH SCREEN LOGIC ---
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const bar = document.getElementById('progress-bar');
    const loadText = document.getElementById('loading-text');
    const messages = ["Finding Catnip...", "Sharpening Claws...", "Waking up the kittens...", "Loading Meowsoft Windows 98...", "Ready for mischief!"];
    let progress = 0; let msgIndex = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        bar.style.width = progress + "%";
        if (progress > (msgIndex + 1) * 20 && msgIndex < messages.length - 1) { msgIndex++; loadText.innerText = messages[msgIndex]; }
        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => { splash.style.opacity = "0"; setTimeout(() => splash.style.display = "none", 800); }, 500);
        }
    }, 200);
});

// --- BUFFER CANVAS LOGIC ---
const bufferCanvas = document.createElement('canvas');
const bctx = bufferCanvas.getContext('2d');
bufferCanvas.width = canvas.width;
bufferCanvas.height = canvas.height;

let drawing = false;
let currentTool = 'pencil';
let fgColor = '#000000';
let bgColor = '#ffffff';
let currentSize = 22; 
let currentOpacity = 1.0; 
let startX, startY, snapshot;

sizeValueDisplay.innerText = currentSize + "px";
opacityValueDisplay.innerText = "100%";

brushSlider.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeValueDisplay.innerText = currentSize + "px";
    updateLiveTextPreview();
});

opacitySlider.addEventListener('input', (e) => {
    currentOpacity = e.target.value / 100;
    opacityValueDisplay.innerText = e.target.value + "%";
    updateLiveTextPreview();
});

fontFamilySelect.addEventListener('change', updateLiveTextPreview);
btnBold.onclick = () => { isBold = !isBold; btnBold.classList.toggle('active'); updateLiveTextPreview(); };
btnItalic.onclick = () => { isItalic = !isItalic; btnItalic.classList.toggle('active'); updateLiveTextPreview(); };

function updateLiveTextPreview() {
    if (textInput.style.display === 'block') {
        textInput.style.fontFamily = fontFamilySelect.value;
        textInput.style.fontWeight = isBold ? 'bold' : 'normal';
        textInput.style.fontStyle = isItalic ? 'italic' : 'normal';
        textInput.style.fontSize = currentSize + "px";
        textInput.style.color = fgColor;
        textInput.style.opacity = currentOpacity;
        textInput.style.height = 'auto';
        textInput.style.height = textInput.scrollHeight + 'px';
        textInput.style.width = 'auto';
        textInput.style.width = (textInput.scrollWidth + 10) + 'px';
    }
}
textInput.addEventListener('input', updateLiveTextPreview);

let undoStack = [];
const maxHistory = 20;
function saveHistory() {
    if (undoStack.length >= maxHistory) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}
function undo() {
    if (undoStack.length > 0) {
        ctx.putImageData(undoStack.pop(), 0, 0);
        statusBar.innerText = "Undo successful! 🐾";
    }
}
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

const colorIndicator = document.querySelector('.current-colors');
colorIndicator.onclick = () => {
    let temp = fgColor; fgColor = bgColor; bgColor = temp;
    fgPreview.style.backgroundColor = fgColor; bgPreview.style.backgroundColor = bgColor;
    updateLiveTextPreview();
    statusBar.innerText = "Colors swapped! 🐾";
};

const catColors = ['#000000','#8c7b75','#ff8a80','#ffd180','#a5d6a7','#80deea','#9fa8da','#ce93d8','#f48fb1','#ffffff','#ffcdd2','#f8bbd0','#e1bee7','#d1c4e9','#c5cae9','#bbdefb','#b3e5fc','#b2ebf2','#b2dfdb','#c8e6c9','#dcedc8','#f0f4c3','#fff9c4','#ffecb3','#ffe0b2','#ffccbc','#d7ccc8','#f5f5f5'];
catColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch'; swatch.style.backgroundColor = color;
    swatch.onmousedown = (e) => {
        if (e.button === 0) { fgColor = color; fgPreview.style.backgroundColor = color; }
        else { bgColor = color; bgPreview.style.backgroundColor = color; }
        updateLiveTextPreview();
    };
    palette.appendChild(swatch);
});

toolbar.onclick = (e) => {
    const btn = e.target.closest('.tool');
    if (btn) {
        if (currentTool === 'text') commitText(); 
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        btn.classList.add('active'); 
        currentTool = btn.dataset.tool;
        fontToolbar.style.display = (currentTool === 'text') ? 'block' : 'none';
        statusBar.innerText = `Selected Tool: ${currentTool}`;
    }
};

canvas.onmousedown = (e) => {
    const pos = getMousePos(e);
    if (currentTool === 'text') { commitText(); placeTextInput(pos.x, pos.y); return; }
    const colorToUse = (e.button === 2) ? bgColor : fgColor;
    if (currentTool === 'fill') { saveHistory(); floodFill(pos.x, pos.y, getRgbaFromHex(colorToUse)); return; }
    saveHistory();
    drawing = true;
    startX = pos.x; startY = pos.y;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bctx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    bctx.strokeStyle = colorToUse;
    bctx.fillStyle = colorToUse;
    if (currentTool === 'pencil') { bctx.lineCap = 'square'; bctx.lineWidth = Math.max(1, currentSize / 5); } 
    else { bctx.lineCap = 'round'; bctx.lineJoin = 'round'; bctx.lineWidth = currentSize; }
    if (currentTool === 'eraser') { bctx.strokeStyle = bgColor; }
    if (['pencil', 'brush', 'eraser'].includes(currentTool)) { bctx.beginPath(); bctx.moveTo(startX, startY); }
    if (currentTool === 'stamp') {
        ctx.globalAlpha = currentOpacity; ctx.font = `${currentSize * 4}px serif`;
        ctx.fillText('🐱', startX - (currentSize * 2), startY + (currentSize * 1.5));
        ctx.globalAlpha = 1.0; drawing = false;
    }
};

window.addEventListener('mousemove', (e) => {
    if (isDraggingText) {
        textInput.style.left = (e.clientX - textDragStartX) + 'px';
        textInput.style.top = (e.clientY - textDragStartY) + 'px';
        textInput.dataset.x = e.clientX - textDragStartX; 
        textInput.dataset.y = e.clientY - textDragStartY;
    }
    if (!drawing) return;
    const pos = getMousePos(e);
    ctx.putImageData(snapshot, 0, 0);
    if (['pencil', 'brush', 'eraser'].includes(currentTool)) {
        bctx.lineTo(pos.x, pos.y);
        bctx.stroke();
    } else if (currentTool === 'line') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.beginPath(); bctx.moveTo(startX, startY); bctx.lineTo(pos.x, pos.y); bctx.stroke();
    } else if (currentTool === 'rect') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    } else if (currentTool === 'circle') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.beginPath(); bctx.arc(startX, startY, Math.abs(pos.x - startX), 0, Math.PI * 2); bctx.stroke();
    }
    ctx.globalAlpha = currentOpacity;
    ctx.drawImage(bufferCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
});

window.addEventListener('mouseup', () => { drawing = false; isDraggingText = false; });

function placeTextInput(x, y) {
    textInput.style.display = 'block'; textInput.style.left = x + 'px'; textInput.style.top = y + 'px';
    textInput.dataset.x = x; textInput.dataset.y = y; textInput.value = ''; updateLiveTextPreview(); textInput.focus();
}

textInput.onmousedown = (e) => {
    isDraggingText = true;
    textDragStartX = e.clientX - textInput.offsetLeft;
    textDragStartY = e.clientY - textInput.offsetTop;
};

function commitText() {
    if (textInput.style.display === 'none' || textInput.value === '') { textInput.style.display = 'none'; return; }
    saveHistory();
    const x = parseInt(textInput.dataset.x); let y = parseInt(textInput.dataset.y);
    ctx.globalAlpha = currentOpacity; ctx.fillStyle = fgColor;
    let fontStr = ''; if (isItalic) fontStr += 'italic '; if (isBold) fontStr += 'bold ';
    fontStr += `${currentSize}px ${fontFamilySelect.value}`;
    ctx.font = fontStr; ctx.textBaseline = 'top';
    const lines = textInput.value.split('\n'); const lineHeight = currentSize * 1.2;
    lines.forEach((line, index) => { ctx.fillText(line, x + 2, y + 2 + (index * lineHeight)); });
    ctx.globalAlpha = 1.0; textInput.style.display = 'none'; textInput.value = '';
}

textInput.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { commitText(); } };

window.addEventListener('mousedown', (e) => {
    if (e.target.type === 'range') return;
    if (e.target !== textInput && e.target !== canvas && !fontToolbar.contains(e.target)) { commitText(); } 
});

// Menu Dropdowns
document.querySelectorAll('.menu-item').forEach(item => {
    item.onclick = (e) => {
        const act = item.classList.contains('active');
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        if (!act) item.classList.add('active'); e.stopPropagation();
    };
});
window.onclick = () => document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));

document.getElementById('btn-new').onclick = () => { if(confirm("Clear?")) { saveHistory(); ctx.clearRect(0,0,canvas.width,canvas.height); } };
document.getElementById('btn-save').onclick = () => { const l = document.createElement('a'); l.download='art.png'; l.href=canvas.toDataURL(); l.click(); };
document.getElementById('btn-undo').onclick = () => undo();
document.getElementById('btn-meow').onclick = () => alert("MEOW!");

// --- NEW: ABOUT BUTTON ACTION ---
document.getElementById('btn-about').onclick = () => {
    alert("Meow Paint v98.cat\n\nA purr-fectly retro drawing tool created with Vibe Coding and a love for kittens! 🐾\n\nCollaborating with AI to bring cat art to life.");
};

document.getElementById('btn-random-cat').onclick = () => {
    saveHistory(); const cats = ['🐱', '🐈', '😸', '😹', '😻', '😼', '😽', '😾', '😿', '🙀'];
    const x = Math.random() * (canvas.width - 60); const y = 40 + Math.random() * (canvas.height - 60);
    ctx.globalAlpha = currentOpacity; ctx.font = '50px serif'; 
    ctx.fillText(cats[Math.floor(Math.random()*cats.length)], x, y);
    ctx.globalAlpha = 1.0;
};

function getRgbaFromHex(hex) {
    if (Array.isArray(hex)) return hex;
    let c = hex.substring(1).split('');
    if(c.length==3) c=[c[0],c[0],c[1],c[1],c[2],c[2]];
    c='0x'+c.join('');
    return [(c>>16)&255, (c>>8)&255, c&255, 255];
}

function floodFill(x, y, fillRgba) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data; const width = canvas.width;
    const targetIdx = (y * width + x) * 4;
    const targetR = data[targetIdx]; const targetG = data[targetIdx + 1]; const targetB = data[targetIdx + 2]; const targetA = data[targetIdx + 3];
    if (targetR === fillRgba[0] && targetG === fillRgba[1] && targetB === fillRgba[2] && targetA === fillRgba[3]) return;
    const stack = [[x, y]];
    while (stack.length > 0) {
        const [currX, currY] = stack.pop(); const currIdx = (currY * width + currX) * 4;
        if (data[currIdx] === targetR && data[currIdx + 1] === targetG && data[currIdx + 2] === targetB && data[currIdx + 3] === targetA) {
            data[currIdx] = fillRgba[0]; data[currIdx + 1] = fillRgba[1]; data[currIdx + 2] = fillRgba[2]; data[currIdx + 3] = fillRgba[3];
            if (currX > 0) stack.push([currX - 1, currY]); if (currX < canvas.width - 1) stack.push([currX + 1, currY]);
            if (currY > 0) stack.push([currX, currY - 1]); if (currY < canvas.height - 1) stack.push([currX, currY + 1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}