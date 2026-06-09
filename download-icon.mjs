import fs from 'fs';
import https from 'https';
import sharp from 'sharp';

const url = 'https://raw.githubusercontent.com/mishadrahman/omgtv/main/assets/logo.webp';

function downloadFile(url) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
       return downloadFile(res.headers.location);
    }
    
    if (res.statusCode !== 200) {
      console.error(`Failed to download icon, status code: ${res.statusCode}`);
      return;
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      try {
        await sharp(buffer).resize(512, 512).png().toFile('public/icon-512.png');
        await sharp(buffer).resize(192, 192).png().toFile('public/favicon.png');
        console.log('Icons generated successfully!');
      } catch (err) {
        console.error('Error generating icons:', err);
      }
    });
  }).on('error', (err) => {
    console.error('Network error during download:', err);
  });
}

downloadFile(url);
