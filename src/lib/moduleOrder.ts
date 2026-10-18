/**
 * Per-session module order. Every session used to follow the one global
 * order in the modules table; a session can now carry its own order
 * (sessions.module_order, a list of module keys). Sessions without one keep
 * the global order exactly as before.
 *
 * The rest of the app only ever compares modules' sort_order against each
 * other and against the session's active module, so the order is applied once,
 * where the modules are loaded: this returns the modules sorted for the
 * session with sort_order rewritten to the position in that order. Modules not
 * named in the list (e.g. added after the session was created) follow the
 * listed ones in their global order.
 */
export function orderModulesForSession<T extends { key: string; sort_order: number }>(
  modules: T[],
  moduleOrder: string[] | null | undefined,
): T[] {
  const global = [...modules].sort((a, b) => a.sort_order - b.sort_order);
  if (!moduleOrder || moduleOrder.length === 0) return global;
  const position = new Map(moduleOrder.map((key, i) => [key, i]));
  const listed = global.filter((m) => position.has(m.key)).sort((a, b) => (position.get(a.key) ?? 0) - (position.get(b.key) ?? 0));
  const unlisted = global.filter((m) => !position.has(m.key));
  return [...listed, ...unlisted].map((m, i) => ({ ...m, sort_order: i + 1 }));
}

/** Spec warning: Architecture's recommendation is calculated from Delegation
 * and Investment, so it needs both to come first. Returns plain-English
 * warnings for the session form (never blocks saving). */
export function architectureOrderWarnings(
  orderedKeys: string[],
  enabledKeys: Set<string>,
): string[] {
  if (!enabledKeys.has("architecture")) return [];
  const warnings: string[] = [];
  const index = (key: string) => orderedKeys.indexOf(key);
  const need: [string, string][] = [
    ["delegation", "Delegation"],
    ["current_structure", "Investment"],
  ];
  for (const [key, name] of need) {
    if (!enabledKeys.has(key)) {
      warnings.push(`Architecture is on but ${name} is off -- Architecture's recommendation is calculated from ${name}, so it will have less to work from.`);
    } else if (index("architecture") < index(key)) {
      warnings.push(`Architecture comes before ${name} -- its recommendation is calculated from ${name}, so participants won't have that answer yet.`);
    }
  }
  return warnings;
}
