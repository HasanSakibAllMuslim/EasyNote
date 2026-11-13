const assert = require("node:assert/strict");
const test = require("node:test");
const { signWithSignPathKsp } = require("../scripts/signpath-ksp-sign.cjs");
const signPathBuildConfig = require("../scripts/electron-builder-signpath.cjs");

const env = {
	SIGNPATH_ORGANIZATION_ID: "test-organization",
	SIGNPATH_API_TOKEN: "placeholder-for-tests-only",
	SIGNPATH_PROJECT_SLUG: "easynote",
	SIGNPATH_SIGNING_POLICY_SLUG: "release",
	SIGNPATH_CERTIFICATE_FILE: "C:\\certs\\public.cer",
};
const configuration = { path: "C:\\build\\EasyNote.exe", hash: "sha256" };

test("opt-in SignPath config preserves existing package settings and enables only SHA-256 KSP signing", () => {
	const packageBuild = require("../package.json").build;
	assert.equal(signPathBuildConfig.appId, packageBuild.appId);
	assert.equal(signPathBuildConfig.productName, packageBuild.productName);
	assert.deepEqual(signPathBuildConfig.files, packageBuild.files);
	assert.deepEqual(signPathBuildConfig.nsis, packageBuild.nsis);
	assert.deepEqual(signPathBuildConfig.win.target, packageBuild.win.target);
	assert.equal(signPathBuildConfig.win.signtoolOptions.sign, "./scripts/signpath-ksp-sign.cjs");
	assert.deepEqual(signPathBuildConfig.win.signtoolOptions.signingHashAlgorithms, ["sha256"]);
});

test("SignPath KSP signing applies SHA-256, a timestamp, then verifies Authenticode", async () => {
	const calls = [];
	await signWithSignPathKsp(configuration, {
		env,
		platform: "win32",
		run: async (...args) => calls.push(args),
	});
	assert.equal(calls.length, 2);
	assert.equal(calls[0][0], "signtool.exe");
	assert.ok(calls[0][1].includes("SignPathKSP"));
	assert.ok(calls[0][1].includes("easynote/release"));
	assert.ok(calls[0][1].includes("/tr"));
	assert.ok(calls[0][1].includes("/td"));
	assert.ok(calls[1][1].includes("verify"));
	assert.ok(calls.every((call) => !call[1].includes(env.SIGNPATH_API_TOKEN)));
});

test("SignPath KSP signer fails closed when credentials/configuration are absent", async () => {
	await assert.rejects(
		signWithSignPathKsp(configuration, { env: {}, platform: "win32", run: async () => assert.fail("must not run") }),
		/missing: SIGNPATH_ORGANIZATION_ID, SIGNPATH_API_TOKEN/,
	);
});

test("SignPath KSP signer rejects non-Windows and non-SHA-256 signing passes", async () => {
	await assert.rejects(signWithSignPathKsp(configuration, { env, platform: "linux" }), /only on Windows/);
	await assert.rejects(signWithSignPathKsp({ ...configuration, hash: "sha1" }, { env, platform: "win32" }), /SHA-256/);
});

test("SignPath KSP signer fails closed when signing or verification fails", async () => {
	let calls = 0;
	await assert.rejects(signWithSignPathKsp(configuration, {
		env,
		platform: "win32",
		run: async () => {
			calls += 1;
			if (calls === 2) throw Object.assign(new Error("private diagnostic"), { code: 1 });
		},
	}), /failed \(exit code 1\)/);
	assert.equal(calls, 2);
});
