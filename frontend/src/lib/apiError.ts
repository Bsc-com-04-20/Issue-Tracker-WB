/** Nest / validation error body from failed API calls. */
export async function readApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const j = (await res.json()) as {
      message?: string | string[];
      error?: string;
    };
    const m = j.message;
    if (Array.isArray(m)) {
      return m.join('. ');
    }
    if (typeof m === 'string' && m.trim()) {
      return m;
    }
    if (typeof j.error === 'string' && j.error.trim()) {
      return j.error;
    }
  } catch {
    // ignore parse errors
  }
  return `${fallback} (HTTP ${res.status})`;
}
