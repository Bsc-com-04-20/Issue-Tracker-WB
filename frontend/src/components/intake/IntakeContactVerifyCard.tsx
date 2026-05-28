type Props = {
  editPhone: string;
  setEditPhone: (v: string) => void;
  editAddr: string;
  setEditAddr: (v: string) => void;
  editLat: string;
  setEditLat: (v: string) => void;
  editLng: string;
  setEditLng: (v: string) => void;
  busy: boolean;
  intelMsg: string | null;
  intelError: string | null;
  onSave: () => void;
  onRefresh: () => void;
  canEdit: boolean;
};

export function IntakeContactVerifyCard({
  editPhone,
  setEditPhone,
  editAddr,
  setEditAddr,
  editLat,
  setEditLat,
  editLng,
  setEditLng,
  busy,
  intelMsg,
  intelError,
  onSave,
  onRefresh,
  canEdit,
}: Props) {
  if (!canEdit) {
    return (
      <p className="text-sm text-slate-600">
        This ticket is past the intake stage — contact details can no longer be edited
        here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Fix the caller&apos;s phone or map pin if they gave the wrong details. Saving
        re-checks for duplicate tickets automatically.
      </p>
      <label className="block text-sm font-medium text-slate-700">
        Phone number
        <input
          type="tel"
          value={editPhone}
          onChange={(e) => setEditPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          placeholder="+265…"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Address description
        <input
          value={editAddr}
          onChange={(e) => setEditAddr(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          placeholder="Landmark, area, street…"
        />
      </label>
      <details className="rounded-lg border border-slate-200 bg-slate-50/80">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
          Adjust map coordinates (optional)
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Latitude
            <input
              value={editLat}
              onChange={(e) => setEditLat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Longitude
            <input
              value={editLng}
              onChange={(e) => setEditLng(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </details>
      {intelError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {intelError}
        </p>
      ) : null}
      {intelMsg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {intelMsg}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save & check duplicates'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Re-check only
        </button>
      </div>
    </div>
  );
}
