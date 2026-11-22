import { useRef, useState } from 'react';
import { api } from '../api.js';
import { Button } from '../ui.jsx';

const MAX = 3;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

function readFiles(files, currentCount) {
  const picked = [...files];
  if (picked.some((f) => !TYPES.includes(f.type))) throw new Error('Only JPEG, PNG or WebP images are supported.');
  if (currentCount + picked.length > MAX) throw new Error(`You can add up to ${MAX} designs.`);
  return Promise.all(picked.map((file) => new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) return reject(new Error('Each image must be under 2 MB.'));
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  })));
}

export function DesignPicker({ value, onChange }) {
  const input = useRef(null);
  const [error, setError] = useState(null);
  const pick = async (e) => {
    setError(null);
    try { onChange([...value, ...await readFiles(e.target.files, value.length)]); }
    catch (err) { setError(err); }
    e.target.value = '';
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={() => input.current?.click()} disabled={value.length >= MAX}>{value.length >= MAX ? '3 designs added' : 'Add designs (max 3)'}</Button>
        <span className="text-sm text-charcoal/70">JPEG, PNG or WebP · up to 2 MB each</span>
        <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={pick} />
      </div>
      {error && <p className="mt-2 text-sm text-red-800" role="alert">{error.message}</p>}
      {value.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{value.map((d, i) => (
        <figure key={`${d.name}-${i}`} className="overflow-hidden rounded-xl border border-ivory-300">
          <img src={d.dataUrl} alt={d.name} className="h-28 w-full object-cover" />
          <figcaption className="flex items-center justify-between gap-2 bg-ivory-200 px-2 py-1 text-xs">
            <span className="truncate">{d.name}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="font-semibold text-red-800">Remove</button>
          </figcaption>
        </figure>
      ))}</div>}
    </div>
  );
}

export function DesignGallery({ measurement, onChanged }) {
  const input = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const designs = measurement.designs || [];
  const upload = async (e) => {
    setError(null); setBusy(true);
    try {
      const files = await readFiles(e.target.files, designs.length);
      await api(`/measurements/${measurement.id}/designs`, { method: 'POST', body: { designs: files } });
      onChanged();
    } catch (err) { setError(err); }
    finally { setBusy(false); e.target.value = ''; }
  };
  const remove = async (design) => {
    setError(null);
    try { await api(`/designs/${design.id}`, { method: 'DELETE' }); onChanged(); }
    catch (err) { setError(err); }
  };
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={() => input.current?.click()} disabled={busy || designs.length >= MAX}>{busy ? 'Uploading...' : designs.length >= MAX ? '3 designs added' : 'Add design images'}</Button>
        <span className="text-sm text-charcoal/70">{designs.length} of {MAX} saved</span>
        <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={upload} />
      </div>
      {error && <p className="mt-2 text-sm text-red-800" role="alert">{error.message}</p>}
      {designs.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{designs.map((d) => (
        <figure key={d.id} className="overflow-hidden rounded-xl border border-ivory-300">
          <img src={`/api/designs/${d.id}`} alt={d.originalName} loading="lazy" className="h-32 w-full object-cover" />
          <figcaption className="flex items-center justify-between gap-2 bg-ivory-200 px-2 py-1 text-xs">
            <span className="truncate">{d.originalName}</span>
            <button type="button" onClick={() => remove(d)} className="font-semibold text-red-800">Remove</button>
          </figcaption>
        </figure>
      ))}</div>}
    </div>
  );
}
