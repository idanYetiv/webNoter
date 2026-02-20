export interface DomainGroup<T> {
  domain: string;
  items: T[];
}

/** Group items with a `url` field by their domain hostname. */
export function groupByDomain<T extends { url: string }>(
  allItems: Record<string, T[]>
): DomainGroup<T>[] {
  const domainMap = new Map<string, T[]>();

  for (const items of Object.values(allItems)) {
    for (const item of items) {
      let domain: string;
      try {
        domain = new URL(item.url).hostname;
      } catch {
        domain = item.url || "Global";
      }
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain)!.push(item);
    }
  }

  return Array.from(domainMap.entries())
    .map(([domain, items]) => ({ domain, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

export interface PathGroup<T> {
  path: string;
  items: T[];
}

export interface DomainHierarchy<T> {
  domain: string;
  paths: PathGroup<T>[];
  totalCount: number;
}

/** Group items by domain then by URL path. */
export function groupByDomainAndPath<T extends { url: string }>(
  allItems: Record<string, T[]>
): DomainHierarchy<T>[] {
  const domainMap = new Map<string, Map<string, T[]>>();

  for (const items of Object.values(allItems)) {
    for (const item of items) {
      let domain: string;
      let path: string;
      try {
        const parsed = new URL(item.url);
        domain = parsed.hostname;
        path = parsed.pathname;
      } catch {
        domain = item.url || "Global";
        path = "/";
      }
      if (!domainMap.has(domain)) domainMap.set(domain, new Map());
      const pathMap = domainMap.get(domain)!;
      if (!pathMap.has(path)) pathMap.set(path, []);
      pathMap.get(path)!.push(item);
    }
  }

  return Array.from(domainMap.entries())
    .map(([domain, pathMap]) => {
      const paths = Array.from(pathMap.entries())
        .map(([path, items]) => ({ path, items }))
        .sort((a, b) => b.items.length - a.items.length);
      return { domain, paths, totalCount: paths.reduce((sum, p) => sum + p.items.length, 0) };
    })
    .sort((a, b) => b.totalCount - a.totalCount);
}
