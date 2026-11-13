const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const DEFAULT_TIMESTAMP_URL = "http://timestamp.digicert.com";

function requiredEnvironment(env) {
	const names = [
		"SIGNPATH_ORGANIZATION_ID",
		"SIGNPATH_API_TOKEN",
		"SIGNPATH_PROJECT_SLUG",
		"SIGNPATH_SIGNING_POLICY_SLUG",
		"SIGNPATH_CERTIFICATE_FILE",
	];
	const missing = names.filter((name) => !env[name]);
	if (missing.length) {
		throw new Error(`SignPath Gateway signing is not configured; missing: ${missing.join(", ")}`);
	}
	return {
		organizationId: env.SIGNPATH_ORGANIZATION_ID,
		projectSlug: env.SIGNPATH_PROJECT_SLUG,
		policySlug: env.SIGNPATH_SIGNING_POLICY_SLUG,
		certificateFile: env.SIGNPATH_CERTIFICATE_FILE,
		timestampUrl: env.SIGNPATH_TIMESTAMP_URL || DEFAULT_TIMESTAMP_URL,
	};
}

async function signWithSignPathKsp(configuration, options = {}) {
	const env = options.env || process.env;
	const platform = options.platform || process.platform;
	const run = options.run || execFileAsync;
	if (platform !== "win32") {
		throw new Error("SignPath Windows KSP signing is supported only on Windows runners.");
	}
	if (!configuration || !configuration.path || !["sha256"].includes(configuration.hash)) {
		throw new Error("SignPath KSP requires a target file and SHA-256 signing pass.");
	}
	const settings = requiredEnvironment(env);
	const keyContainer = `${settings.projectSlug}/${settings.policySlug}`;
	const signArgs = [
		"sign", "/v", "/fd", "SHA256", "/csp", "SignPathKSP", "/kc", keyContainer,
		"/f", settings.certificateFile, "/tr", settings.timestampUrl, "/td", "SHA256",
		configuration.path,
	];
	const verifyArgs = ["verify", "/pa", "/all", "/v", configuration.path];
	try {
		await run("signtool.exe", signArgs, { windowsHide: true, env });
		await run("signtool.exe", verifyArgs, { windowsHide: true, env });
	} catch (error) {
		// Do not echo child process output: provider diagnostics may contain sensitive context.
		const code = Number.isInteger(error && error.code) ? ` (exit code ${error.code})` : "";
		throw new Error(`SignPath KSP signing or Authenticode verification failed${code}.`);
	}
}

module.exports = { sign: signWithSignPathKsp, signWithSignPathKsp };
