// witnessops-jcs 1.0.0
// Bounded RFC 8785 JSON Canonicalization Scheme implementation for JSON data.

function assertValidString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error("jcs_invalid_lone_high_surrogate");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error("jcs_invalid_lone_low_surrogate");
    }
  }
}

function serialize(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";

  if (typeof value === "string") {
    assertValidString(value);
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("jcs_non_finite_number");
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => serialize(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("jcs_non_plain_object");
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => {
      assertValidString(key);
      const item = value[key];
      if (item === undefined || typeof item === "function" || typeof item === "symbol") {
        throw new Error(`jcs_unsupported_value:${key}`);
      }
      return `${JSON.stringify(key)}:${serialize(item)}`;
    }).join(",")}}`;
  }

  throw new Error(`jcs_unsupported_type:${typeof value}`);
}

export function canonicalize(value) {
  return Buffer.from(serialize(value), "utf8");
}

export function selfTest() {
  const sample = {
    numbers: [333333333.33333329, 1e30, 4.50, 2e-3, 1e-27],
    string: "€$\u000f\nA'B\"\\\"/",
    literals: [null, true, false],
  };
  const expected = "{\"literals\":[null,true,false],\"numbers\":[333333333.3333333,1e+30,4.5,0.002,1e-27],\"string\":\"€$\\u000f\\nA'B\\\"\\\\\\\"/\"}";
  const actual = canonicalize(sample).toString("utf8");
  if (actual !== expected) {
    throw new Error(`jcs_rfc8785_vector_failed:${actual}`);
  }
  const ordering = canonicalize({ "\u20ac": 1, "\r": 2, "\ufb33": 3, "1": 4, "😀": 5, "\u0080": 6, "ö": 7 }).toString("utf8");
  const expectedOrdering = "{\"\\r\":2,\"1\":4,\"\u0080\":6,\"ö\":7,\"€\":1,\"😀\":5,\"דּ\":3}";
  if (ordering !== expectedOrdering) {
    throw new Error(`jcs_property_order_vector_failed:${ordering}`);
  }
  return true;
}

export const TOOL_NAME = "witnessops-jcs";
export const TOOL_VERSION = "1.0.0";
