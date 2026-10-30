import { appendFileSync } from 'node:fs';

const payloadRaw = process.env.INPUT_PAYLOAD;
const outputPath = process.env.GITHUB_OUTPUT;

const stableStringify = (value) => {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid JSON number');
    return String(value);
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t !== 'object') throw new Error('Invalid JSON value');

  if (Array.isArray(value)) {
    let out = '[';
    for (let i = 0; i < value.length; i++) {
      if (i) out += ',';
      out += stableStringify(value[i]);
    }
    out += ']';
    return out;
  }

  const keys = Object.keys(value).sort();
  let out = '{';
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = value[k];
    if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
      throw new Error('Invalid JSON object value');
    }
    if (i) out += ',';
    out += JSON.stringify(k) + ':' + stableStringify(v);
  }
  out += '}';
  return out;
};

const cloneJson = (value) => {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    if (t === 'number' && !Number.isFinite(value)) throw new Error('Invalid JSON number');
    return value;
  }
  if (t !== 'object') throw new Error('Invalid JSON value');
  if (Array.isArray(value)) {
    const arr = new Array(value.length);
    for (let i = 0; i < value.length; i++) arr[i] = cloneJson(value[i]);
    return arr;
  }
  const out = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = value[k];
    if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
      throw new Error('Invalid JSON object value');
    }
    out[k] = cloneJson(v);
  }
  return out;
};

try {
  const payload = JSON.parse(payloadRaw);
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    !Object.prototype.hasOwnProperty.call(payload, 'values') ||
    !Array.isArray(payload.values)
  ) {
    throw new Error('Invalid input');
  }

  const values = payload.values;
  const seen = new Set();
  const unique = [];

  for (let i = 0; i < values.length; i++) {
    const item = cloneJson(values[i]);
    const key = stableStringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const result = { unique, removed: values.length - unique.length };
  appendFileSync(outputPath, `result=${JSON.stringify(result)}\n`);
} catch (e) {
  throw new Error(e && e.message ? e.message : 'Action failed');
}