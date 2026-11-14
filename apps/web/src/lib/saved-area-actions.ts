'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from './auth-actions';
import { connectDB } from './db';
import { SavedArea, type ISavedArea } from './models/saved-area';
import { NotificationPrefs } from './models/notification-prefs';
import { savedAreaCreateSchema, notificationPrefsSchema } from '@nagrik-setu/shared';

const MAX_SAVED_AREAS = 5;

export interface SavedAreaState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export interface SerializedSavedArea {
  id: string;
  label: string;
  lng: number;
  lat: number;
  radiusM: number;
  categories: string[];
  createdAt: string;
}

export interface SerializedNotificationPrefs {
  channels: {
    inApp: boolean;
    email: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  language: 'en' | 'hi';
}

export async function getSavedAreas(): Promise<SerializedSavedArea[]> {
  const session = await getSession();
  if (!session) return [];

  await connectDB();
  const docs = await SavedArea.find({ userId: session.user.id }).sort({ createdAt: -1 });

  return docs.map((doc: ISavedArea) => ({
    id: doc._id.toString(),
    label: doc.label,
    lng: doc.center.coordinates[0]!,
    lat: doc.center.coordinates[1]!,
    radiusM: doc.radiusM,
    categories: doc.categories,
    createdAt: doc.createdAt.toISOString(),
  }));
}

export async function createSavedAreaAction(
  _prev: SavedAreaState,
  formData: FormData,
): Promise<SavedAreaState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Authentication required' };
  }

  const raw = {
    label: formData.get('label') as string,
    center: {
      type: 'Point' as const,
      coordinates: [
        parseFloat(formData.get('lng') as string),
        parseFloat(formData.get('lat') as string),
      ] as [number, number],
    },
    radiusM: parseInt(formData.get('radiusM') as string, 10) || 1000,
    categories: (formData.get('categories') as string)?.split(',').filter(Boolean) ?? [],
  };

  const parsed = savedAreaCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { fieldErrors };
  }

  await connectDB();

  const count = await SavedArea.countDocuments({ userId: session.user.id });
  if (count >= MAX_SAVED_AREAS) {
    return { error: `You have reached the maximum limit of ${MAX_SAVED_AREAS} saved areas.` };
  }

  await SavedArea.create({
    userId: session.user.id,
    label: parsed.data.label,
    center: parsed.data.center,
    radiusM: parsed.data.radiusM,
    categories: parsed.data.categories,
  });

  revalidatePath('/saved-areas');
  return { success: true };
}

export async function deleteSavedAreaAction(areaId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Authentication required' };

  await connectDB();
  const res = await SavedArea.deleteOne({ _id: areaId, userId: session.user.id });
  if (res.deletedCount === 0) {
    return { success: false, error: 'Saved area not found or unauthorized' };
  }

  revalidatePath('/saved-areas');
  return { success: true };
}

export async function getNotificationPrefs(): Promise<SerializedNotificationPrefs> {
  const defaultPrefs: SerializedNotificationPrefs = {
    channels: { inApp: true, email: true },
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    language: 'en',
  };

  const session = await getSession();
  if (!session) return defaultPrefs;

  await connectDB();
  const doc = await NotificationPrefs.findOne({ userId: session.user.id });
  if (!doc) return defaultPrefs;

  return {
    channels: doc.channels,
    quietHours: doc.quietHours,
    language: doc.language,
  };
}

export async function updateNotificationPrefsAction(
  _prev: SavedAreaState,
  formData: FormData,
): Promise<SavedAreaState> {
  const session = await getSession();
  if (!session) return { error: 'Authentication required' };

  const raw = {
    channels: {
      inApp: formData.get('channel_inApp') === 'on',
      email: formData.get('channel_email') === 'on',
    },
    quietHours: {
      enabled: formData.get('quietHours_enabled') === 'on',
      start: (formData.get('quietHours_start') as string) || '22:00',
      end: (formData.get('quietHours_end') as string) || '07:00',
    },
    language: (formData.get('language') as 'en' | 'hi') || 'en',
  };

  const parsed = notificationPrefsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'Invalid notification preferences' };
  }

  await connectDB();
  await NotificationPrefs.findOneAndUpdate(
    { userId: session.user.id },
    { $set: parsed.data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  revalidatePath('/saved-areas');
  return { success: true };
}
