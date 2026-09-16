// Invoke the existing policy without inherited Trivy filtering configuration.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export function scanEnvironment(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('TRIVY_')));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = resolve(process.argv[2]);
  execFileSync('bash', ['deploy/aws/scan-runtime-image.sh', resolve(dir, 'witnessops-web-image.tar'), dir],
    { env: scanEnvironment(process.env), stdio: 'inherit' });
}
