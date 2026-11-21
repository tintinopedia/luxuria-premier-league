import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export function youtubeId(url = '') {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export function videoThumb(v) {
  if (v.thumbnail) return v.thumbnail;
  const id = youtubeId(v.url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
export async function uploadFile(path, file) {
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}
export const safeName = (f) => `${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`;
