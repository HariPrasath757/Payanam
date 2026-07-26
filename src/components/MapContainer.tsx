"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BUS_STOPS, Stop, BusInstance, BUS_CAPACITY, Coordinate } from '@/lib/bus-data';

// Fixing Leaflet default icon issues in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  source: Stop;
  destination: Stop;
  buses: BusInstance[];
  fullRoute: Coordinate[];
  stops: Stop[];
}

export default function BusMap({ source, destination, buses, fullRoute, stops }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const routePolyline = useMemo(() => fullRoute.map(c => [c.lat, c.lng] as [number, number]), [fullRoute]);

  const sourceIdx = BUS_STOPS.findIndex(s => s.id === source.id);
  const destIdx = BUS_STOPS.findIndex(s => s.id === destination.id);
  const targetDirection = sourceIdx < destIdx ? 'forward' : 'backward';

  const filteredBuses = buses.filter(bus => bus.direction === targetDirection);

  const stopIndices = useMemo(() => {
    return BUS_STOPS.map(stop => {
      let closestIdx = 0;
      let minDist = Infinity;
      fullRoute.forEach((coord, idx) => {
        const d = Math.sqrt(Math.pow(coord.lat - stop.coord.lat, 2) + Math.pow(coord.lng - stop.coord.lng, 2));
        if (d < minDist) {
          minDist = d;
          closestIdx = idx;
        }
      });
      return { id: stop.id, index: closestIdx };
    });
  }, [fullRoute]);

  const calculateNextBus = (stopId: string, direction: 'forward' | 'backward') => {
    const stopInfo = stopIndices.find(si => si.id === stopId);
    if (!stopInfo || fullRoute.length === 0) return null;

    const stopIdx = stopInfo.index;

    // Filter only for buses going in the trip direction
    const potentialBuses = buses.filter(bus => {
      if (bus.direction !== direction) return false;
      // For forward: bus must be at or before the stop index
      if (direction === 'forward' && bus.routeIndex <= stopIdx) return true;
      // For backward: bus must be at or after the stop index
      if (direction === 'backward' && bus.routeIndex >= stopIdx) return true;
      return false;
    });

    if (potentialBuses.length === 0) return null;

    const busesWithDist = potentialBuses.map(bus => {
      const dist = direction === 'forward' 
        ? stopIdx - bus.routeIndex 
        : bus.routeIndex - stopIdx;
      return { ...bus, dist };
    }).sort((a, b) => a.dist - b.dist);

    const nextBus = busesWithDist[0];
    const etaSeconds = nextBus.dist * 1.5;
    const etaMins = Math.max(1, Math.ceil(etaSeconds / 60));

    // VACANCY CALCULATION: Strictly 60 - x
    const currentOccupancy = nextBus.occupancy || 0;
    const vacancyCount = Math.max(0, BUS_CAPACITY - currentOccupancy);

    return {
      id: nextBus.id,
      eta: etaMins,
      vacancy: vacancyCount,
      occupancy: currentOccupancy
    };
  };

  if (!mounted) return <div className="h-full w-full bg-muted animate-pulse" />;

  const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [1, -28],
    shadowSize: [32, 32]
  });

  const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [1, -28],
    shadowSize: [32, 32]
  });

  const busIcon = (direction: string) => L.divIcon({
    className: `bus-emoji-marker ${direction === 'backward' ? 'mirrored' : ''}`,
    html: '🚌',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <MapContainer 
      center={[13.214, 80.05]} 
      zoom={11} 
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={routePolyline} color="hsl(var(--primary))" weight={3} opacity={0.5} />

      {stops.map((stop) => {
        const nextBusInfo = calculateNextBus(stop.id, targetDirection);
        const isHighCrowd = (stop.waitingCrowd || 0) >= 40;
        return (
          <CircleMarker
            key={stop.id}
            center={[stop.coord.lat, stop.coord.lng]}
            radius={6 + ((stop.waitingCrowd || 0) / 10)} 
            pathOptions={{ 
              fillColor: isHighCrowd ? '#ef4444' : 'white', 
              color: 'hsl(var(--foreground))', 
              weight: isHighCrowd ? 2 : 1.5, 
              fillOpacity: 1 
            }}
          >
            <Popup className="compact-popup">
              <div className="p-0.5 min-w-[120px]">
                <div className="flex justify-between items-center mb-1 border-b pb-1">
                  <p className="font-bold text-xs leading-tight">{stop.name}</p>
                  <span className={`text-[8px] font-bold px-1 rounded ${isHighCrowd ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                    {stop.waitingCrowd || 0}
                  </span>
                </div>
                {nextBusInfo ? (
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">Next Bus:</span>
                      <span className="font-bold">{nextBusInfo.eta}m</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">Vacancy:</span>
                      <span className={`font-bold ${nextBusInfo.vacancy > 10 ? 'text-green-600' : 'text-amber-500'}`}>
                        {nextBusInfo.vacancy} Seats
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground italic text-center">No buses tracking {targetDirection}</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      <Marker position={[source.coord.lat, source.coord.lng]} icon={greenIcon}>
        <Popup className="compact-popup">
          <p className="text-xs font-bold">Trip Start: {source.name}</p>
        </Popup>
      </Marker>

      <Marker position={[destination.coord.lat, destination.coord.lng]} icon={redIcon}>
        <Popup className="compact-popup">
          <p className="text-xs font-bold">Trip End: {destination.name}</p>
        </Popup>
      </Marker>

      {filteredBuses.map((bus) => (
        <Marker 
          key={bus.id} 
          position={[bus.currentCoord.lat, bus.currentCoord.lng]} 
          icon={busIcon(bus.direction)}
        >
          <Popup className="compact-popup">
            <div className="p-0.5 min-w-[100px]">
              <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-xs text-primary">{bus.id}</p>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>Occupancy</span>
                  <span className="font-bold">{bus.occupancy || 0}/{BUS_CAPACITY}</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${(bus.occupancy || 0) > 45 ? 'bg-red-500' : 'bg-primary'}`} 
                    style={{ width: `${((bus.occupancy || 0)/BUS_CAPACITY)*100}%` }}
                  />
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
