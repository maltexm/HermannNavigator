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

    // Request permission for iOS 13+
    if ('DeviceOrientationEvent' in window && 'requestPermission' in DeviceOrientationEvent) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            startListening();
          } else {
            console.warn('Device orientation permission denied');
          }
        })
        .catch((error: any) => {
          console.error('Device orientation permission error:', error);
          // Try to listen anyway for older browsers
          startListening();
        });
    } else {
      // For non-iOS or older browsers
      startListening();
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return state;
}
