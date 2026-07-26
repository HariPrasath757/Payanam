"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Stop, BusInstance, BUS_STOPS, Coordinate, BUS_CAPACITY } from '@/lib/bus-data';
import { calculateNewPosition, initializeBuses, createNewBus } from '@/lib/simulation-logic';
import SelectionScreen from '@/components/SelectionScreen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft, RefreshCw, Loader2, Settings2, Plus, Minus, AlertTriangle, TrendingUp, Gauge, Radio, Bus as BusIcon, CreditCard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabase, useRTDB, useMemoFirebase, updateRTDBNonBlocking, setRTDBNonBlocking, removeRTDBNonBlocking, useAuth, useUser } from '@/firebase';
import { ref, onValue, off, DataSnapshot } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const INITIAL_BUS_COUNT = 8;
const MAX_FLEET_SIZE = 12;
const SYSTEM_CROWD_THRESHOLD = 250; 
const SYNC_INTERVAL_MS = 1000; 

const BusMap = dynamic(() => import('@/components/MapContainer'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Loading Maps...</div>
});

function decodePolyline(encoded: string) {
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  const coordinates: Coordinate[] = [];
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coordinates;
}

export default function PayanamApp() {
  const db = useDatabase();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading: authLoading } = useUser();
  const [source, setSource] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [fullRoute, setFullRoute] = useState<Coordinate[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  const busesRef = useRef<BusInstance[]>([]);
  const stopsRef = useRef<Stop[]>([]);
  const lastSyncRef = useRef(0);
  const processedScansRef = useRef<Set<string>>(new Set());

  const stopsRefDB = useMemoFirebase(() => ref(db, 'stops'), [db]);
  const busesRefDB = useMemoFirebase(() => ref(db, 'buses'), [db]);
  const waitingRefDB = useMemoFirebase(() => ref(db, 'waiting'), [db]);

  const { data: stopsData, isLoading: stopsLoading } = useRTDB<Stop>(stopsRefDB);
  const { data: busesData, isLoading: busesLoading } = useRTDB<BusInstance>(busesRefDB);

  useEffect(() => {
    if (!user && !authLoading) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [auth, user, authLoading]);

  useEffect(() => {
    if (!db || !user) return;

    const listener = onValue(waitingRefDB, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (!data) return;

      Object.entries(data).forEach(([stopName, routes]: [string, any]) => {
        Object.entries(routes).forEach(([routeId, scans]: [string, any]) => {
          Object.entries(scans).forEach(([cardUID, scanData]: [string, any]) => {
            const scanKey = `${stopName}-${routeId}-${cardUID}`;
            
            if (!processedScansRef.current.has(scanKey)) {
              processedScansRef.current.add(scanKey);
              
              const stop = BUS_STOPS.find(s => s.name.toLowerCase() === stopName.toLowerCase());
              if (stop) {
                toast({
                  title: "Waiter Added",
                  description: `Hardware user ${cardUID} detected at ${stopName}. Route: ${routeId}. Destination: ${scanData.destination || 'N/A'}.`,
                  duration: 10000,
                });

                const currentStopData = stopsRef.current.find(s => s.id === stop.id);
                const currentCrowd = currentStopData?.waitingCrowd || 0;
                updateRTDBNonBlocking(ref(db, `stops/${stop.id}`), {
                  waitingCrowd: currentCrowd + 1
                });
              }
            }
          });
        });
      });
    });

    return () => off(waitingRefDB, 'value', listener);
  }, [db, user, waitingRefDB, toast]);

  useEffect(() => {
    if (stopsData) stopsRef.current = stopsData;
    if (busesData) busesRef.current = busesData;
  }, [stopsData, busesData]);

  const stops = useMemo(() => {
    if (!stopsData || stopsData.length === 0) return BUS_STOPS.map(s => ({...s, waitingCrowd: Math.max(5, s.waitingCrowd || 5)}));
    return stopsData;
  }, [stopsData]);

  const buses = useMemo(() => {
    if (!busesData) return [];
    return [...busesData].sort((a, b) => a.id.localeCompare(b.id));
  }, [busesData]);

  const totalSystemCrowd = stops.reduce((acc, s) => acc + (s.waitingCrowd || 0), 0);
  const isSystemOverloaded = totalSystemCrowd >= SYSTEM_CROWD_THRESHOLD;

  const stopIndices = useMemo(() => {
    if (fullRoute.length === 0) return [];
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
      return closestIdx;
    });
  }, [fullRoute]);

  useEffect(() => {
    async function fetchRoadRoute() {
      try {
        const coordsParam = BUS_STOPS.map(s => `${s.coord.lng},${s.coord.lat}`).join(';');
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=polyline&steps=false&alternatives=false`);
        if (!response.ok) throw new Error("OSRM Network Error");
        
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const decoded = decodePolyline(data.routes[0].geometry);
          setFullRoute(decoded);
          initializeDbIfEmpty(decoded.length);
        } else {
          throw new Error("No route found");
        }
      } catch (error) {
        console.warn("OSRM Route Fetch failed, using straight-line fallback");
        const fallbackRoute: Coordinate[] = [];
        for (let i = 0; i < BUS_STOPS.length - 1; i++) {
          const s = BUS_STOPS[i].coord;
          const e = BUS_STOPS[i+1].coord;
          const steps = 100;
          for (let j = 0; j < steps; j++) {
            fallbackRoute.push({
              lat: s.lat + (e.lat - s.lat) * (j / steps),
              lng: s.lng + (e.lng - s.lng) * (j / steps)
            });
          }
        }
        fallbackRoute.push(BUS_STOPS[BUS_STOPS.length - 1].coord);
        setFullRoute(fallbackRoute);
        initializeDbIfEmpty(fallbackRoute.length);
      } finally {
        setIsLoadingRoute(false);
      }
    }

    function initializeDbIfEmpty(routeLen: number) {
      if (!user) return;
      if (!stopsData || stopsData.length === 0) {
        const initialStops: Record<string, Stop> = {};
        BUS_STOPS.forEach(stop => {
          initialStops[stop.id] = {
            id: stop.id,
            name: stop.name,
            coord: stop.coord,
            waitingCrowd: Math.max(5, stop.waitingCrowd || 5)
          };
        });
        setRTDBNonBlocking(ref(db, 'stops'), initialStops);
      }
      if (!busesData || busesData.length === 0) {
        const initialBusesList = initializeBuses(routeLen);
        const busMap: Record<string, BusInstance> = {};
        initialBusesList.forEach(bus => { busMap[bus.id] = bus; });
        setRTDBNonBlocking(ref(db, 'buses'), busMap);
      }
    }

    fetchRoadRoute();
  }, [db, stopsData, busesData, user]);

  useEffect(() => {
    if (fullRoute.length === 0 || !user) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const shouldSync = now - lastSyncRef.current >= SYNC_INTERVAL_MS;
      
      const currentBuses = [...busesRef.current];
      const currentStops = [...stopsRef.current];
      
      if (currentBuses.length === 0) return;

      const targetFleetSize = isSystemOverloaded ? MAX_FLEET_SIZE : INITIAL_BUS_COUNT;
      
      if (currentBuses.length > targetFleetSize && shouldSync) {
        const extraBuses = currentBuses
          .filter(b => b.id.startsWith('X-BUS'))
          .sort((a,b) => b.id.localeCompare(a.id));
        
        if (extraBuses.length > 0) {
           removeRTDBNonBlocking(ref(db, `buses/${extraBuses[0].id}`));
        }
      }

      if (isSystemOverloaded && currentBuses.length < MAX_FLEET_SIZE && shouldSync) {
        const nextIdNum = currentBuses.length + 1;
        const newBusId = `X-BUS${nextIdNum.toString().padStart(2, '0')}`;
        if (!currentBuses.some(b => b.id === newBusId)) {
          const direction = Math.random() > 0.5 ? 'forward' : 'backward';
          const newBus = createNewBus(newBusId, fullRoute.length, direction);
          setRTDBNonBlocking(ref(db, `buses/${newBusId}`), newBus);
        }
      }

      currentBuses.forEach(bus => {
        const nextBusState = calculateNewPosition(bus, fullRoute, stopIndices);
        
        if (nextBusState.pauseTimer === 5 && (bus.pauseTimer === 0 || bus.pauseTimer === undefined)) {
          const stopIdxInFullRoute = nextBusState.routeIndex;
          const stopIdxInStops = stopIndices.indexOf(stopIdxInFullRoute);
          
          if (stopIdxInStops !== -1) {
            const staticStop = BUS_STOPS[stopIdxInStops];
            const dynamicStop = currentStops.find(s => s.id === staticStop.id);
            
            if (dynamicStop) {
              const currentWaiters = dynamicStop.waitingCrowd || 0;
              const currentOccupancy = nextBusState.occupancy || 0;
              const vacancy = Math.max(0, BUS_CAPACITY - currentOccupancy);
              
              const boardable = Math.max(0, currentWaiters - 5); 
              const boarding = Math.min(boardable, vacancy);
              
              if (boarding > 0) {
                const newStopCrowd = Math.max(5, currentWaiters - boarding);
                updateRTDBNonBlocking(ref(db, `stops/${dynamicStop.id}`), {
                  waitingCrowd: newStopCrowd
                });
                nextBusState.occupancy = currentOccupancy + boarding;
              }
            }
          }
        }

        if (shouldSync) {
          updateRTDBNonBlocking(ref(db, `buses/${bus.id}`), nextBusState);
        }
      });

      if (shouldSync) lastSyncRef.current = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [fullRoute, stopIndices, db, user, isSystemOverloaded]);

  const updateStopCrowd = (id: string, delta: number) => {
    const stop = stops.find(s => s.id === id);
    if (stop) {
      updateRTDBNonBlocking(ref(db, `stops/${id}`), {
        waitingCrowd: Math.max(5, (stop.waitingCrowd || 0) + delta)
      });
    }
  };

  const updateBusOccupancy = (id: string, delta: number) => {
    const bus = buses.find(b => b.id === id);
    if (bus) {
      updateRTDBNonBlocking(ref(db, `buses/${id}`), {
        occupancy: Math.min(BUS_CAPACITY, Math.max(0, (bus.occupancy || 0) + delta))
      });
    }
  };

  const handleSelection = (src: Stop, dest: Stop) => {
    setSource(src);
    setDestination(dest);
  };

  const handleReset = () => {
    setSource(null);
    setDestination(null);
  };

  if (isLoadingRoute || stopsLoading || busesLoading || authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Initializing Real-time Transit Network...</p>
      </div>
    );
  }

  const avgOccupancy = Math.round(buses.reduce((acc, b) => acc + (b.occupancy || 0), 0) / (buses.length || 1));

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      {!source || !destination ? (
        <SelectionScreen onConfirm={handleSelection} />
      ) : (
        <>
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-4 flex flex-col items-center gap-2">
             <Card className="w-full max-w-2xl bg-background/95 backdrop-blur border-primary/20 p-3 pointer-events-auto flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-sm font-bold flex items-center gap-2">
                      <span className="text-green-600">{source.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-red-600">{destination.name}</span>
                    </h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                      Live Route Tracking
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">System Crowd</span>
                    <span className={`text-xs font-bold ${isSystemOverloaded ? 'text-red-500' : 'text-primary'}`}>
                      {totalSystemCrowd} Waiters
                    </span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
             </Card>

             {isSystemOverloaded && (
               <Alert variant="default" className="w-full max-w-2xl border-amber-200 bg-amber-50/90 backdrop-blur text-amber-900 pointer-events-auto animate-in slide-in-from-top duration-300">
                 <AlertTriangle className="h-4 w-4 text-amber-600" />
                 <AlertTitle className="text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                   Heavy Load Detected
                 </AlertTitle>
                 <AlertDescription className="text-xs">
                   System demand exceeded {SYSTEM_CROWD_THRESHOLD} waiters. Expanding fleet to <span className="font-bold underline text-amber-700">{buses.length}</span> active units.
                 </AlertDescription>
               </Alert>
             )}
          </div>

          <BusMap 
            source={source} 
            destination={destination} 
            buses={buses} 
            fullRoute={fullRoute}
            stops={stops}
          />

          <div className="absolute bottom-32 right-6 z-20 pointer-events-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" className={`h-12 w-12 rounded-full shadow-xl transition-all ${isSystemOverloaded ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-primary shadow-primary/20'}`}>
                  <Settings2 className="w-6 h-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-80 p-0 overflow-hidden">
                <Card className="border-none shadow-none">
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-sm">System Manager</h3>
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <Tabs defaultValue="stops" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-8">
                        <TabsTrigger value="stops" className="text-[10px] uppercase font-bold">Stops</TabsTrigger>
                        <TabsTrigger value="buses" className="text-[10px] uppercase font-bold">Buses</TabsTrigger>
                      </TabsList>
                      <TabsContent value="stops">
                        <ScrollArea className="h-64 mt-2">
                          <div className="p-1 space-y-1">
                            {stops.map(stop => (
                              <div key={stop.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium truncate max-w-[100px]">{stop.name}</span>
                                  <span className="text-[9px] text-muted-foreground">Waiters: {stop.waitingCrowd || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateStopCrowd(stop.id, -5)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-bold w-6 text-center ${(stop.waitingCrowd || 0) >= 40 ? 'text-red-500 font-black' : ''}`}>
                                    {stop.waitingCrowd || 0}
                                  </span>
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateStopCrowd(stop.id, 5)}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="buses">
                        <ScrollArea className="h-64 mt-2">
                          <div className="p-1 space-y-1">
                            {buses.map(bus => (
                              <div key={bus.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-primary">{bus.id}</span>
                                  <span className="text-[9px] text-muted-foreground">Load: {bus.occupancy || 0}/{BUS_CAPACITY}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateBusOccupancy(bus.id, -5)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-bold w-8 text-center ${bus.occupancy >= BUS_CAPACITY ? 'text-red-500' : ''}`}>
                                    {bus.occupancy || 0}
                                  </span>
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateBusOccupancy(bus.id, 5)}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>
              </PopoverContent>
            </Popover>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-none">
            <Card className="p-4 bg-background/95 backdrop-blur border-primary/20 shadow-2xl pointer-events-auto flex justify-between items-center gap-4">
               <div className="flex-1 flex flex-col items-center">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Fleet</p>
                 <div className="flex items-center gap-2">
                   <BusIcon className="w-4 h-4 text-primary" />
                   <span className="text-2xl font-black tracking-tighter">{buses.length}</span>
                 </div>
                 <span className="text-[9px] text-primary/70 font-bold uppercase">{buses.length > INITIAL_BUS_COUNT ? 'Reinforced' : 'Standard'}</span>
               </div>

               <div className="w-px bg-border h-12" />

               <div className="flex-1 flex flex-col items-center">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Fleet Occupancy</p>
                 <div className="flex items-center gap-2">
                   <Gauge className="w-4 h-4 text-primary" />
                   <span className="text-2xl font-black tracking-tighter">{Math.round((avgOccupancy/BUS_CAPACITY)*100)}%</span>
                 </div>
                 <span className="text-[9px] text-primary/70 font-bold uppercase">{avgOccupancy > 45 ? 'Crowded' : 'Optimal'}</span>
               </div>

               <div className="w-px bg-border h-12" />

               <div className="flex-1 flex flex-col items-center">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Hardware Sync</p>
                 <div className="flex items-center gap-2">
                   <Radio className="w-4 h-4 text-primary animate-pulse" />
                   <span className="text-2xl font-black tracking-tighter">Live</span>
                 </div>
                 <span className="text-[9px] text-primary/70 font-bold uppercase">Waiting Listener Active</span>
               </div>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
