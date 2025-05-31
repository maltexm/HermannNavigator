import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { calculateDistance, calculateBearing } from "@/lib/compass";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Hermann Monument coordinates
const HERMANN_LAT = 51.911667;
const HERMANN_LNG = 8.839444;

export default function CompassPage() {
  const [isAligned, setIsAligned] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showPermission, setShowPermission] = useState(true);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    position,
    error: geoError,
    isLoading: geoLoading,
    requestLocation,
    stopWatching
  } = useGeolocation();

  const { heading } = useDeviceOrientation();

  // Calculate distance and bearing
  const distance = position ? calculateDistance(
    position.coords.latitude,
    position.coords.longitude,
    HERMANN_LAT,
    HERMANN_LNG
  ) : 0;

  const bearing = position ? calculateBearing(
    position.coords.latitude,
    position.coords.longitude,
    HERMANN_LAT,
    HERMANN_LNG
  ) : 0;

  // Check alignment
  useEffect(() => {
    if (position && heading !== null) {
      const difference = Math.abs(((bearing - heading + 540) % 360) - 180);
      const newIsAligned = difference <= 15;
      
      if (newIsAligned !== isAligned) {
        setIsAligned(newIsAligned);
        
        if (newIsAligned && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
  }, [position, heading, bearing, isAligned]);

  // Handle location updates
  useEffect(() => {
    if (position) {
      setLastUpdate(new Date());
      setShowPermission(false);
      setShowError(false);
    }
  }, [position]);

  // Handle errors
  useEffect(() => {
    if (geoError) {
      let message = "Standort konnte nicht ermittelt werden.";
      
      switch(geoError.code) {
        case geoError.PERMISSION_DENIED:
          message = "Zugriff auf den Standort verweigert. Bitte Standortfreigabe in den Browser-Einstellungen aktivieren.";
          break;
        case geoError.POSITION_UNAVAILABLE:
          message = "Standortinformationen sind nicht verf\u00fcgbar. Bitte versuche es erneut.";
          break;
        case geoError.TIMEOUT:
          message = "Die Standortabfrage hat zu lange gedauert. Bitte versuche es erneut.";
          break;
      }
      
      setErrorMessage(message);
      setShowError(true);
      setShowPermission(false);
    }
  }, [geoError]);

  const handleRequestLocation = () => {
    setShowError(false);
    setShowPermission(false);
    requestLocation();
  };

  const handleRetry = () => {
    setShowError(false);
    requestLocation();
  };

  const getGPSStatus = () => {
    if (geoError) return "error";
    if (geoLoading) return "searching";
    if (position) return "active";
    return "off";
  };

  const formatDistance = (dist: number) => {
    if (dist < 1) {
      return {
        value: Math.round(dist * 1000),
        unit: "m"
      };
    }
    return {
      value: dist.toFixed(1),
      unit: "km"
    };
  };

  const formatCoordinate = (coord: number, isLatitude: boolean) => {
    const direction = isLatitude 
      ? (coord >= 0 ? "N" : "S")
      : (coord >= 0 ? "E" : "W");
    return `${Math.abs(coord).toFixed(4)}°${direction}`;
  };

  const relativeBearing = heading !== null ? (bearing - heading + 360) % 360 : 0;
  const formattedDistance = formatDistance(distance);

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar Space */}
      <div className="status-bar bg-transparent"></div>
      
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Arminius</h1>
          <div className="flex items-center space-x-2">
            <StatusIndicator status={getGPSStatus()} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-6 flex-1 flex flex-col justify-center" style={{ height: "calc(100vh - 140px)" }}>
        
        {/* Permission Request Card */}
        {showPermission && (
          <Card className="ios-card rounded-3xl mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🧭</div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">Standortzugriff erforderlich</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Arminius ben\u00f6tigt Zugriff auf deinen Standort, um Entfernung und Richtung zum Hermannsdenkmal zu berechnen.
          </p>
              <Button 
                onClick={handleRequestLocation}
                className="w-full bg-primary text-primary-foreground font-semibold py-4 px-6 rounded-2xl text-lg h-auto"
              >
                Standort freigeben
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {geoLoading && !showPermission && (
          <Card className="ios-card rounded-3xl mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4 pulse">📡</div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">Standort wird ermittelt</h2>
          <p className="text-muted-foreground">GPS-Koordinaten werden abgerufen...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {showError && (
          <Card className="ios-card rounded-3xl mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">Standortfehler</h2>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <Button 
                onClick={handleRetry}
                className="w-full bg-primary text-primary-foreground font-semibold py-4 px-6 rounded-2xl text-lg h-auto"
              >
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Display */}
        {position && !geoLoading && !showError && (
          <div className="space-y-6">
            
            {/* Distance Card */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-8 text-center">
                <h2 className="text-lg font-semibold text-muted-foreground mb-2">Entfernung zum Hermannsdenkmal</h2>
                <div className="text-6xl font-bold text-primary mb-2 distance-glow">
                  {formattedDistance.value}
                </div>
                <div className="text-2xl font-medium text-muted-foreground">
                  {formattedDistance.unit}
                </div>
              </CardContent>
            </Card>

            {/* Compass Card */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-8 text-center">
                <h2 className="text-lg font-semibold text-muted-foreground mb-6">Richtung</h2>
                
                {/* Compass Circle */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  {/* Compass Background */}
                  <div className="absolute inset-0 rounded-full border-4 border-border bg-card shadow-inner"></div>
                  
                  {/* Cardinal Directions */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute -top-3 text-sm font-bold text-muted-foreground">N</div>
                    <div className="absolute -right-3 text-sm font-bold text-muted-foreground">O</div>
                    <div className="absolute -bottom-3 text-sm font-bold text-muted-foreground">S</div>
                    <div className="absolute -left-3 text-sm font-bold text-muted-foreground">W</div>
                  </div>
                  
                  {/* Compass Arrow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="compass-arrow w-24 h-24 flex items-center justify-center" 
                      style={{ transform: `rotate(${relativeBearing}deg)` }}
                    >
                      {/* Arrow pointing up */}
                      <div className="relative">
                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[32px] border-l-transparent border-r-transparent border-b-primary mb-1"></div>
                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[32px] border-l-transparent border-r-transparent border-t-muted"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  </div>
                </div>

                {/* Bearing Information */}
                <div className="flex justify-center space-x-8 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">Peilung</div>
                    <div className="font-bold text-foreground">
                      {Math.round(bearing)}°
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Genauigkeit</div>
                    <div className="font-bold text-foreground">
                      ±{Math.round(position.coords.accuracy)}m
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alignment Status */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-6 text-center">
                {isAligned ? (
                  <div>
                    <div className="text-4xl mb-2">🎯</div>
                    <div className="text-lg font-semibold text-green-600">Auf das Hermannsdenkmal ausgerichtet!</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">🧭</div>
                    <div className="text-lg font-semibold text-muted-foreground">Drehe dich, bis der Pfeil \u00fcbereinstimmt</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Info */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Dein Standort</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breitengrad:</span>
                    <span className="font-mono text-foreground">
                      {formatCoordinate(position.coords.latitude, true)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L\u00e4ngengrad:</span>
                    <span className="font-mono text-foreground">
                      {formatCoordinate(position.coords.longitude, false)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Letzte Aktualisierung:</span>
                    <span className="text-foreground">
                      {lastUpdate ? "Gerade eben" : "Nie"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Home Indicator Space */}
      <div className="home-indicator bg-transparent"></div>
    </div>
  );
}
