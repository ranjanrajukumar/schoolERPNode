import { useEffect, useRef, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../services/api.js';

const MAX = 1024 * 1024;

/** Shrinks a large photo (longest side 1280 px, JPEG) so a phone picture fits the 1 MB limit. Small ones are kept as they are. */
async function fit(file) {
  if (file.size <= 300 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Saves a picked photo for a record that now exists. Forms call this after their own save returns the new id. */
export const savePhoto = (entity, id, file) =>
  uploadFile(`/photos/${entity}/${id}?name=${encodeURIComponent(file.name)}`, file, 'PUT');

/**
 * A photo with Change / Remove buttons. Saved records upload straight away; for a new record (no id yet) the picked
 * file is handed to the form through onPick, which saves it once the record exists.
 */
export default function PhotoField({ entity, id, label = 'Photo', picked, onPick, canEdit = true }) {
  const [stored, setStored] = useState(null); // object URL of the saved photo
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!id && id !== 0) {
      setStored(null);
      return undefined;
    }
    let url;
    let cancelled = false;
    fetchBlob(`/photos/${entity}/${id}`)
      .then((b) => {
        if (!cancelled) {
          url = URL.createObjectURL(b);
          setStored(url);
        }
      })
      .catch(() => {
        if (!cancelled) setStored(null);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [entity, id, version]);
  useEffect(() => {
    if (!picked) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(picked);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const choose = async (e) => {
    const picked0 = e.target.files?.[0];
    e.target.value = '';
    if (!picked0) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked0.type))
      return setError('Choose a JPEG, PNG or WebP image.');
    const file = await fit(picked0);
    if (file.size > MAX)
      return setError('The photo is still over 1 MB after shrinking; choose a smaller one.');
    if (!id && id !== 0) return onPick?.(file);
    setBusy(true);
    try {
      await savePhoto(entity, id, file);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setError('');
    if (picked) return onPick?.(null);
    setBusy(true);
    try {
      await api(`/photos/${entity}/${id}`, { method: 'DELETE' });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const src = previewUrl || stored;
  return (
    <div className="photo-field">
      {src ? (
        <img src={src} alt={label} className="photo-field-img" />
      ) : (
        <div className="photo-field-img empty" aria-hidden="true">
          No photo
        </div>
      )}
      <div className="photo-field-actions">
        <strong>{label}</strong>
        <small>JPEG, PNG or WebP. Large photos are shrunk automatically. Saved in the database.</small>
        {canEdit && (
          <span>
            <button type="button" className="ghost" onClick={() => input.current?.click()} disabled={busy}>
              {src ? 'Change photo' : 'Upload photo'}
            </button>
            {src && (
              <button type="button" className="ghost danger" onClick={remove} disabled={busy}>
                Remove
              </button>
            )}
          </span>
        )}
        {error && (
          <small className="error" role="alert">
            {error}
          </small>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} hidden />
      </div>
    </div>
  );
}
