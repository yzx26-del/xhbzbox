export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  }
  res.end(JSON.stringify(data));
}

export function getEnv(name, res) {
  const value = process.env[name];
  if (!value) {
    send(res, 500, { error: `Missing ${name} environment variable` });
    return null;
  }
  return value;
}

export async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
