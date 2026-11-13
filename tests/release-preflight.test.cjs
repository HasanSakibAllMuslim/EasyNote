const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

test("locked Electron and release-tool versions match the audited build", () => {
	assert.equal(lock.packages["node_modules/electron"].version, "45.3.1");
	assert.equal(lock.packages["node_modules/electron-builder"].version, "26.18.1");
	assert.equal(pkg.overrides.minimatch, "11.0.8");
	const minimatchPackages = Object.entries(lock.packages).filter(([name]) => name === "node_modules/minimatch" || name.endsWith("/node_modules/minimatch"));
	assert.ok(minimatchPackages.length > 0, "lockfile must contain minimatch entries");
	for (const [name, details] of minimatchPackages) {
		assert.equal(details.version, "11.0.8", `${name} must use the audited override`);
	}
});

test("PDF.js, its worker, PDF-Lib, CMaps and standard fonts are bundled locally", () => {
	for (const relativePath of [
		"libs/pdf.min.mjs",
		"libs/pdf.worker.min.mjs",
		"libs/pdf-lib.min.js",
		"libs/pdfjs/cmaps/LICENSE",
		"libs/pdfjs/standard_fonts/LICENSE_FOXIT",
		"libs/pdfjs/standard_fonts/LICENSE_LIBERATION",
		"libs/pdfjs/standard_fonts/LiberationSans-Regular.ttf",
	]) {
		assert.ok(fs.existsSync(path.join(root, relativePath)), `missing bundled resource: ${relativePath}`);
	}
	const renderer = read("js/main.js");
	assert.match(renderer, /\.\.\/libs\/pdf\.worker\.min\.mjs/);
	assert.match(renderer, /\.\.\/libs\/pdfjs\/cmaps\//);
	assert.match(renderer, /\.\.\/libs\/pdfjs\/standard_fonts\//);
});

test("application logos and Windows build icons exist", () => {
	for (const relativePath of ["assets/avatar.jpg", "assets/logo.svg", "build/icon.ico", "build/icon.png"]) {
		assert.ok(fs.existsSync(path.join(root, relativePath)), `missing application asset: ${relativePath}`);
	}
});

test("CSP and Electron renderer boundaries have expected security controls", () => {
	const html = read("index.html");
	const main = read("electron/main.cjs");
	assert.match(html, /Content-Security-Policy/);
	assert.match(html, /worker-src 'self' blob:/);
	assert.match(main, /nodeIntegration:\s*false/);
	assert.match(main, /contextIsolation:\s*true/);
	assert.match(main, /sandbox:\s*true/);
	assert.match(main, /webSecurity:\s*true/);
});

test("Windows packaging targets x64 NSIS and preserves app data on uninstall", () => {
	assert.equal(pkg.build.win.target[0].target, "nsis");
	assert.deepEqual(pkg.build.win.target[0].arch, ["x64"]);
	assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
});
