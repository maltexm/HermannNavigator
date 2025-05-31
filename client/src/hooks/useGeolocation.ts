import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
  });
  
  const [watchId, setWatchId] = useState<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: {
          code: 2,
          message: "Geolocation is not supported by this browser.",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          position,
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        setState({
          position: null,
          error,
          isLoading: false,
        });
      },
      options
    );

    setWatchId(id);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...state,
    requestLocation,
    stopWatching,
  };
}
