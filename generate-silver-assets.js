const fs = require('fs');
const { createCanvas } = require('canvas');

// Nodo de recurso de plata
function createSilverRock() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  
  // Fondo gris plateado oscuro
  ctx.fillStyle = '#5a6268';
  ctx.fillRect(0, 0, 64, 64);
  
  // Textura de roca plateada
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const size = Math.random() * 4 + 1;
    const brightness = 180 + Math.random() * 75;
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.4)`;
    ctx.fillRect(x, y, size, size);
  }
  
  // Vetas plateadas
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(220, 220, 220, 0.6)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 64, Math.random() * 64);
    ctx.lineTo(Math.random() * 64, Math.random() * 64);
    ctx.stroke();
  }
  
  return canvas.toBuffer('image/png');
}

// Item de plata
function createSilverItem() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  
  // Círculo plateado brillante
  const gradient = ctx.createRadialGradient(16, 16, 2, 16, 16, 14);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.3, '#e8e8e8');
  gradient.addColorStop(0.6, '#c0c0c0');
  gradient.addColorStop(1, '#a0a0a0');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fill();
  
  // Borde
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Brillo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(12, 12, 4, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Generar y guardar
const silverRock = createSilverRock();
const silverItem = createSilverItem();

fs.writeFileSync('./public/assets/silver-rock-tile.png', silverRock);
fs.writeFileSync('./public/assets/silver-item-tile.png', silverItem);

console.log('✅ Imágenes de plata generadas exitosamente!');
console.log('   - public/assets/silver-rock-tile.png');
console.log('   - public/assets/silver-item-tile.png');
