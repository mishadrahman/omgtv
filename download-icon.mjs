import fs from 'fs';
import https from 'https';
import sharp from 'sharp';

https.get('https://i.ibb.co.com/Xrn5XvRz/logo.webp', (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    try {
      await sharp(buffer).resize(512, 512).png().toFile('public/icon-512.png');
      await sharp(buffer).resize(192, 192).png().toFile('public/favicon.png');
      console.log('Icons generated successfully!');
    } catch (err) {
      console.error(err);
    }
  });
}).on('error', (err) => {
  console.error(err);
});
