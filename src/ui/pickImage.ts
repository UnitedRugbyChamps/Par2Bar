import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { backend } from '@/backend';

/** Lets the user choose a photo, shrinks it, uploads it and returns its URL (or null if cancelled). */
export async function pickAndUpload(uid: string, opts: { aspect?: [number, number]; width?: number } = {}): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!opts.aspect,
    aspect: opts.aspect,
    quality: 1,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const width = Math.min(opts.width ?? 1080, a.width || opts.width || 1080);
  const ctx = ImageManipulator.ImageManipulator.manipulate(a.uri).resize({ width });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!out.base64) return null;
  return backend.uploadImage(uid, `data:image/jpeg;base64,${out.base64}`);
}
