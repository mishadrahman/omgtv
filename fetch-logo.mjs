import fs from 'fs';
import https from 'https';

const url = 'https://raw.githubusercontent.com/mishadrahman/omgtv/main/assets/logo.webp';

function downloadFile(downloadUrl, dest) {
  https.get(downloadUrl, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
       return downloadFile(res.headers.location, dest);
    }
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded to ${dest}`);
    });
  }).on('error', (err) => {
    console.error('Error:', err);
  });
}

if (!fs.existsSync('./assets')) fs.mkdirSync('./assets');
downloadFile(url, './assets/logo.webp');
