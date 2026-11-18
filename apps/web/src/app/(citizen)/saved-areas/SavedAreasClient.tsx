'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  createSavedAreaAction,
  deleteSavedAreaAction,
  updateNotificationPrefsAction,
  type SerializedSavedArea,
  type SerializedNotificationPrefs,
} from '@/lib/saved-area-actions';

interface Props {
  initialAreas: SerializedSavedArea[];
  initialPrefs: SerializedNotificationPrefs;
}

const CATEGORIES = [
  { value: 'SANITATION', label: 'Sanitation', icon: '🧹' },
  { value: 'ROADS', label: 'Roads', icon: '🛣️' },
  { value: 'WATER', label: 'Water', icon: '💧' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
  { value: 'TRAFFIC', label: 'Traffic', icon: '🚦' },
  { value: 'STREET_LIGHTING', label: 'Street Lighting', icon: '💡' },
];

export function SavedAreasClient({ initialAreas, initialPrefs }: Props) {
  const [createState, createAction, createPending] = useActionState(createSavedAreaAction, {});
  const [prefsState, prefsAction, prefsPending] = useActionState(updateNotificationPrefsAction, {});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteSavedAreaAction(id);
      if (!res.success && res.error) {
        setDeleteError(res.error);
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Watch Areas & Notifications</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Monitor civic activity near your home, workplace, or transit routes and configure alert channels.
        </p>
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {deleteError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Saved Areas List & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Your Watch Areas
              </h2>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-200">
                {initialAreas.length}/5
              </span>
            </div>

            {initialAreas.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📍</div>
                <p className="text-gray-500 text-sm font-medium">No watch areas saved yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add an area below to stay updated on grievances filed in your neighborhood.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {initialAreas.map((area) => (
                  <div key={area.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:shadow-sm transition-shadow">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>📍</span> {area.label}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-1">
                        {area.lat.toFixed(5)}, {area.lng.toFixed(5)} &bull; {area.radiusM}m radius
                      </p>
                      {area.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {area.categories.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium border border-blue-200"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(area.id)}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Saved Area Form */}
          {initialAreas.length < 5 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Add New Watch Area</h2>
              <p className="text-xs text-gray-400 mb-4">Set up geo-fenced monitoring for a location you care about.</p>

              {createState.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
                  <span>⚠️</span> {createState.error}
                </div>
              )}

              <form action={createAction} className="space-y-4">
                <input type="hidden" name="lng" value={location?.lng ?? ''} />
                <input type="hidden" name="lat" value={location?.lat ?? ''} />
                <input type="hidden" name="categories" value={selectedCategories.join(',')} />

                <div>
                  <label htmlFor="label" className="block text-sm font-semibold text-gray-700 mb-1">
                    Area Name
                  </label>
                  <input
                    id="label"
                    name="label"
                    type="text"
                    required
                    maxLength={50}
                    placeholder="e.g. Home, Sector 17, Office"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {createState.fieldErrors?.label && (
                    <p className="text-xs text-red-600 mt-1">{createState.fieldErrors.label}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Center Location</label>
                    {location ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-xs text-green-700 font-mono">
                          📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </p>
                        <button type="button" onClick={() => setLocation(null)} className="text-[10px] text-gray-400 hover:text-red-500 underline">
                          Reset
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="w-full px-4 py-2.5 border-2 border-dashed border-blue-300 rounded-xl text-xs hover:bg-blue-50 font-medium text-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        📡 Detect My Location
                      </button>
                    )}
                    {createState.fieldErrors?.['center.coordinates'] && (
                      <p className="text-xs text-red-600 mt-1">Location coordinates required.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="radiusM" className="block text-sm font-semibold text-gray-700 mb-1">
                      Radius
                    </label>
                    <select
                      id="radiusM"
                      name="radiusM"
                      defaultValue="1000"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="500">500m (Block level)</option>
                      <option value="1000">1 km (Neighborhood)</option>
                      <option value="2000">2 km (Sector)</option>
                      <option value="5000">5 km (Ward)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category Filters <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                          selectedCategories.includes(cat.value)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createPending || !location}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all"
                >
                  {createPending ? '⏳ Saving...' : '📍 Save Watch Area'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Notification Preferences */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Notification Settings</h2>
            <p className="text-xs text-gray-400 mb-4">Configure how and when you receive alerts.</p>

            {prefsState.success && (
              <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 mb-4 flex items-center gap-2">
                <span>✅</span> Preferences updated successfully!
              </div>
            )}
            {prefsState.error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 mb-4 flex items-center gap-2">
                <span>⚠️</span> {prefsState.error}
              </div>
            )}

            <form action={prefsAction} className="space-y-5">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Alert Channels</label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <input
                    id="channel_inApp"
                    name="channel_inApp"
                    type="checkbox"
                    defaultChecked={initialPrefs.channels.inApp}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">🔔 In-app Alerts</span>
                    <p className="text-[10px] text-gray-400">Get notified inside the portal</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <input
                    id="channel_email"
                    name="channel_email"
                    type="checkbox"
                    defaultChecked={initialPrefs.channels.email}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">📧 Email Digests</span>
                    <p className="text-[10px] text-gray-400">Receive email summaries</p>
                  </div>
                </label>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="text-sm font-semibold text-gray-700 block">🌙 Quiet Hours</label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <input
                    id="quietHours_enabled"
                    name="quietHours_enabled"
                    type="checkbox"
                    defaultChecked={initialPrefs.quietHours.enabled}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Silence alerts at night</span>
                    <p className="text-[10px] text-gray-400">No notifications during quiet hours</p>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 font-semibold block mb-1">From</span>
                    <input
                      type="time"
                      name="quietHours_start"
                      defaultValue={initialPrefs.quietHours.start}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-semibold block mb-1">To</span>
                    <input
                      type="time"
                      name="quietHours_end"
                      defaultValue={initialPrefs.quietHours.end}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                <label htmlFor="language" className="text-sm font-semibold text-gray-700 block">
                  🌐 Preferred Language
                </label>
                <select
                  id="language"
                  name="language"
                  defaultValue={initialPrefs.language}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={prefsPending}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 shadow-sm transition-all"
              >
                {prefsPending ? '⏳ Updating...' : '💾 Save Preferences'}
              </button>
            </form>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">💡 Tips</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                You can save up to 5 watch areas — home, office, school, etc.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                Category filters let you focus on specific issue types.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                Enable quiet hours to avoid late-night notifications.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
