import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTrivyImage } from './validate-trivy-image.mjs';
export const config = `sha256:${'c'.repeat(64)}`;
export function cleanReport() {
  return { SchemaVersion: 2, ArtifactType: 'container_image', Metadata: { ImageID: config, ImageConfig: { architecture: 'amd64', os: 'linux' } }, Results: [ { Class: 'os-pkgs', Type: 'alpine' }, { Class: 'lang-pkgs', Type: 'node-pkg' } ] };
}
test('complete clean OS and npm scan accepts matching amd64 image', () => {
  assert.deepEqual(validateTrivyImage(cleanReport(),config), {CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,UNKNOWN:0});
});
for (const severity of ['CRITICAL','HIGH']) test(`reject ${severity}, including unfixed`, () => {
  const r=cleanReport();r.Results[1].Vulnerabilities=[{Severity:severity}];assert.throws(()=>validateTrivyImage(r,config));
});
for (const [name,change] of [
 ['config substitution', r=>r.Metadata.ImageID=`sha256:${'d'.repeat(64)}`],
 ['architecture substitution', r=>r.Metadata.ImageConfig.architecture='arm64'],
 ['missing npm scan', r=>r.Results.pop()],
 ['missing OS scan', r=>r.Results.shift()],
 ['empty report', r=>r.Results=[]],
 ['ignored findings', r=>r.Results[1].ModifiedFindings=[{Status:'ignored'}]],
]) test(`reject ${name}`,()=>{const r=cleanReport();change(r);assert.throws(()=>validateTrivyImage(r,config));});
test('medium and low remain visible without hiding findings',()=>{
 const r=cleanReport();r.Results[1].Vulnerabilities=[{Severity:'MEDIUM'},{Severity:'LOW'}];assert.equal(validateTrivyImage(r,config).MEDIUM,1);
});
