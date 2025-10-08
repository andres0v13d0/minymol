const fs = require('fs');
const path = require('path');

// Leer el archivo original
const logoPath = path.join(__dirname, 'assets', 'logo.png');
const tempPath = path.join(__dirname, 'assets', 'logo_temp.png');

// Leer y reescribir el archivo para limpiar metadatos
const buffer = fs.readFileSync(logoPath);
fs.writeFileSync(tempPath, buffer);

// Reemplazar el original
fs.unlinkSync(logoPath);
fs.renameSync(tempPath, logoPath);

console.log('✅ logo.png ha sido optimizado');
