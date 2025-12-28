const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const palette = document.getElementById('palette');
const fgPreview = document.getElementById('fg-color-preview');
const bgPreview = document.getElementById('bg-color-preview');

let drawing = false;
let currentTool = 'pencil';
let fgColor = '#000000';
let bgColor = '#ffffff';
let startX, startY, snapshot;

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
    }
});

// 3. Drawing Events
canvas.oncontextmenu = (e) => e.preventDefault();

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.fillStyle = (e.button === 2) ? bgColor : fgColor;
    ctx.lineWidth = currentTool === 'brush' ? 8 : 2;
    ctx.lineCap = 'round';

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }

    if (currentTool === 'stamp') {
        ctx.font = '40px serif';
        ctx.fillText('🐱', startX - 20, startY + 15);
        drawing = false; // Just one stamp
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
        // Shape Previews
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