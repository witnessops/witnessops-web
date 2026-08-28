import { getSkillVersion, readSkillBytes } from "@/lib/skills/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; version: string }> },
) {
  const { slug, version } = await context.params;
  const skill = getSkillVersion(slug, version);
  if (!skill?.conformance) return new Response("Not found", { status: 404 });
  const bytes = readSkillBytes(slug, version);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `attachment; filename="${skill.slug}-v${skill.version}-SKILL.md"`,
      "Content-Length": String(bytes.byteLength),
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-SHA256": skill.sha256,
    },
  });
}
