const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const palette = document.getElementById('palette');
const fgPreview = document.getElementById('fg-color-preview');
const bgPreview = document.getElementById('bg-color-preview');
const statusBar = document.getElementById('status-bar');
const brushSlider = document.getElementById('brush-slider');
const sizeValueDisplay = document.getElementById('size-value');

let drawing = false;
let currentTool = 'pencil';
let fgColor = '#000000';
let bgColor = '#ffffff';
let currentSize = 22; 
let startX, startY, snapshot;

// Update size display on load
sizeValueDisplay.innerText = currentSize + "px";

brushSlider.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeValueDisplay.innerText = currentSize + "px";
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

function getRgbaFromHex(hex) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3) c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        c= '0x' + c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255, 255];
    }
    return [0, 0, 0, 255]; 
}

function floodFill(x, y, fillRgba) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const targetIdx = (y * width + x) * 4;
    const [tr, tg, tb, ta] = [data[targetIdx], data[targetIdx+1], data[targetIdx+2], data[targetIdx+3]];
    if (tr === fillRgba[0] && tg === fillRgba[1] && tb === fillRgba[2] && ta === fillRgba[3]) return;
    const stack = [[x, y]];
    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const ci = (cy * width + cx) * 4;
        if (data[ci]===tr && data[ci+1]===tg && data[ci+2]===tb && data[ci+3]===ta) {
            data[ci]=fillRgba[0]; data[ci+1]=fillRgba[1]; data[ci+2]=fillRgba[2]; data[ci+3]=fillRgba[3];
            if (cx > 0) stack.push([cx - 1, cy]);
            if (cx < width - 1) stack.push([cx + 1, cy]);
            if (cy > 0) stack.push([cx, cy - 1]);
            if (cy < canvas.height - 1) stack.push([cx, cy + 1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

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
        btn.classList.add('active'); currentTool = btn.dataset.tool;
    }
};

canvas.oncontextmenu = (e) => e.preventDefault();
canvas.onmousedown = (e) => {
    saveHistory(); drawing = true; startX = e.offsetX; startY = e.offsetY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.fillStyle = (e.button === 2) ? bgColor : fgColor;
    if (currentTool === 'fill') {
        floodFill(startX, startY, getRgbaFromHex(ctx.fillStyle));
        drawing = false; return;
    }
    ctx.lineWidth = currentSize; ctx.lineCap = 'round';
    if (['pencil', 'brush', 'eraser'].includes(currentTool)) ctx.beginPath();
    if (currentTool === 'stamp') {
        ctx.font = `${currentSize * 4}px serif`;
        ctx.fillText('🐱', startX - (currentSize * 2), startY + (currentSize * 1.5));
        drawing = false;
    }
};

canvas.onmousemove = (e) => {
    if (!drawing) return;
    if (currentTool === 'pencil' || currentTool === 'brush') { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
    else if (currentTool === 'eraser') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = currentSize * 2; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
    else {
        ctx.putImageData(snapshot, 0, 0);
        if (currentTool === 'line') { ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
        else if (currentTool === 'rect') { ctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY); }
        else if (currentTool === 'circle') { ctx.beginPath(); let r = Math.abs(e.offsetX - startX); ctx.arc(startX, startY, r, 0, Math.PI * 2); ctx.stroke(); }
    }
};
window.onmouseup = () => drawing = false;

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
document.getElementById('btn-random-cat').onclick = () => {
    saveHistory(); const cats = ['🐱', '🐈', '😸', '😹', '😻', '😼', '😽', '😾', '😿', '🙀'];
    const x = Math.random() * (canvas.width - 60); const y = 40 + Math.random() * (canvas.height - 60);
    ctx.font = '50px serif'; ctx.fillText(cats[Math.floor(Math.random()*cats.length)], x, y);
};