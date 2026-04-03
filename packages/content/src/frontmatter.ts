import yaml from "js-yaml";
import { parseContentFrontmatter, type ContentFrontmatter } from "./content";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type ParsedFrontmatterDocument = {
  frontmatter: ContentFrontmatter;
  body: string;
};

export function parseFrontmatterDocument(source: string): ParsedFrontmatterDocument {
  const match = source.match(FRONTMATTER_PATTERN);

  if (!match) {
    throw new Error("Missing required content frontmatter block");
  }

  return {
    frontmatter: parseContentFrontmatter(yaml.load(match[1]), "docs"),
    body: source.slice(match[0].length).trim(),
  };
}