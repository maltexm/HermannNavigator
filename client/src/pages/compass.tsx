import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { calculateDistance, calculateBearing } from "@/lib/compass";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ARView } from "@/components/ARView";
import { Camera, Share2 } from "lucide-react";
import nurRobinsonPhoto from "@assets/nur-robinson_optimized_white.jpg";
import arminiaFlag from "@assets/arminia-bielefeld-1970s-logo.png";

// Hermann Monument coordinates
const HERMANN_LAT = 51.911667;
const HERMANN_LNG = 8.839444;

export default function CompassPage() {
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentTimer, setAlignmentTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showPermission, setShowPermission] = useState(true);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAR, setShowAR] = useState(false);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState(false);
  const [smoothedIsAligned, setSmoothedIsAligned] = useState(false);

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

  // Check alignment with smoothing to reduce jitter
  useEffect(() => {
    if (position && heading !== null && bearing !== null) {
      const difference = Math.abs(((bearing - heading + 540) % 360) - 180);
      const newIsAligned = difference <= 15;
      
      // Clear any existing timer when heading changes
      if (alignmentTimer) {
        clearTimeout(alignmentTimer);
        setAlignmentTimer(null);
      }
      
      // Always check alignment state, don't rely on previous state comparison
      const delay = newIsAligned ? 100 : 200; // Reduced delays for more responsive feedback
      const timer = setTimeout(() => {
        setIsAligned(newIsAligned);
        setSmoothedIsAligned(newIsAligned);
        
        if (newIsAligned && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }, delay);
      
      setAlignmentTimer(timer);
    }
    
    // Cleanup timer on unmount
    return () => {
      if (alignmentTimer) {
        clearTimeout(alignmentTimer);
      }
    };
  }, [heading, bearing]); // Only depend on heading and bearing, not position or previous alignment state

  // Handle location updates
  useEffect(() => {
    if (position) {
      setLastUpdate(new Date());
      setShowPermission(false);
      setShowError(false);
      
      // Check if compass permission is needed on iOS
      if (heading === null && 'DeviceOrientationEvent' in window && 'requestPermission' in DeviceOrientationEvent) {
        setNeedsOrientationPermission(true);
      }
    }
  }, [position, heading]);

  // Handle errors
  useEffect(() => {
    if (geoError) {
      let message = "Standort konnte nicht ermittelt werden.";
      
      switch(geoError.code) {
        case geoError.PERMISSION_DENIED:
          message = "Zugriff auf den Standort verweigert. Bitte Standortfreigabe in den Browser-Einstellungen aktivieren.";
          break;
        case geoError.POSITION_UNAVAILABLE:
          message = "Standortinformationen sind nicht verfügbar. Bitte versuche es erneut.";
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

  const handleRequestOrientationPermission = async () => {
    if ('DeviceOrientationEvent' in window && 'requestPermission' in DeviceOrientationEvent) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setNeedsOrientationPermission(false);
        }
      } catch (error) {
        console.error('Error requesting orientation permission:', error);
      }
    }
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

  const handleShare = async () => {
    if (!position || distance === null) return;
    
    const distanceText = distance < 1 
      ? `${Math.round(distance * 1000)} Meter` 
      : `${distance.toFixed(1)} Kilometer`;
    
    const shareData = {
      title: 'Arminius - Meine Entfernung zum Hermannsdenkmal',
      text: `Ich bin ${distanceText} vom Hermannsdenkmal entfernt! 🏛️ Kompass-App mit Arminia Bielefeld 💙`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard
        const shareText = `${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Link wurde in die Zwischenablage kopiert!');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      // Fallback to copying to clipboard
      try {
        const shareText = `${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Link wurde in die Zwischenablage kopiert!');
      } catch (clipboardError) {
        alert('Teilen fehlgeschlagen. Bitte kopiere den Link manuell.');
      }
    }
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
      <main className="px-6 pb-6 flex-1">
        
        {/* Permission Request Card */}
        {showPermission && (
          <Card className="ios-card rounded-3xl mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🧭</div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">Standortzugriff erforderlich</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Arminius benötigt Zugriff auf deinen Standort, um Entfernung und Richtung zum Hermannsdenkmal zu berechnen.
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

        {/* Orientation Permission Request */}
        {needsOrientationPermission && position && (
          <Card className="ios-card rounded-3xl mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🧭</div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">Kompass Berechtigung</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Für die AR-Funktion wird Zugriff auf den Kompass benötigt, um die Richtung zu bestimmen.
              </p>
              <Button 
                onClick={handleRequestOrientationPermission}
                className="w-full bg-primary text-primary-foreground font-semibold py-4 px-6 rounded-2xl text-lg h-auto"
              >
                Kompass aktivieren
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
                  
                  {/* Hermann Monument Flag Marker - On outer circle */}
                  <div 
                    className="absolute w-8 h-8 flex items-center justify-center pointer-events-none"
                    style={{
                      left: `${50 + 48 * Math.sin((bearing * Math.PI) / 180)}%`,
                      top: `${50 - 48 * Math.cos((bearing * Math.PI) / 180)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <img 
                      src={arminiaFlag} 
                      alt="Arminia Flag" 
                      className="w-8 h-8 drop-shadow-lg"
                      style={{
                        filter: isAligned ? "drop-shadow(0 0 12px hsl(var(--primary)))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                      }}
                    />
                  </div>

                  {/* Center Area with Alignment Status */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {smoothedIsAligned ? (
                      <div className="text-center">
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="text-xs font-bold text-primary">AUSGERICHTET</div>
                      </div>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>

                {/* Bearing Information */}
                <div className="space-y-4">
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
                  
                  {/* Share Button */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleShare}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Entfernung teilen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* AR Button */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-6 text-center">
                {isAligned ? (
                  <div>
                    <div className="text-4xl mb-2">🎯</div>
                    <div className="text-lg font-semibold text-primary">Auf das Hermannsdenkmal ausgerichtet!</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">📱</div>
                    <div className="text-lg font-semibold text-foreground mb-4">
                      Erweiterte Realität aktivieren
                    </div>
                    <Button 
                      onClick={() => setShowAR(true)}
                      className="w-full bg-primary text-primary-foreground font-semibold py-4 px-6 rounded-2xl text-lg h-auto flex items-center justify-center gap-3"
                    >
                      <Camera className="w-6 h-6" />
                      AR Modus starten
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spotify Widget */}
            <Card className="ios-card rounded-3xl">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={nurRobinsonPhoto} 
                        alt="Nur Robinson Band"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Nur Robinson
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Musik für die Reise zum Hermannsdenkmal
                    </p>
                    <a 
                      href="https://open.spotify.com/artist/144wlNEttOX8WbfBdCEXfV?si=v3sqh678Rx-1MnB-VvVpHA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 17.062c-.223 0-.369-.077-.631-.225-2.298-1.297-5.188-1.297-7.486 0-.262.148-.408.225-.631.225-.408 0-.739-.331-.739-.739 0-.262.108-.477.323-.631 2.813-1.59 6.308-1.59 9.121 0 .215.154.323.369.323.631 0 .408-.331.739-.739.739z"/>
                      </svg>
                      Auf Spotify anhören
                    </a>
                  </div>
                </div>
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
                    <span className="text-muted-foreground">Längengrad:</span>
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

      {/* AR View */}
      {showAR && position && (
        <ARView
          bearing={bearing}
          heading={heading}
          distance={distance}
          onClose={() => setShowAR(false)}
        />
      )}
    </div>
  );
}
