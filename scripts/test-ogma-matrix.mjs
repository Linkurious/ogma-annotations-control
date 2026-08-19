/**
 * Runs the test suite (and optionally build/e2e) against multiple
 * @linkurious/ogma versions, one at a time, by swapping the installed
 * version before each run. Restores the lockfile-pinned version
 * afterwards regardless of outcome.
 *
 * Usage:
 *   node scripts/test-ogma-matrix.mjs                    # default: [floor, latest]
 *   node scripts/test-ogma-matrix.mjs --floor             # only the peer floor (packages/core's peerDependencies)
 *   node scripts/test-ogma-matrix.mjs --latest             # only the "latest" dist-tag
 *   node scripts/test-ogma-matrix.mjs --versions=5.3.11,6.0.8,latest
 *   node scripts/test-ogma-matrix.mjs --e2e              # also run e2e tests
 *   node scripts/test-ogma-matrix.mjs --skip-build        # skip the build step
 *
 * Wired into root package.json as separate `test:`/`e2e:`-prefixed scripts
 * (see below) so the CI shared library's script-prefix auto-discovery picks
 * each one up as its own step/stage with its own pass/fail, instead of one
 * opaque step that loops internally:
 *   npm run test:ogma-floor    -> --floor
 *   npm run test:ogma-latest   -> --latest
 *   npm run e2e:ogma-floor     -> --floor --e2e
 *   npm run e2e:ogma-latest    -> --latest --e2e
 *
 * `ogma:matrix` / `ogma:e2e-matrix` (no test:/e2e: prefix, so CI won't also
 * auto-run them and duplicate the above) run the full default matrix in one
 * command, for local use.
 *
 * Deliberately kept separate from the plain `test`/`e2e:test` scripts so
 * everyday local runs stay fast (one version, whatever's in the lockfile).
 */
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readPeerFloor() {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, "packages/core/package.json"), "utf8")
  );
  const range = pkg.peerDependencies?.["@linkurious/ogma"] ?? "";
  // Expect a lower-bound range like ">=5.3.11" - extract the version.
  const match = range.match(/>=\s*([\d.]+)/);
  return match ? match[1] : null;
}

function parseArgs(argv) {
  const args = {
    e2e: false,
    skipBuild: false,
    versions: null,
    floor: false,
    latest: false
  };
  for (const arg of argv) {
    if (arg === "--e2e") args.e2e = true;
    else if (arg === "--skip-build") args.skipBuild = true;
    else if (arg === "--floor") args.floor = true;
    else if (arg === "--latest") args.latest = true;
    else if (arg.startsWith("--versions=")) {
      args.versions = arg
        .slice("--versions=".length)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return args;
}

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    ...options
  });
}

function installOgma(version) {
  run("npm", ["install", `@linkurious/ogma@${version}`, "--no-save"]);
}

function restoreLockfileVersion() {
  console.log("\nRestoring lockfile-pinned @linkurious/ogma version...");
  run("npm", ["ci"]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const floor = readPeerFloor();
  const versions = args.versions
    ?? (args.floor && !args.latest ? [floor].filter(Boolean)
      : args.latest && !args.floor ? ["latest"]
        : [floor, "latest"].filter(Boolean));

  if (versions.length === 0) {
    console.error(
      "No versions to test - pass --versions=<a,b,c> or set peerDependencies[\"@linkurious/ogma\"] in packages/core/package.json"
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Testing against @linkurious/ogma: ${versions.join(", ")}`);

  /** @type {{version: string, ok: boolean, error?: string}[]} */
  const results = [];

  for (const version of versions) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`@linkurious/ogma@${version}`);
    console.log("=".repeat(60));

    try {
      installOgma(version);
      if (!args.skipBuild) run("npm", ["run", "build"]);
      run("npm", ["test"]);
      if (args.e2e) run("npm", ["run", "e2e:test"]);
      results.push({ version, ok: true });
    } catch (error) {
      results.push({ version, ok: false, error: error.message });
      // Keep going so one broken version doesn't hide results for the rest.
    }
  }

  try {
    restoreLockfileVersion();
  } catch (error) {
    console.error("Failed to restore lockfile-pinned version:", error.message);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary");
  console.log("=".repeat(60));
  for (const { version, ok } of results) {
    console.log(`  ${ok ? "✓" : "✗"} @linkurious/ogma@${version}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n${failed.length} version(s) failed: ${failed.map((r) => r.version).join(", ")}`
    );
    process.exitCode = 1;
  }
}

main();
