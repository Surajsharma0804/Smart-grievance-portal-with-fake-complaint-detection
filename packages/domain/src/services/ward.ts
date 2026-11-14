import { Ward, type IWard } from '../models/ward.js';

/**
 * Look up the ward that contains a GeoJSON point.
 * Returns null if the point falls outside all seeded wards.
 */
export async function findWardForPoint(lng: number, lat: number): Promise<IWard | null> {
  return Ward.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
      },
    },
  });
}
