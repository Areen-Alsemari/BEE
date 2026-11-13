
export class DataError extends Error {
  constructor(
    public file: string,
    public detail: string,
  ) {
    super(`${file}: ${detail}`);
  }
}

type Kind = "string" | "number" | "boolean" | "object" | "array" | "number|null" | "string|null" | "any";

function kindOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function matches(v: unknown, kind: Kind): boolean {
  if (kind === "any") return v !== undefined;
  return kind.split("|").some((k) => kindOf(v) === k);
}

export function expectFields(file: string, obj: unknown, spec: Record<string, Kind>, where = ""): void {
  if (obj === null || typeof obj !== "object") throw new DataError(file, `${where || "root"} is not an object`);
  const o = obj as Record<string, unknown>;
  for (const [key, kind] of Object.entries(spec)) {
    if (!(key in o)) throw new DataError(file, `missing field "${where}${key}"`);
    if (!matches(o[key], kind))
      throw new DataError(file, `field "${where}${key}" should be ${kind}, got ${kindOf(o[key])}`);
  }
}

export function columnIndex<K extends string>(file: string, header: unknown, names: readonly K[]): Record<K, number> {
  if (!Array.isArray(header)) throw new DataError(file, "column header is not an array");
  const out = {} as Record<K, number>;
  for (const n of names) {
    const i = header.indexOf(n);
    if (i < 0) throw new DataError(file, `missing column "${n}"`);
    out[n] = i;
  }
  return out;
}
