export function safeJsonFormat(text: string, indent?: number): string {
  const maxSafeInt = String(Number.MAX_SAFE_INTEGER);
  const minSafeInt = String(-Number.MAX_SAFE_INTEGER);
  const largeInts = new Map<string, string>();
  const placeholderPrefix = '"__DBX_BIGINT_';

  const shouldProtectNumber = (digits: string) => {
    const integerPart = digits.split(".")[0] ?? digits;
    const isNegative = integerPart.startsWith("-");
    const absInteger = isNegative ? integerPart.slice(1) : integerPart;
    const threshold = isNegative ? minSafeInt.slice(1) : maxSafeInt;
    if (absInteger.length < threshold.length) return false;
    if (absInteger.length === threshold.length && absInteger <= threshold) return false;
    return true;
  };

  let replaced = "";
  let index = 0;
  let inString = false;
  let escaped = false;
  while (index < text.length) {
    const char = text[index];

    if (inString) {
      replaced += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      replaced += char;
      index += 1;
      continue;
    }

    const match = /^-?\d{16,}(?:\.\d+)?/.exec(text.slice(index));
    if (match) {
      const digits = match[0];
      const previous = previousNonWhitespace(text, index);
      const next = nextNonWhitespace(text, index + digits.length);
      const validBoundary = (!previous || previous === ":" || previous === "[" || previous === ",") && (!next || next === "," || next === "]" || next === "}");
      if (validBoundary && shouldProtectNumber(digits)) {
        const key = String(largeInts.size);
        largeInts.set(key, digits);
        replaced += `${placeholderPrefix}${key}"`;
        index += digits.length;
        continue;
      }
    }

    replaced += char;
    index += 1;
  }

  const parsed = JSON.parse(replaced);
  let result = JSON.stringify(parsed, null, indent ?? undefined);

  for (const [key, digits] of largeInts) {
    result = result.replace(`${placeholderPrefix}${key}"`, digits);
  }

  return result;
}

function previousNonWhitespace(text: string, index: number): string | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!/\s/.test(text[cursor])) return text[cursor];
  }
  return undefined;
}

function nextNonWhitespace(text: string, index: number): string | undefined {
  for (let cursor = index; cursor < text.length; cursor += 1) {
    if (!/\s/.test(text[cursor])) return text[cursor];
  }
  return undefined;
}
