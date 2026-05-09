import type {
  DocsAssistantCitation,
  DocsAssistantFileSearchSupports,
} from "./answer-contract";
import {
  DOCS_ASSISTANT_COLLECTED_CORPUS_FILE_ID,
  DOCS_ASSISTANT_CORPUS_PLAN_FILE_ID,
  DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
} from "./runtime-config";

export interface DocsAssistantFileSearchResult {
  index?: number;
  file_id?: string;
  filename?: string;
  score?: number;
  text?: string;
  text_excerpt?: string;
}

export interface DocsAssistantCitationNormalizationResult {
  citations: DocsAssistantCitation[];
  boundary_findings: string[];
}

interface ApprovedFileSearchSource {
  filename: string;
  sourceArtifact: string;
  supports: DocsAssistantFileSearchSupports;
  sourceBodiesCollected: boolean;
  sourceBodiesUploaded: boolean;
  citationPrefix: string;
}

const APPROVED_FILE_SEARCH_SOURCES: Record<string, ApprovedFileSearchSource> = {
  [DOCS_ASSISTANT_COLLECTED_CORPUS_FILE_ID]: {
    filename: "CORPUS_PACKAGE.json",
    sourceArtifact: "CORPUS_PACKAGE.json",
    supports: "collected_source_corpus_package",
    sourceBodiesCollected: true,
    sourceBodiesUploaded: true,
    citationPrefix: "src-collected-corpus",
  },
  [DOCS_ASSISTANT_CORPUS_PLAN_FILE_ID]: {
    filename: "CORPUS_PLAN.json",
    sourceArtifact: "CORPUS_PLAN.json",
    supports: "corpus_plan_record_only",
    sourceBodiesCollected: false,
    sourceBodiesUploaded: false,
    citationPrefix: "src-corpus-plan",
  },
};

function safeCaseId(caseId: string | null | undefined): string {
  const safe = caseId?.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return safe || "runtime";
}

export function normalizeFileSearchCitations(args: {
  caseId?: string | null;
  vectorStoreId?: string;
  results: DocsAssistantFileSearchResult[];
}): DocsAssistantCitationNormalizationResult {
  const boundaryFindings: string[] = [];
  const citations: DocsAssistantCitation[] = [];
  const vectorStoreId = args.vectorStoreId ?? DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID;

  for (const [position, result] of args.results.entries()) {
    const fileId = result.file_id;
    if (!fileId) {
      boundaryFindings.push(`file_search_result_missing_file_id:${position}`);
      continue;
    }

    const source = APPROVED_FILE_SEARCH_SOURCES[fileId];
    if (!source) {
      boundaryFindings.push(`unexpected_file_search_result_file_id:${fileId}`);
      continue;
    }

    if (result.filename && result.filename !== source.filename) {
      boundaryFindings.push(`file_search_result_filename_mismatch:${fileId}`);
      continue;
    }

    const retrievedResultIndex =
      typeof result.index === "number" ? result.index : position;

    citations.push({
      citation_id: `${source.citationPrefix}-${safeCaseId(args.caseId)}-${retrievedResultIndex}`,
      source_type: "openai_file_search_result",
      source_file_id: fileId,
      filename: source.filename,
      source_artifact: source.sourceArtifact,
      vector_store_id: vectorStoreId,
      retrieved_result_index: retrievedResultIndex,
      supports: source.supports,
      source_bodies_collected: source.sourceBodiesCollected,
      source_bodies_uploaded: source.sourceBodiesUploaded,
    });
  }

  return {
    citations,
    boundary_findings: boundaryFindings,
  };
}

export function extractFileSearchResultsFromResponse(
  response: unknown,
): DocsAssistantFileSearchResult[] {
  if (!response || typeof response !== "object") {
    return [];
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return [];
  }

  const results: DocsAssistantFileSearchResult[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const typedItem = item as { type?: unknown; results?: unknown };
    if (typedItem.type !== "file_search_call" || !Array.isArray(typedItem.results)) {
      continue;
    }

    for (const [index, result] of typedItem.results.entries()) {
      if (!result || typeof result !== "object") {
        continue;
      }

      const typedResult = result as DocsAssistantFileSearchResult;
      results.push({
        ...typedResult,
        index: typeof typedResult.index === "number" ? typedResult.index : index,
      });
    }
  }

  return results;
}
