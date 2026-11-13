const fs = require("node:fs");
const path = require("node:path");
const pngToIco = require("png-to-ico");

const projectRoot = path.resolve(__dirname, "..");
const input = path.join(projectRoot, "build", "logo.png");
const output = path.join(projectRoot, "build", "icon.ico");

async function main() {
  if (!fs.existsSync(input)) {
    console.error("\nEasyNote Windows icon is missing.");
    console.error("Place your PNG logo here:");
    console.error(input);
    console.error("\nUse a square PNG (recommended: 512 x 512 px) with a transparent background. Then run: npm run dist\n");
    process.exit(1);
  }

  // png-to-ico reads the PNG file and creates a Windows ICO with standard icon sizes.
  const ico = await pngToIco(input);
  fs.writeFileSync(output, ico);
  console.log(`Windows icon created: ${output}`);
}

main().catch((error) => {
  console.error("Could not create the Windows icon from build/logo.png.");
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
