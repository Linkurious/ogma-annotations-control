/**
 * Vitest globalSetup: prints which @linkurious/ogma build the test run is
 * actually exercising - runs once per vitest invocation (not once per test
 * file), so it shows up as a single clearly-grep-able line in CI logs.
 * Useful for confirming e.g. `test:ogma-floor` really did swap in the
 * floor version before running, not just that the swap didn't error.
 */
import { Ogma } from "@linkurious/ogma";

export default function setup() {
  const { version, commit, buildTime } = Ogma.build;
  // eslint-disable-next-line no-console
  console.log(
    `\n[ogma-build] Testing against @linkurious/ogma@${version} (commit ${commit}, built ${buildTime})\n`
  );
}
