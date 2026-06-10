import fs from "fs";
const stat = fs.statSync("public/logo.webp");
console.log("Size:", stat.size, "bytes");
const buf = fs.readFileSync("public/logo.webp");
console.log("First bytes:", buf.slice(0, 10).toString("hex"));
