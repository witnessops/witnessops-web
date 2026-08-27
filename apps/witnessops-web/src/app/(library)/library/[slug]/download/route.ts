import { getSkill, readSkillBytes } from "@/lib/skills/catalog";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const skill = getSkill(slug);
  if (!skill) return new Response("Not found", { status: 404 });
  const bytes = readSkillBytes(slug);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Content-Disposition": `attachment; filename="${skill.slug}-v${skill.version}-SKILL.md"`,
      "Content-Length": String(bytes.byteLength),
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-SHA256": skill.sha256,
    },
  });
}
