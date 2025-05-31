interface StatusIndicatorProps {
  status: "off" | "searching" | "active" | "error";
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-foreground",
          text: "GPS an",
          pulse: false,
        };
      case "searching":
        return {
          color: "bg-orange-500",
          text: "Suche",
          pulse: true,
        };
      case "error":
        return {
          color: "bg-red-500",
          text: "GPS-Fehler",
          pulse: false,
        };
      default:
        return {
          color: "bg-gray-400",
          text: "GPS aus",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'pulse' : ''}`}
      />
      <span className="text-sm font-medium text-muted-foreground">
        {config.text}
      </span>
    </div>
  );
}
