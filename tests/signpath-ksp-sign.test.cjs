const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const yaml = require("js-yaml");
const fs = require("node:fs");
const path = require("node:path");
const { signWithSignPathKsp } = require("../scripts/signpath-ksp-sign.cjs");
const signPathBuildConfig = require("../scripts/electron-builder-signpath.cjs");

const env = {
	SIGNPATH_ORGANIZATION_ID: "test-organization",
	SIGNPATH_API_TOKEN: "placeholder-for-tests-only",
	SIGNPATH_PROJECT_SLUG: "easynote",
	SIGNPATH_SIGNING_POLICY_SLUG: "release",
	SIGNPATH_CERTIFICATE_FILE: "C:\\certs\\public.cer",
	SIGNPATH_EXPECTED_CERT_SUBJECT: "CN=EasyNote Publisher, O=EasyNote, C=BD",
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
	assert.deepEqual(signPathBuildConfig.win.signExts, [".exe"]);
});

test("SignPath KSP signing applies SHA-256, a timestamp, then verifies Authenticode", async () => {
	const calls = [];
	await signWithSignPathKsp(configuration, {
		env,
		platform: "win32",
		run: async (...args) => calls.push(args),
	});
	assert.equal(calls.length, 3);
	assert.equal(calls[0][0], "signtool.exe");
	assert.ok(calls[0][1].includes("SignPathKSP"));
	assert.ok(calls[0][1].includes("easynote/release"));
	assert.ok(calls[0][1].includes("/tr"));
	assert.ok(calls[0][1].includes("/td"));
	assert.ok(calls[1][1].includes("verify"));
	assert.equal(calls[2][0], "powershell.exe");
	assert.ok(calls[2][1].includes(path.resolve(__dirname, "../scripts/verify-authenticode.ps1")));
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
	for (const failAt of [1, 2, 3]) {
		let calls = 0;
		await assert.rejects(signWithSignPathKsp(configuration, {
			env,
			platform: "win32",
			run: async () => {
				calls += 1;
				if (calls === failAt) throw Object.assign(new Error("private diagnostic"), { code: 1 });
			},
		}), /failed \(exit code 1\)/);
		assert.equal(calls, failAt);
	}
});

test("SignPath Actions workflow is manual, protected, least-privilege, pinned, and gates artifact upload on verification", () => {
	const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, "../.github/workflows/signpath-gateway.yml"), "utf8"));
	const trigger = workflow.on || workflow[true];
	assert.ok(trigger.workflow_dispatch);
	assert.equal(workflow.permissions.contents, "read");
	const job = workflow.jobs["signed-release"];
	assert.match(job.if, /refs\/heads\/main/);
	assert.equal(job.environment, "signpath-production");
	assert.equal(job["runs-on"], "windows-2025");
	const steps = job.steps;
	const kspInstall = steps.findIndex((step) => step.name === "Install SignPath KSP");
	const sign = steps.findIndex((step) => step.name.startsWith("Build, sign"));
	const verify = steps.findIndex((step) => step.name.startsWith("Verify every app executable"));
	const upload = steps.findIndex((step) => step.name === "Upload verified signed installer");
	assert.ok(kspInstall >= 0 && kspInstall < sign && sign < verify && verify < upload);
	assert.ok(steps.some((step) => step.run && step.run.includes("80a091df238708412ac3e0be88d743492ed34ea0ee65043d4b2a5f6f00f5cf46")));
	assert.ok(steps.some((step) => step.run && step.run.includes("certutil.exe -csplist")));
	assert.ok(steps.some((step) => step.run && step.run.includes("ADDLOCAL=KSP")));
	assert.ok(steps.some((step) => step.run && step.run.includes("/qn /norestart")));
	for (const step of steps.filter((item) => item.uses)) {
		assert.match(step.uses, /@[0-9a-f]{40}$/);
	}
	assert.match(steps[sign].env.SIGNPATH_API_TOKEN, /secrets\.SIGNPATH_API_TOKEN/);
	assert.match(job.if, /confirm_signing == true/);
	assert.equal(steps[upload].with.name.includes("Signed"), true);
});

test("PowerShell workflow steps and signature verifier parse on Windows", { skip: process.platform !== "win32" }, () => {
	const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, "../.github/workflows/signpath-gateway.yml"), "utf8"));
	const runBlocks = workflow.jobs["signed-release"].steps
		.filter((step) => step.shell === "pwsh" && step.run)
		.map((step) => step.run);
	runBlocks.push(fs.readFileSync(path.resolve(__dirname, "../scripts/verify-authenticode.ps1"), "utf8"));
	const parseCommand = [
		"$source=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('BASE64'));",
		"$tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors) > $null;",
		"if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }",
	].join(" ");
	for (const source of runBlocks) {
		const encoded = Buffer.from(source, "utf8").toString("base64");
		execFileSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", parseCommand.replace("BASE64", encoded)], { stdio: "pipe" });
	}
});
