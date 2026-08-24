export const JSON_AMBIGUITY_MAX_DEPTH = 128;

export class JsonAmbiguityScanLimitError extends Error {
  constructor() {
    super(`JSON nesting exceeds the supported depth of ${JSON_AMBIGUITY_MAX_DEPTH}.`);
    this.name = "JsonAmbiguityScanLimitError";
  }
}

export function findDuplicateJsonObjectKey(source: string): string | null {
  let index = 0;

  function skipWhitespace(): void {
    while (/\s/.test(source[index] ?? "")) {
      index += 1;
    }
  }

  function readJsonString(): string {
    const start = index;
    index += 1;
    let escaped = false;

    while (index < source.length) {
      const char = source[index];
      if (escaped) {
        escaped = false;
        index += 1;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        index += 1;
        continue;
      }
      if (char === "\"") {
        index += 1;
        return JSON.parse(source.slice(start, index)) as string;
      }
      index += 1;
    }

    throw new Error("Unterminated JSON string.");
  }

  function skipPrimitive(): void {
    while (index < source.length && !/[,\]}]/.test(source[index] ?? "")) {
      index += 1;
    }
  }

  function parseArray(depth: number): string | null {
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return null;
    }

    while (index < source.length) {
      const duplicateKey = parseValue(depth);
      if (duplicateKey !== null) {
        return duplicateKey;
      }
      skipWhitespace();
      if (source[index] === ",") {
        index += 1;
        continue;
      }
      if (source[index] === "]") {
        index += 1;
        return null;
      }
      return null;
    }

    return null;
  }

  function parseObject(depth: number): string | null {
    index += 1;
    const keys = new Set<string>();
    skipWhitespace();
    if (source[index] === "}") {
      index += 1;
      return null;
    }

    while (index < source.length) {
      skipWhitespace();
      if (source[index] !== "\"") {
        return null;
      }

      const key = readJsonString();
      if (keys.has(key)) {
        return key;
      }
      keys.add(key);

      skipWhitespace();
      if (source[index] !== ":") {
        return null;
      }
      index += 1;

      const duplicateKey = parseValue(depth);
      if (duplicateKey !== null) {
        return duplicateKey;
      }

      skipWhitespace();
      if (source[index] === ",") {
        index += 1;
        continue;
      }
      if (source[index] === "}") {
        index += 1;
        return null;
      }
      return null;
    }

    return null;
  }

  function parseValue(depth: number): string | null {
    skipWhitespace();
    const char = source[index];
    if (char === "{") {
      if (depth >= JSON_AMBIGUITY_MAX_DEPTH) {
        throw new JsonAmbiguityScanLimitError();
      }
      return parseObject(depth + 1);
    }
    if (char === "[") {
      if (depth >= JSON_AMBIGUITY_MAX_DEPTH) {
        throw new JsonAmbiguityScanLimitError();
      }
      return parseArray(depth + 1);
    }
    if (char === "\"") {
      readJsonString();
      return null;
    }
    skipPrimitive();
    return null;
  }

  return parseValue(0);
}
