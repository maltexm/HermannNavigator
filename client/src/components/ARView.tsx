import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Camera } from "lucide-react";
import hermannImage from "@assets/14777547034_696c17ed90_b.png";

interface ARViewProps {
  bearing: number;
  heading: number | null;
  distance: number;
  onClose: () => void;
}

export function ARView({ bearing, heading, distance, onClose }: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
        setCameraError(null);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  // Calculate relative bearing for AR overlay
  const relativeBearing = heading !== null ? (bearing - heading + 360) % 360 : 0;
  
  // Determine direction arrows
  const getDirectionArrows = () => {
    if (heading === null) return null;
    
    const diff = ((bearing - heading + 540) % 360) - 180;
    
    if (Math.abs(diff) <= 15) {
      return "centered"; // User is pointing at Hermann
    } else if (diff > 0) {
      return "right"; // Turn right
    } else {
      return "left"; // Turn left
    }
  };

  const direction = getDirectionArrows();
  const isAligned = direction === "centered";

  // Calculate Hermann Monument position on screen
  const hermannScreenX = Math.sin((relativeBearing * Math.PI) / 180) * (window.innerWidth / 2) + (window.innerWidth / 2);
  const hermannScreenY = window.innerHeight * 0.4; // Place at 40% from top

  // Scale Hermann image based on distance (closer = larger)
  const getHermannScale = () => {
    if (distance > 100) return 0.1; // Very far
    if (distance > 50) return 0.15;
    if (distance > 20) return 0.2;
    if (distance > 10) return 0.3;
    if (distance > 5) return 0.4;
    if (distance > 1) return 0.6;
    return 0.8; // Very close
  };

  const hermannScale = getHermannScale();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera View */}
      <div className="relative w-full h-full">
        {cameraError ? (
          <div className="flex items-center justify-center h-full">
            <Card className="ios-card mx-6">
              <CardContent className="p-8 text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-3 text-foreground">Kamera Fehler</h2>
                <p className="text-muted-foreground mb-6">{cameraError}</p>
                <Button onClick={startCamera} className="mr-3">
                  Erneut versuchen
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Schließen
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* AR Overlays */}
            {isCameraActive && (
              <>
                {/* Hermann Monument Image Overlay */}
                {hermannScreenX >= -100 && hermannScreenX <= window.innerWidth + 100 && (
                  <img
                    src={hermannImage}
                    alt="Hermannsdenkmal"
                    className="absolute pointer-events-none transition-all duration-300"
                    style={{
                      left: `${hermannScreenX - (200 * hermannScale) / 2}px`,
                      top: `${hermannScreenY}px`,
                      width: `${200 * hermannScale}px`,
                      height: `auto`,
                      filter: isAligned ? "drop-shadow(0 0 20px #0068BD)" : "none",
                      opacity: 0.9
                    }}
                  />
                )}

                {/* Direction Arrows */}
                {direction && direction !== "centered" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {direction === "left" && (
                      <div className="absolute left-8 text-6xl text-primary animate-pulse">
                        ←
                      </div>
                    )}
                    {direction === "right" && (
                      <div className="absolute right-8 text-6xl text-primary animate-pulse">
                        →
                      </div>
                    )}
                  </div>
                )}

                {/* Center Target when aligned */}
                {isAligned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 border-4 border-primary rounded-full animate-pulse bg-primary/20">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-primary rounded-full"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Distance and Bearing Info */}
                <div className="absolute top-4 left-4 right-4 safe-area-top">
                  <Card className="ios-card">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-muted-foreground">Entfernung: </span>
                          <span className="font-bold text-primary">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Richtung: </span>
                          <span className="font-bold text-foreground">{Math.round(bearing)}°</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Message */}
                <div className="absolute bottom-4 left-4 right-4 safe-area-bottom">
                  <Card className="ios-card">
                    <CardContent className="p-4 text-center">
                      {isAligned ? (
                        <div>
                          <div className="text-2xl mb-2">🎯</div>
                          <div className="text-lg font-semibold text-primary">
                            Hermannsdenkmal gefunden!
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl mb-2">📱</div>
                          <div className="text-base font-medium text-foreground">
                            Drehe dich {direction === "left" ? "nach links" : "nach rechts"}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}

        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 safe-area-top bg-black/50 border-white/20 text-white hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}