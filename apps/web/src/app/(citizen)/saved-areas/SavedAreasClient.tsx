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
  { value: 'SANITATION', label: 'Sanitation' },
  { value: 'ROADS', label: 'Roads' },
  { value: 'WATER', label: 'Water' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'STREET_LIGHTING', label: 'Street Lighting' },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Watch Areas & Notifications</h1>
        <p className="text-gray-600 mt-1">
          Monitor civic activity near your home, workplace, or transit routes and configure alert channels.
        </p>
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {deleteError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 cols: Saved Areas List & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Your Saved Areas ({initialAreas.length}/5)
            </h2>

            {initialAreas.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No watch areas saved yet. Add an area below to stay updated on grievances filed in your neighborhood.
              </p>
            ) : (
              <div className="divide-y">
                {initialAreas.map((area) => (
                  <div key={area.id} className="py-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{area.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Center: {area.lat.toFixed(5)}, {area.lng.toFixed(5)} • Radius: {area.radiusM}m
                      </p>
                      {area.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {area.categories.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
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
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 px-2 py-1 border border-red-200 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Saved Area Form */}
          {initialAreas.length < 5 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">Add New Watch Area</h2>

              {createState.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                  {createState.error}
                </div>
              )}

              <form action={createAction} className="space-y-4">
                <input type="hidden" name="lng" value={location?.lng ?? ''} />
                <input type="hidden" name="lat" value={location?.lat ?? ''} />
                <input type="hidden" name="categories" value={selectedCategories.join(',')} />

                <div>
                  <label htmlFor="label" className="block text-sm font-medium mb-1">
                    Area Name / Label
                  </label>
                  <input
                    id="label"
                    name="label"
                    type="text"
                    required
                    maxLength={50}
                    placeholder="e.g. Home, Sector 17, Office"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {createState.fieldErrors?.label && (
                    <p className="text-xs text-red-600 mt-1">{createState.fieldErrors.label}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Center Coordinates</label>
                    {location ? (
                      <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="text-xs px-3 py-2 border rounded hover:bg-gray-50 text-gray-700 w-full"
                      >
                        Use current location
                      </button>
                    )}
                    {createState.fieldErrors?.['center.coordinates'] && (
                      <p className="text-xs text-red-600 mt-1">Location coordinates required.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="radiusM" className="block text-sm font-medium mb-1">
                      Radius
                    </label>
                    <select
                      id="radiusM"
                      name="radiusM"
                      defaultValue="1000"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="500">500 meters (Block level)</option>
                      <option value="1000">1 kilometer (Neighborhood)</option>
                      <option value="2000">2 kilometers (Sector)</option>
                      <option value="5000">5 kilometers (Ward)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Filter by Categories (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          selectedCategories.includes(cat.value)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createPending || !location}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {createPending ? 'Saving...' : 'Save Watch Area'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right col: Notification Preferences */}
        <div className="bg-white border rounded-lg p-6 h-fit space-y-4">
          <h2 className="text-lg font-semibold">Notification Preferences</h2>

          {prefsState.success && (
            <div className="p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200">
              Preferences updated successfully!
            </div>
          )}
          {prefsState.error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {prefsState.error}
            </div>
          )}

          <form action={prefsAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Alert Channels</label>
              <div className="flex items-center gap-2">
                <input
                  id="channel_inApp"
                  name="channel_inApp"
                  type="checkbox"
                  defaultChecked={initialPrefs.channels.inApp}
                  className="rounded"
                />
                <label htmlFor="channel_inApp" className="text-sm text-gray-700">
                  In-app notifications
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="channel_email"
                  name="channel_email"
                  type="checkbox"
                  defaultChecked={initialPrefs.channels.email}
                  className="rounded"
                />
                <label htmlFor="channel_email" className="text-sm text-gray-700">
                  Email digests & updates
                </label>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium block">Quiet Hours</label>
              <div className="flex items-center gap-2">
                <input
                  id="quietHours_enabled"
                  name="quietHours_enabled"
                  type="checkbox"
                  defaultChecked={initialPrefs.quietHours.enabled}
                  className="rounded"
                />
                <label htmlFor="quietHours_enabled" className="text-sm text-gray-700">
                  Silence alerts during night
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block mb-1">From</span>
                  <input
                    type="time"
                    name="quietHours_start"
                    defaultValue={initialPrefs.quietHours.start}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">To</span>
                  <input
                    type="time"
                    name="quietHours_end"
                    defaultValue={initialPrefs.quietHours.end}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label htmlFor="language" className="text-sm font-medium block">
                Preferred Language
              </label>
              <select
                id="language"
                name="language"
                defaultValue={initialPrefs.language}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={prefsPending}
              className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {prefsPending ? 'Updating...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
