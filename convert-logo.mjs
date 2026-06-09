import sharp from "sharp";
async function convert() {
  await sharp("public/logo.webp").png().toFile("public/logo.png");
  await sharp("public/logo.webp").resize(192, 192).png().toFile("public/logo-192.png");
  await sharp("public/logo.webp").resize(512, 512).png().toFile("public/logo-512.png");
  console.log("Converted!");
}
convert();
