import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-actions';
import { getSavedAreas, getNotificationPrefs } from '@/lib/saved-area-actions';
import { SavedAreasClient } from './SavedAreasClient';

export const metadata = {
  title: 'Watch Areas & Notifications | Nagrik Setu',
  description: 'Manage citizen saved watch areas and alert preferences.',
};

export default async function SavedAreasPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const [areas, prefs] = await Promise.all([
    getSavedAreas(),
    getNotificationPrefs(),
  ]);

  return <SavedAreasClient initialAreas={areas} initialPrefs={prefs} />;
}
