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

  function parseArray(): string | null {
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return null;
    }

    while (index < source.length) {
      const duplicateKey = parseValue();
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

  function parseObject(): string | null {
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

      const duplicateKey = parseValue();
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

  function parseValue(): string | null {
    skipWhitespace();
    const char = source[index];
    if (char === "{") {
      return parseObject();
    }
    if (char === "[") {
      return parseArray();
    }
    if (char === "\"") {
      readJsonString();
      return null;
    }
    skipPrimitive();
    return null;
  }

  try {
    return parseValue();
  } catch {
    return null;
  }
}
