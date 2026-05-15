const store = new Map();
const TTL = 45_000;

export function getCached(key) {
  const hit = store.get(key);
  return hit && Date.now() - hit.ts < TTL ? hit.data : null;
}

export function cached(key, fn) {
  const hit = getCached(key);
  if (hit !== null) return Promise.resolve(hit);
  return fn().then((data) => { store.set(key, { data, ts: Date.now() }); return data; });
}

export function bust(...keys) {
  keys.forEach((k) => store.delete(k));
}
