import { apiFetch } from '@/lib/api';

export async function downloadAuthorizedFile(
  path: string,
  suggestedName: string,
): Promise<void> {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error('Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
}
