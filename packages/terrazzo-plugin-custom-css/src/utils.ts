import type { GroupOrToken, Token } from "@terrazzo/token-tools";

export function walkGroups(
  item: GroupOrToken | GroupOrToken[] | Record<string, GroupOrToken>,
  callback: (id: string, g: Token) => void,
  path: string[] = [],
) {
  if (Array.isArray(item)) {
    for (const g of item) {
      walkGroups(g, callback, path);
    }
    return;
  }
  if ("$value" in item) {
    callback(path.join("."), item as Token);
  } else {
    for (const key of Object.keys(item)) {
      if (!key.startsWith("$")) {
        path.push(key);
        walkGroups((item as Record<string, GroupOrToken>)[key] as GroupOrToken, callback, path);
        path.pop();
      }
    }
  }
}
