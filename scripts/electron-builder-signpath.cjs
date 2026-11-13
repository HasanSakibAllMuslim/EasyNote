const packageJson = require("../package.json");

module.exports = {
	...packageJson.build,
	win: {
		...packageJson.build.win,
		signtoolOptions: {
			sign: "./scripts/signpath-ksp-sign.cjs",
			signingHashAlgorithms: ["sha256"],
		},
		signExts: [".exe"],
	},
};
