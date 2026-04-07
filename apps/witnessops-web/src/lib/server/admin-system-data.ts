/**
 * Server-only data helpers for the admin system surface (WEB-011).
 *
 * The admin system page used to render five hardcoded values; this
 * module provides the small set of pure async helpers needed to
 * replace the three values that should be derived from real data:
 *
 *   - countDocsPages    : real count of authored doc files under
 *                         content/witnessops/docs
 *   - countAudioFiles   : real count of generated audio assets under
 *                         apps/witnessops-web/public/audio
 *   - getPublicSurfaceUrl : the public site origin, derived from the
 *                         existing NEXT_PUBLIC_OS_SITE_URL env var
 *                         with a documented fallback
 *
 * The two count helpers accept an injectable root directory so they
 * can be tested hermetically over a tmpdir without touching the real
 * project tree. The default root paths are resolved relative to
 * `process.cwd()`, which is the package root in both `next dev` and
 * `next start` runtimes.
 */
import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DOC_EXTENSIONS = new Set([".mdx", ".md"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav"]);

/**
 * Public production fallback for the surface URL. Used only when the
 * `NEXT_PUBLIC_OS_SITE_URL` environment variable is unset or empty.
 * Matches the production deployment that the rest of the codebase
 * already targets.
 */
export const PUBLIC_SURFACE_URL_FALLBACK = "https://witnessops.com";

async function countFilesByExtension(
  rootDir: string,
  allowedExtensions: ReadonlySet<string>,
): Promise<number> {
  let total = 0;
  let entries: Dirent[];
  try {
    entries = (await readdir(rootDir, { withFileTypes: true })) as Dirent[];
  } catch (err) {
    // Missing directory is treated as zero rather than throwing, so
    // the admin system page never crashes when run in an environment
    // where the docs or audio tree has not been generated yet.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      total += await countFilesByExtension(full, allowedExtensions);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExtensions.has(ext)) total += 1;
    }
  }
  return total;
}

/**
 * Count authored documentation pages (.mdx and .md) under the
 * witnessops docs root.
 *
 * When `rootDir` is omitted, the helper tries the monorepo-relative
 * path first (`<cwd>/content/witnessops/docs`, which works when the
 * cwd is the workspace root) and then the package-relative path
 * (`<cwd>/../../content/witnessops/docs`, which works when the cwd
 * is `apps/witnessops-web`, the path used by both `next dev` /
 * `next start` and `pnpm test`). Whichever first lookup yields a
 * non-zero count wins.
 */
export async function countDocsPages(rootDir?: string): Promise<number> {
  if (rootDir) return countFilesByExtension(rootDir, DOC_EXTENSIONS);

  const monorepoRelative = path.resolve(
    process.cwd(),
    "content",
    "witnessops",
    "docs",
  );
  const monorepoCount = await countFilesByExtension(
    monorepoRelative,
    DOC_EXTENSIONS,
  );
  if (monorepoCount > 0) return monorepoCount;

  const packageRelative = path.resolve(
    process.cwd(),
    "..",
    "..",
    "content",
    "witnessops",
    "docs",
  );
  return countFilesByExtension(packageRelative, DOC_EXTENSIONS);
}

/**
 * Count generated audio files (.mp3, .m4a, .wav) under the public
 * audio root. Default root resolves to
 * `<cwd>/apps/witnessops-web/public/audio` if invoked from a
 * monorepo-root cwd, or `<cwd>/public/audio` if invoked from the
 * package root. The function tries the package-relative path first,
 * then falls back to the monorepo-relative path.
 */
export async function countAudioFiles(rootDir?: string): Promise<number> {
  if (rootDir) return countFilesByExtension(rootDir, AUDIO_EXTENSIONS);

  // Package-relative first (covers `next dev` / `next start` running
  // inside apps/witnessops-web).
  const packageRelative = path.resolve(process.cwd(), "public", "audio");
  const packageRelativeCount = await countFilesByExtension(
    packageRelative,
    AUDIO_EXTENSIONS,
  );
  if (packageRelativeCount > 0) return packageRelativeCount;

  // Monorepo-root fallback (covers tools and scripts that run from
  // the workspace root).
  const monorepoRelative = path.resolve(
    process.cwd(),
    "apps",
    "witnessops-web",
    "public",
    "audio",
  );
  return countFilesByExtension(monorepoRelative, AUDIO_EXTENSIONS);
}

/**
 * Return the public site origin. Reads `NEXT_PUBLIC_OS_SITE_URL` —
 * the same env var the rest of the app already uses for sitemap and
 * canonical URL generation — and falls back to the documented
 * production origin when unset.
 */
export function getPublicSurfaceUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OS_SITE_URL?.trim();
  if (fromEnv) return fromEnv;
  return PUBLIC_SURFACE_URL_FALLBACK;
}
