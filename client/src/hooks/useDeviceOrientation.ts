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
      
      // Convert to proper compass heading (0-360)
      if (heading !== null) {
        // Normalize to 0-360 range
        const normalizedHeading = ((360 - heading) + 360) % 360;
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
