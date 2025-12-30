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

// --- TEXT TOOL ELEMENTS ---
const textInput = document.getElementById('text-input-overlay');
const fontToolbar = document.getElementById('font-toolbar');
const fontFamilySelect = document.getElementById('font-family');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
let isBold = false;
let isItalic = false;

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
});

opacitySlider.addEventListener('input', (e) => {
    currentOpacity = e.target.value / 100;
    opacityValueDisplay.innerText = e.target.value + "%";
});

// Undo Logic
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

// --- COLOR INDICATOR SWAP ---
const colorIndicator = document.querySelector('.current-colors');
colorIndicator.onclick = () => {
    let temp = fgColor; fgColor = bgColor; bgColor = temp;
    fgPreview.style.backgroundColor = fgColor; bgPreview.style.backgroundColor = bgColor;
    statusBar.innerText = "Colors swapped! 🐾";
};

// Flood Fill logic...
function getRgbaFromHex(hex) {
    let c = hex.substring(1).split('');
    if(c.length==3) c=[c[0],c[0],c[1],c[1],c[2],c[2]];
    c='0x'+c.join('');
    return [(c>>16)&255, (c>>8)&255, c&255, 255];
}
function floodFill(x, y, fillRgba) {
    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const targetIdx = (y*width+x)*4;
    const [tr, tg, tb, ta] = [data[targetIdx], data[targetIdx+1], data[targetIdx+2], data[targetIdx+3]];
    if(tr===fillRgba[0] && tg===fillRgba[1] && tb===fillRgba[2] && ta===fillRgba[3]) return;
    const stack = [[x, y]];
    while(stack.length > 0) {
        const [cx, cy] = stack.pop();
        const ci = (cy*width+cx)*4;
        if(data[ci]===tr && data[ci+1]===tg && data[ci+2]===tb && data[ci+3]===ta) {
            data[ci]=fillRgba[0]; data[ci+1]=fillRgba[1]; data[ci+2]=fillRgba[2]; data[ci+3]=fillRgba[3];
            if(cx>0) stack.push([cx-1, cy]);
            if(cx<width-1) stack.push([cx+1, cy]);
            if(cy>0) stack.push([cx, cy-1]);
            if(cy<canvas.height-1) stack.push([cx, cy+1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// Build Palette
const catColors = ['#000000','#8c7b75','#ff8a80','#ffd180','#a5d6a7','#80deea','#9fa8da','#ce93d8','#f48fb1','#ffffff','#ffcdd2','#f8bbd0','#e1bee7','#d1c4e9','#c5cae9','#bbdefb','#b3e5fc','#b2ebf2','#b2dfdb','#c8e6c9','#dcedc8','#f0f4c3','#fff9c4','#ffecb3','#ffe0b2','#ffccbc','#d7ccc8','#f5f5f5'];
catColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch'; swatch.style.backgroundColor = color;
    swatch.onmousedown = (e) => {
        if (e.button === 0) { fgColor = color; fgPreview.style.backgroundColor = color; }
        else { bgColor = color; bgPreview.style.backgroundColor = color; }
    };
    palette.appendChild(swatch);
});

toolbar.onclick = (e) => {
    const btn = e.target.closest('.tool');
    if (btn) {
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        btn.classList.add('active'); 
        currentTool = btn.dataset.tool;
        // Toggle Font Toolbar
        fontToolbar.style.display = (currentTool === 'text') ? 'block' : 'none';
        statusBar.innerText = `Selected: ${currentTool}`;
    }
};

// Font Style Buttons
btnBold.onclick = () => { isBold = !isBold; btnBold.classList.toggle('active'); };
btnItalic.onclick = () => { isItalic = !isItalic; btnItalic.classList.toggle('active'); };

// --- DRAWING ENGINE ---
canvas.onmousedown = (e) => {
    if (currentTool === 'text') {
        saveHistory();
        placeTextInput(e.offsetX, e.offsetY);
        return;
    }
    
    saveHistory();
    drawing = true;
    startX = e.offsetX; startY = e.offsetY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bctx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    bctx.strokeStyle = (e.button === 2) ? bgColor : fgColor;
    bctx.fillStyle = (e.button === 2) ? bgColor : fgColor;
    
    if (currentTool === 'pencil') {
        bctx.lineCap = 'square'; bctx.lineWidth = Math.max(1, currentSize / 5);
    } else {
        bctx.lineCap = 'round'; bctx.lineJoin = 'round'; bctx.lineWidth = currentSize;
    }
    if (currentTool === 'eraser') { bctx.strokeStyle = '#ffffff'; }
    if (currentTool === 'fill') {
        floodFill(startX, startY, getRgbaFromHex(bctx.fillStyle));
        drawing = false; return;
    }
    if (['pencil', 'brush', 'eraser'].includes(currentTool)) {
        bctx.beginPath(); bctx.moveTo(startX, startY);
    }
    if (currentTool === 'stamp') {
        ctx.globalAlpha = currentOpacity;
        ctx.font = `${currentSize * 4}px serif`;
        ctx.fillText('🐱', startX - (currentSize * 2), startY + (currentSize * 1.5));
        ctx.globalAlpha = 1.0;
        drawing = false;
    }
};

canvas.onmousemove = (e) => {
    if (!drawing) return;
    ctx.putImageData(snapshot, 0, 0);
    if (['pencil', 'brush', 'eraser'].includes(currentTool)) {
        bctx.lineTo(e.offsetX, e.offsetY); bctx.stroke();
    } else if (currentTool === 'line') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.beginPath(); bctx.moveTo(startX, startY); bctx.lineTo(e.offsetX, e.offsetY); bctx.stroke();
    } else if (currentTool === 'rect') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY);
    } else if (currentTool === 'circle') {
        bctx.clearRect(0,0,bufferCanvas.width,bufferCanvas.height);
        bctx.beginPath(); let r = Math.abs(e.offsetX - startX); bctx.arc(startX, startY, r, 0, Math.PI * 2); bctx.stroke();
    }
    ctx.globalAlpha = currentOpacity;
    ctx.drawImage(bufferCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
};

window.onmouseup = () => drawing = false;

// --- TEXT TOOL HELPERS ---
function placeTextInput(x, y) {
    // Finish any current text
    commitText();
    
    textInput.style.display = 'block';
    textInput.style.left = (x + 5) + 'px';
    textInput.style.top = (y + 5) + 'px';
    textInput.style.fontSize = currentSize + 'px';
    textInput.style.color = fgColor;
    textInput.style.fontFamily = fontFamilySelect.value;
    textInput.style.fontWeight = isBold ? 'bold' : 'normal';
    textInput.style.fontStyle = isItalic ? 'italic' : 'normal';
    textInput.value = '';
    textInput.focus();
    
    // Save coordinates for the canvas render
    textInput.dataset.x = x;
    textInput.dataset.y = y;
}

function commitText() {
    if (textInput.style.display === 'none' || textInput.value === '') {
        textInput.style.display = 'none';
        return;
    }
    
    const x = parseInt(textInput.dataset.x);
    const y = parseInt(textInput.dataset.y);
    
    ctx.globalAlpha = currentOpacity;
    ctx.fillStyle = fgColor;
    let fontStr = '';
    if (isItalic) fontStr += 'italic ';
    if (isBold) fontStr += 'bold ';
    fontStr += `${currentSize}px ${fontFamilySelect.value}`;
    
    ctx.font = fontStr;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput.value, x + 5, y + 5);
    ctx.globalAlpha = 1.0;
    
    textInput.style.display = 'none';
    textInput.value = '';
}

// Enter key to finish typing
textInput.onkeydown = (e) => { if (e.key === 'Enter') commitText(); };

// --- MENU UI ---
document.querySelectorAll('.menu-item').forEach(item => {
    item.onclick = (e) => {
        const act = item.classList.contains('active');
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        if (!act) item.classList.add('active'); e.stopPropagation();
    };
});
window.onclick = () => {
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
};

document.getElementById('btn-new').onclick = () => { if(confirm("Clear?")) { saveHistory(); ctx.clearRect(0,0,canvas.width,canvas.height); } };
document.getElementById('btn-save').onclick = () => { const l = document.createElement('a'); l.download='art.png'; l.href=canvas.toDataURL(); l.click(); };
document.getElementById('btn-undo').onclick = () => undo();
document.getElementById('btn-meow').onclick = () => alert("MEOW!");
document.getElementById('btn-random-cat').onclick = () => {
    saveHistory(); const cats = ['🐱', '🐈', '😸', '😹', '😻', '😼', '😽', '😾', '😿', '🙀'];
    const x = Math.random() * (canvas.width - 60); const y = 40 + Math.random() * (canvas.height - 60);
    ctx.globalAlpha = currentOpacity;
    ctx.font = '50px serif'; ctx.fillText(cats[Math.floor(Math.random()*cats.length)], x, y);
    ctx.globalAlpha = 1.0;
};