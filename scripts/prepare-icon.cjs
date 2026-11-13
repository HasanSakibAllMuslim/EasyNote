const fs = require("node:fs");
const path = require("node:path");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const projectRoot = path.resolve(__dirname, "..");
const preferredInput = path.join(projectRoot, "build", "logo.png");
const fallbackInput = path.join(projectRoot, "build", "icon.png");
const output = path.join(projectRoot, "build", "icon.ico");

async function main() {
	const input = fs.existsSync(preferredInput) ? preferredInput : fallbackInput;
	if (!fs.existsSync(input)) {
    console.error("\nEasyNote Windows icon is missing.");
		console.error("Place build/logo.png or build/icon.png here:");
		console.error(preferredInput);
		console.error(fallbackInput);
    console.error("\nUse a square PNG (recommended: 512 x 512 px) with a transparent background. Then run: npm run dist\n");
    process.exit(1);
  }

	// Keep the original ICO intact unless conversion succeeds.
  const ico = await pngToIco(input);
	const temporaryOutput = `${output}.tmp`;
	fs.writeFileSync(temporaryOutput, ico);
	fs.renameSync(temporaryOutput, output);
  console.log(`Windows icon created: ${output}`);
}

main().catch((error) => {
	console.error("Could not create the Windows icon from the available PNG logo.");
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
