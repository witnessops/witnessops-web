import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(appRoot, "../..");
const fixtureRoot = fs.mkdtempSync(
  path.join(repoRoot, ".witnessops-ask-loader-next-probe-"),
);
const fixtureApp = path.join(fixtureRoot, "app");
const fixtureLib = path.join(fixtureRoot, "lib");
const sourceLoader = path.join(
  appRoot,
  "src/lib/server/ask-witnessops/authority-loader.ts",
);
const sourceCore = path.join(
  appRoot,
  "src/lib/server/ask-witnessops/authority-loader-core.ts",
);
const nextBin = path.join(appRoot, "node_modules/next/dist/bin/next");
const appNodeModules = path.join(appRoot, "node_modules");
const projectionPath = path.join(
  repoRoot,
  "packages/ask-authority/runtime/v1/authority-set.json",
);

function fail(message) {
  process.stderr.write(`ask_authority_loader_standalone_probe_failed:${message}\n`);
  process.exitCode = 1;
  throw new Error(message);
}

function write(relativePath, contents) {
  const target = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
}

function copy(source, relativeTarget) {
  const target = path.join(fixtureRoot, relativeTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  if (!fs.readFileSync(source).equals(fs.readFileSync(target))) {
    fail(`fixture_copy_mismatch:${relativeTarget}`);
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function directoryContains(directory, needle) {
  const bytes = Buffer.from(needle, "utf8");
  return walkFiles(directory).some((file) => fs.readFileSync(file).includes(bytes));
}

function runBuild() {
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: fixtureRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function writePositivePage() {
  write(
    "app/page.tsx",
    `import { getAuthoritySetIdentity, getTemplate } from "../lib/authority-loader";

export const dynamic = "force-dynamic";

export default function Page() {
  const identity = getAuthoritySetIdentity();
  const template = getTemplate("route.fit_check.v1");
  if (identity.projectionId !== "ASK_RUNTIME_AUTHORITY_SET_V1" || !template) {
    throw new Error("authority_loader_probe_failed");
  }
  return <main>server loader probe</main>;
}
`,
  );
}

function writeNegativePage() {
  write(
    "app/page.tsx",
    `"use client";

import { getAuthoritySetIdentity } from "../lib/authority-loader";

export default function Page() {
  return <main>{getAuthoritySetIdentity().projectionId}</main>;
}
`,
  );
}

try {
  for (const requiredPath of [sourceLoader, sourceCore, nextBin, appNodeModules, projectionPath]) {
    if (!fs.existsSync(requiredPath)) fail(`required_path_missing:${requiredPath}`);
  }

  fs.mkdirSync(fixtureApp, { recursive: true });
  fs.mkdirSync(fixtureLib, { recursive: true });
  fs.symlinkSync(appNodeModules, path.join(fixtureRoot, "node_modules"), "dir");
  copy(sourceLoader, "lib/authority-loader.ts");
  copy(sourceCore, "lib/authority-loader-core.ts");

  write(
    "package.json",
    JSON.stringify(
      {
        name: "witnessops-ask-authority-loader-probe",
        private: true,
        version: "0.0.0",
        scripts: { build: "next build" },
      },
      null,
      2,
    ) + "\n",
  );
  write(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          strict: true,
          noEmit: true,
          isolatedModules: true,
          jsx: "preserve",
          plugins: [{ name: "next" }],
        },
        include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n",
  );
  write(
    "next.config.mjs",
    `export default {
  output: "standalone",
  outputFileTracingRoot: ${JSON.stringify(repoRoot)},
};
`,
  );
  write(
    "app/layout.tsx",
    `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`,
  );

  writePositivePage();
  const positive = runBuild();
  if (positive.status !== 0) {
    process.stderr.write(positive.output);
    fail("positive_server_build_failed");
  }

  const projection = JSON.parse(fs.readFileSync(projectionPath, "utf8"));
  const manifestHash = projection.manifest_sha256;
  const templateBodies = projection.layers
    .find((layer) => layer.artifact_id === "RESPONSE_TEMPLATES_V1")
    .document.templates.map((template) => template.body);
  const serverRoots = [
    path.join(fixtureRoot, ".next/server"),
    path.join(fixtureRoot, ".next/standalone"),
  ];
  const staticRoot = path.join(fixtureRoot, ".next/static");

  if (!serverRoots.some((root) => directoryContains(root, projection.projection_id))) {
    fail("projection_identity_missing_from_server_output");
  }
  if (!serverRoots.some((root) => directoryContains(root, manifestHash))) {
    fail("manifest_hash_missing_from_server_output");
  }
  if (!serverRoots.some((root) => templateBodies.some((body) => directoryContains(root, body)))) {
    fail("template_body_missing_from_server_output");
  }

  for (const forbidden of [projection.projection_id, manifestHash, ...templateBodies]) {
    if (directoryContains(staticRoot, forbidden)) {
      fail("authority_content_present_in_client_static_output");
    }
  }

  fs.rmSync(path.join(fixtureRoot, ".next"), { recursive: true, force: true });
  writeNegativePage();
  const negative = runBuild();
  if (negative.status === 0) fail("client_import_build_unexpectedly_succeeded");
  if (!/server-only|Client Component|client component/i.test(negative.output)) {
    process.stderr.write(negative.output);
    fail("client_import_failed_without_server_only_boundary");
  }

  process.stdout.write(
    "ask-authority server-only loader standalone probe PASS server_included=true client_excluded=true client_import_blocked=true\n",
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
