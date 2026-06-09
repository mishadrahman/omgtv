import sharp from "sharp";
async function resize() {
  await sharp("public/logo.webp").resize(192, 192).webp().toFile("public/logo-192.webp");
  await sharp("public/logo.webp").resize(512, 512).webp().toFile("public/logo-512.webp");
  console.log("Resized");
}
resize();
