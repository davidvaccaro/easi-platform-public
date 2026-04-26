import path from 'node:path';
import { execFileSync } from 'node:child_process';

function run(command, args, cwd) {
    return execFileSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: 'pipe'
    });
}

test('API contract is synchronized with source', () => {
    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, 'tools', 'contracts', 'generateApiContract.js');

    const output = run('node', [scriptPath, '--check'], projectRoot);
    expect(output).toContain('API contract is in sync.');
});
