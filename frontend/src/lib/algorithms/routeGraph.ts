/** Sample delivery graph from the delivery-route walkthrough. Distances are kilometres. */

export const ROUTE_VERTICES = ['Hub', 'North', 'East', 'South', 'Juan', 'West'] as const;

export type RouteStop = (typeof ROUTE_VERTICES)[number];

export const ROUTE_EDGES: readonly [RouteStop, RouteStop, number][] = [
  ['Hub', 'North', 1.2],
  ['North', 'East', 1.3],
  ['Hub', 'West', 1.1],
  ['West', 'Juan', 1.4],
  ['Juan', 'South', 1.2],
  ['East', 'South', 1.5],
  ['North', 'Juan', 2.4],
  ['Hub', 'Juan', 3.1],
  ['West', 'South', 3.2],
  ['East', 'Juan', 2.1],
];

const DESTINATION: Record<string, RouteStop> = {
  juan: 'Juan',
  maria: 'North',
  carlos: 'East',
  ana: 'South',
  mark: 'West',
  rosa: 'East',
  ben: 'North',
  elena: 'West',
};

export interface ShortestRoute {
  path: RouteStop[];
  km: number;
}

function neighbours(): Map<RouteStop, { to: RouteStop; km: number }[]> {
  const map = new Map<RouteStop, { to: RouteStop; km: number }[]>();
  const add = (from: RouteStop, to: RouteStop, km: number) => {
    const list = map.get(from) ?? [];
    list.push({ to, km });
    map.set(from, list);
  };
  for (const [left, right, km] of ROUTE_EDGES) {
    add(left, right, km);
    add(right, left, km);
  }
  return map;
}

const LINKS = neighbours();

export function edgeKm(from: string, to: string) {
  const km = LINKS.get(from as RouteStop)?.find((edge) => edge.to === to)?.km;
  return km ?? null;
}

/** First name on the order picks a vertex. Unknown names still get a stop so a path can be shown. */
export function destinationFor(firstName: string): RouteStop {
  return DESTINATION[firstName.trim().toLowerCase()] ?? 'South';
}

/** Dijkstra on the sample graph. All weights are positive, so the first time `end` is chosen it is final. */
export function shortestPath(start: RouteStop, end: RouteStop): ShortestRoute | null {
  const dist = new Map<RouteStop, number>();
  const prev = new Map<RouteStop, RouteStop | null>();
  for (const stop of ROUTE_VERTICES) {
    dist.set(stop, Number.POSITIVE_INFINITY);
    prev.set(stop, null);
  }
  dist.set(start, 0);
  const unvisited = new Set<RouteStop>(ROUTE_VERTICES);

  while (unvisited.size) {
    let chosen: RouteStop | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const stop of unvisited) {
      const known = dist.get(stop) ?? Number.POSITIVE_INFINITY;
      if (known < best) {
        best = known;
        chosen = stop;
      }
    }
    if (chosen == null || best === Number.POSITIVE_INFINITY) return null;
    if (chosen === end) break;
    unvisited.delete(chosen);
    for (const edge of LINKS.get(chosen) ?? []) {
      if (!unvisited.has(edge.to)) continue;
      const next = best + edge.km;
      if (next < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, next);
        prev.set(edge.to, chosen);
      }
    }
  }

  const path: RouteStop[] = [];
  for (let at: RouteStop | null = end; at; at = prev.get(at) ?? null) path.push(at);
  path.reverse();
  if (path[0] !== start) return null;
  const km = Math.round((dist.get(end) ?? 0) * 10) / 10;
  return { path, km };
}
