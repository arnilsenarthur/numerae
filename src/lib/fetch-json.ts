export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; data: T | null }> {
  const response = await fetch(input, init);
  const data = await readJsonResponse<T>(response);
  return { response, data };
}
