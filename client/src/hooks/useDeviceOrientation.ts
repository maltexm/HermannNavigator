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
      let heading = event.alpha;
      
      // For iOS devices, use webkitCompassHeading if available
      if (heading === null && 'webkitCompassHeading' in event) {
        heading = (event as any).webkitCompassHeading;
      }
      
      if (heading !== null) {
        setState(prev => ({ ...prev, heading }));
      }
    };

    // Try both event types for maximum compatibility
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);

    // Request permission for iOS 13+
    if ('DeviceOrientationEvent' in window && 'requestPermission' in DeviceOrientationEvent) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleOrientation);
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(console.error);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return state;
}
