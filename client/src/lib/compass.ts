/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two points using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing from one point to another
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate the angular difference between two bearings
 * Returns the smallest angle between them (0-180 degrees)
 */
export function angleDifference(bearing1: number, bearing2: number): number {
  let diff = Math.abs(bearing1 - bearing2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}
