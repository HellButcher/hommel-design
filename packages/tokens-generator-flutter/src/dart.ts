/** Dart identifier helpers: converts dotted/kebab token ids to Dart-safe names */

const DART_RESERVED = new Set([
  "abstract",
  "as",
  "assert",
  "async",
  "await",
  "base",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "covariant",
  "default",
  "deferred",
  "do",
  "dynamic",
  "else",
  "enum",
  "export",
  "extends",
  "extension",
  "external",
  "factory",
  "false",
  "final",
  "finally",
  "for",
  "Function",
  "get",
  "hide",
  "if",
  "implements",
  "import",
  "in",
  "interface",
  "is",
  "late",
  "library",
  "mixin",
  "new",
  "null",
  "on",
  "operator",
  "part",
  "required",
  "rethrow",
  "return",
  "sealed",
  "set",
  "show",
  "static",
  "super",
  "switch",
  "sync",
  "this",
  "throw",
  "true",
  "try",
  "typedef",
  "var",
  "void",
  "when",
  "while",
  "with",
  "yield",
]);

export function upperFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** splits a token id into name segments, dropping `$root` markers */
function words(id: string): string[] {
  return id
    .split(".")
    .filter((part) => part !== "$root")
    .flatMap((part) => part.split("-"))
    .filter((part) => part.length > 0);
}

function escapeReserved(name: string): string {
  if (name === "") return "value";
  if (DART_RESERVED.has(name) || /^[0-9]/.test(name)) return `${name}$`;
  return name;
}

/** dotted/kebab token id -> dartLowerCamelCase identifier (e.g. `color.action.primary` -> `colorActionPrimary`) */
export function camelCase(id: string): string {
  const parts = words(id);
  return escapeReserved(parts.map((part, i) => (i === 0 ? lowerFirst(part) : upperFirst(part))).join(""));
}

/** dotted/kebab token id (or name) -> DartPascalCase identifier (e.g. `theme` -> `Theme`) */
export function pascalCase(id: string): string {
  const parts = words(id);
  return escapeReserved(parts.map(upperFirst).join(""));
}

/** wraps a naming function to guarantee unique Dart names across the whole generated file */
export function createNameRegistry(nameFn: (id: string) => string): (id: string) => string {
  const usedBy = new Map<string, string>();
  const nameById = new Map<string, string>();
  return (id: string): string => {
    const existing = nameById.get(id);
    if (existing !== undefined) return existing;
    const base = nameFn(id);
    let name = base;
    for (let i = 2; usedBy.has(name) && usedBy.get(name) !== id; i++) name = `${base}_${i}`;
    usedBy.set(name, id);
    nameById.set(id, name);
    return name;
  };
}

/** Dart double-quoted string literal */
export function dartString(value: string): string {
  return JSON.stringify(value);
}

/** formats a number as a Dart `double` literal (always has a decimal point) */
export function dartDouble(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/** formats a number as a Dart `int` literal */
export function dartInt(value: number): string {
  return String(Math.round(value));
}
