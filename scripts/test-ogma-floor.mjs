/**
 * Runs build+test (and optionally e2e) against the floor
 * @linkurious/ogma version this repo claims to support
 * (packages/core's peerDependencies["@linkurious/ogma"] lower bound),
 * in addition to whatever version is normally installed.
 *
 * "Latest" doesn't need a separate check here - the plain `npm test` /
 * `npm run build` CI steps already run against whatever's currently
 * locked (kept current via periodic `npm install @linkurious/ogma@latest`
 * maintenance). This script exists to additionally cover the floor,
 * which the normal install never touches.
 *
 * Why this doesn't do a fresh `npm install @linkurious/ogma@<version>`:
 * @linkurious/ogma is private, published to an internal registry.
 * Only some CI steps are authenticated against it - the fresh-install
 * approach broke on the steps that aren't. To sidestep that entirely,
 * the floor version is declared as a regular, aliased devDependency
 * (see root package.json: "ogma-5-3-11": "npm:@linkurious/ogma@<version>"),
 * so it's fetched by the *same* already-authenticated step that installs
 * everything else from package-lock.json. This script then just swaps
 * node_modules/@linkurious/ogma for that already-downloaded copy on
 * disk - no network call, no auth, at swap time.
 *
 * Keep the alias in package.json's devDependencies in sync with
 * packages/core's peerDependencies floor if that ever changes.
 *
 * Usage:
 *   node scripts/test-ogma-floor.mjs                # build + test
 *   node scripts/test-ogma-floor.mjs --e2e           # also run e2e tests
 *   node scripts/test-ogma-floor.mjs --skip-build    # skip the build step
 *
 * Wired into root package.json as:
 *   npm run test:ogma-floor   -> node scripts/test-ogma-floor.mjs
 *   npm run e2e:ogma-floor    -> node scripts/test-ogma-floor.mjs --e2e
 * (test:/e2e: prefixes so CI's script-prefix auto-discovery picks each
 * one up as its own step, alongside the plain test:unit/e2e:test steps.)
 */
import { execFileSync } from "child_process";
import { cpSync, existsSync, readFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ALIAS_DIR = path.join(ROOT, "node_modules/ogma-5-3-11");
const TARGET_DIR = path.join(ROOT, "node_modules/@linkurious/ogma");

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd: ROOT, stdio: "inherit" });
}

function parseArgs(argv) {
  return {
    e2e: argv.includes("--e2e"),
    skipBuild: argv.includes("--skip-build")
  };
}

function readAliasedVersion() {
  const pkg = JSON.parse(
    readFileSync(path.join(ALIAS_DIR, "package.json"), "utf8")
  );
  return pkg.version;
}

function swapInFloorVersion() {
  if (!existsSync(ALIAS_DIR)) {
    throw new Error(
      `${ALIAS_DIR} doesn't exist. Run \`npm install\` at the repo root first ` +
        `(the floor version is pulled in as the "ogma-5-3-11" devDependency).`
    );
  }
  const version = readAliasedVersion();
  console.log(`\nSwapping in @linkurious/ogma@${version} (from ${ALIAS_DIR})...`);
  rmSync(TARGET_DIR, { recursive: true, force: true });
  cpSync(ALIAS_DIR, TARGET_DIR, { recursive: true });
}

function restore() {
  console.log("\nRestoring the normally-installed @linkurious/ogma version...");
  run("npm", ["ci"]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    swapInFloorVersion();
    if (!args.skipBuild) run("npm", ["run", "build"]);
    run("npm", ["test"]);
    if (args.e2e) run("npm", ["run", "e2e:test"]);
  } finally {
    restore();
  }
}

main();
