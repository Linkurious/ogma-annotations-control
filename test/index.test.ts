import { describe, test, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { workspaces } from '../package.json';
describe('Should have loose Ogma peerDependency', () => {

  test.each(workspaces)(`Package %s should have a loose dependency to Ogma`, async (workspace) => {
    const { peerDependencies } = JSON.parse(await readFile(`${workspace}/package.json`));
    expect(peerDependencies['@linkurious/ogma']).toMatch(/^>=\d+\.\d+\.\d+/);

  });

});