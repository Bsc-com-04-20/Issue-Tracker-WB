export type RecentComplaint = {
  issueRef: string;
  reporterPhone: string;
  createdAt: string;
  category?: string;
};

const STORAGE_KEY = 'mwb_recent_complaints';
const MAX_ITEMS = 10;

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getRecentComplaints(): RecentComplaint[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentComplaint[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.issueRef === 'string' &&
          typeof x.reporterPhone === 'string' &&
          typeof x.createdAt === 'string',
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function rememberComplaint(entry: RecentComplaint): void {
  const storage = safeStorage();
  if (!storage) return;
  const current = getRecentComplaints();
  const deduped = current.filter(
    (x) =>
      !(
        x.issueRef.toUpperCase() === entry.issueRef.toUpperCase() &&
        x.reporterPhone.trim() === entry.reporterPhone.trim()
      ),
  );
  const next = [entry, ...deduped].slice(0, MAX_ITEMS);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
}
