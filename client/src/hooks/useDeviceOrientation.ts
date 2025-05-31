import { useState, useEffect } from "react";

interface DeviceOrientationState {
  heading: number | null;
  isSupported: boolean;
}

export function useDeviceOrientation() {
  const [state, setState] = useState<DeviceOrientationState>({
    heading: null,
    isSupported: false,
  });

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) {
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // Prefer webkitCompassHeading on iOS as it represents the actual
      // compass direction. `alpha` can be relative to the device's orientation
      // which results in incorrect values when the screen orientation changes.
      if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
        heading = (event as any).webkitCompassHeading as number;
      } else if (typeof event.alpha === 'number') {
        // `alpha` is 0 at the device facing east and increases clockwise.
        // Convert it to a compass heading where 0 is north.
        heading = (360 - event.alpha) % 360;
      }

      if (heading !== null) {
        // Normalize to 0-360 range
        const normalizedHeading = (heading + 360) % 360;
        setState(prev => ({ ...prev, heading: normalizedHeading }));
      }
    };

    const startListening = () => {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
      window.addEventListener('deviceorientation', handleOrientation);
    };

    // Start listening immediately for most browsers
    startListening();
    
    // For iOS 13+, permission is handled separately when user clicks button
    if ('DeviceOrientationEvent' in window && 'requestPermission' in DeviceOrientationEvent) {
      // Don't auto-request permission, wait for user interaction
      console.log('Device orientation requires permission on this device');
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return state;
}
