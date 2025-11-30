const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DESKTOP_INPUT = 'public/assets/screenshots/home-desktop.png';
const MOBILE_INPUT = 'public/assets/screenshots/mobile-view.png';
const DESKTOP_OUTPUT = 'public/assets/screenshots/home-desktop-mockup.png';
const MOBILE_OUTPUT = 'public/assets/screenshots/mobile-view-mockup.png';

async function createDesktopMockup() {
  console.log('Processing Desktop Mockup...');
  const image = sharp(DESKTOP_INPUT);
  const metadata = await image.metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Configuration
  const bezel = Math.round(w * 0.015); // 1.5% bezel
  const bottomBezel = Math.round(bezel * 2.5);
  const radius = Math.round(w * 0.015);
  const baseHeight = Math.round(h * 0.04); // Base height
  
  const frameW = w + bezel * 2;
  const frameH = h + bezel + bottomBezel;
  
  // SVG Frame Construction
  // 1. Main Body (Screen Shell) - Dark Grey/Black
  // 2. Screen Content (The Image) - will be composited
  // 3. Camera Dot
  // 4. Base (Bottom part)
  
  // Base trapezoid
  const baseTopW = frameW;
  const baseBottomW = frameW * 1.2; // Wider base
  const basePath = `
    M ${(baseBottomW - baseTopW) / 2} ${frameH}
    L ${baseBottomW - (baseBottomW - baseTopW) / 2} ${frameH}
    L ${baseBottomW} ${frameH + baseHeight}
    L 0 ${frameH + baseHeight}
    Z
  `;

  const svgFrame = `
    <svg width="${baseBottomW}" height="${frameH + baseHeight}" viewBox="0 0 ${baseBottomW} ${frameH + baseHeight}" xmlns="http://www.w3.org/2000/svg">
      <!-- Base -->
      <path d="${basePath}" fill="#d1d5db" />
      <path d="M ${(baseBottomW - baseTopW) / 2} ${frameH} L ${baseBottomW - (baseBottomW - baseTopW) / 2} ${frameH} L ${baseBottomW - (baseBottomW - baseTopW) / 2} ${frameH + 2} L ${(baseBottomW - baseTopW) / 2} ${frameH + 2} Z" fill="#9ca3af" />

      <!-- Screen Bezel -->
      <rect x="${(baseBottomW - frameW) / 2}" y="0" width="${frameW}" height="${frameH}" rx="${radius}" ry="${radius}" fill="#1f2937" />
      
      <!-- Screen Hole (White background behind image just in case) -->
      <rect x="${(baseBottomW - frameW) / 2 + bezel}" y="${bezel}" width="${w}" height="${h}" fill="#ffffff" />
      
      <!-- Camera Dot -->
      <circle cx="${baseBottomW / 2}" cy="${bezel / 2}" r="${Math.max(3, bezel/4)}" fill="#374151" />
    </svg>
  `;

  // Create the frame image
  const frameBuffer = Buffer.from(svgFrame);

  // Composite
  // We need to place the image at correct offset
  const imageLeft = Math.round((baseBottomW - frameW) / 2 + bezel);
  const imageTop = bezel;

  await sharp(frameBuffer)
    .composite([
      { input: DESKTOP_INPUT, top: imageTop, left: imageLeft }
    ])
    .png()
    .toFile(DESKTOP_OUTPUT);
    
  console.log(`Desktop mockup saved to ${DESKTOP_OUTPUT}`);
}

async function createMobileMockup() {
  console.log('Processing Mobile Mockup...');
  const image = sharp(MOBILE_INPUT);
  const metadata = await image.metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Configuration
  const bezel = Math.round(w * 0.06); // Thicker bezel for phone
  const radius = Math.round(w * 0.12);
  const buttonWidth = Math.round(bezel / 2);
  const buttonHeight = Math.round(h * 0.08);
  const islandW = Math.round(w * 0.3);
  const islandH = Math.round(islandW * 0.3);

  const frameW = w + bezel * 2;
  const frameH = h + bezel * 2;
  
  const svgFrame = `
    <svg width="${frameW + buttonWidth}" height="${frameH}" viewBox="0 0 ${frameW + buttonWidth} ${frameH}" xmlns="http://www.w3.org/2000/svg">
      <!-- Side Buttons (Volume/Power) -->
      <rect x="0" y="${frameH * 0.2}" width="${buttonWidth}" height="${buttonHeight}" rx="${buttonWidth/2}" fill="#374151" />
      <rect x="0" y="${frameH * 0.32}" width="${buttonWidth}" height="${buttonHeight}" rx="${buttonWidth/2}" fill="#374151" />
      <rect x="${frameW}" y="${frameH * 0.25}" width="${buttonWidth}" height="${buttonHeight * 1.5}" rx="${buttonWidth/2}" fill="#374151" />

      <!-- Main Body -->
      <rect x="${buttonWidth}" y="0" width="${frameW}" height="${frameH}" rx="${radius}" ry="${radius}" fill="#111827" />
      
      <!-- Screen Border (Inner Stroke) -->
      <rect x="${buttonWidth + bezel - 2}" y="${bezel - 2}" width="${w + 4}" height="${h + 4}" rx="${radius/3}" ry="${radius/3}" fill="#000000" stroke="#374151" stroke-width="2" />

      <!-- Dynamic Island / Notch -->
      <rect x="${buttonWidth + frameW/2 - islandW/2}" y="${bezel + 10}" width="${islandW}" height="${islandH}" rx="${islandH/2}" fill="#000000" />
    </svg>
  `;

  const frameBuffer = Buffer.from(svgFrame);

  // Composite
  const imageLeft = buttonWidth + bezel;
  const imageTop = bezel;

  // Rounded corners for the screenshot itself to match phone curve
  // We create a mask
  const mask = Buffer.from(`
    <svg width="${w}" height="${h}">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius/3}" ry="${radius/3}" fill="white"/>
    </svg>
  `);

  const roundedImageBuffer = await image
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(frameBuffer)
    .composite([
      { input: roundedImageBuffer, top: imageTop, left: imageLeft }
    ])
    .png()
    .toFile(MOBILE_OUTPUT);

  console.log(`Mobile mockup saved to ${MOBILE_OUTPUT}`);
}

async function main() {
  try {
    await createDesktopMockup();
    await createMobileMockup();
    console.log('All mockups generated successfully!');
  } catch (err) {
    console.error('Error generating mockups:', err);
    process.exit(1);
  }
}

main();
