const store = new Map();
const TTL = 45_000;

export function cached(key, fn) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data);
  return fn().then((data) => { store.set(key, { data, ts: Date.now() }); return data; });
}

export function bust(...keys) {
  keys.forEach((k) => store.delete(k));
}
