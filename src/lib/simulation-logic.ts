import { BusInstance, Coordinate } from './bus-data';

export function calculateNewPosition(
  bus: BusInstance, 
  fullRoute: Coordinate[], 
  stopIndices: number[]
): BusInstance {
  if (!fullRoute || fullRoute.length === 0) return bus;

  // Handle Paused State
  if (bus.pauseTimer > 0) {
    return {
      ...bus,
      pauseTimer: bus.pauseTimer - 1
    };
  }

  const speed = 0.5;
  let newProgress = (bus.progress || 0) + speed;
  // Ensure routeIndex is within bounds
  let newRouteIndex = Math.max(0, Math.min(bus.routeIndex ?? 0, fullRoute.length - 1));
  let newDirection = bus.direction || 'forward';
  let newPauseTimer = 0;

  if (newProgress >= 1) {
    newProgress = 0;
    if (newDirection === 'forward') {
      newRouteIndex++;
      if (newRouteIndex >= fullRoute.length - 1) {
        newRouteIndex = fullRoute.length - 1;
        newDirection = 'backward';
        newPauseTimer = 10; // Wait at terminus
      } else if (stopIndices.includes(newRouteIndex)) {
        newPauseTimer = 5; // Wait at stop
      }
    } else {
      newRouteIndex--;
      if (newRouteIndex <= 0) {
        newRouteIndex = 0;
        newDirection = 'forward';
        newPauseTimer = 10; // Wait at terminus
      } else if (stopIndices.includes(newRouteIndex)) {
        newPauseTimer = 5; // Wait at stop
      }
    }
  }

  // Safety: Re-clamp after index changes
  newRouteIndex = Math.max(0, Math.min(newRouteIndex, fullRoute.length - 1));

  // Get current and next points for interpolation
  const startPoint = fullRoute[newRouteIndex];
  const nextIdx = newDirection === 'forward' 
    ? Math.min(newRouteIndex + 1, fullRoute.length - 1)
    : Math.max(newRouteIndex - 1, 0);
  const endPoint = fullRoute[nextIdx];

  // Boundary check for points
  if (!startPoint || !endPoint) {
    return { ...bus, routeIndex: 0, progress: 0 };
  }

  const currentCoord: Coordinate = {
    lat: startPoint.lat + (endPoint.lat - startPoint.lat) * newProgress,
    lng: startPoint.lng + (endPoint.lng - startPoint.lng) * newProgress,
  };

  return {
    ...bus,
    currentCoord,
    progress: newProgress,
    routeIndex: newRouteIndex,
    direction: newDirection,
    pauseTimer: newPauseTimer
  };
}

export function initializeBuses(routeLength: number): BusInstance[] {
  if (routeLength === 0) return [];
  
  const count = 8;
  const buses: BusInstance[] = [];
  
  // Spread 8 buses evenly across the route (4 each way)
  for (let i = 0; i < count; i++) {
    const isForward = i < count / 2;
    const spacing = Math.floor(routeLength / (count / 2));
    const idx = (i % (count / 2)) * spacing;
    
    buses.push({
      id: `BUS${(i + 1).toString().padStart(2, '0')}`,
      currentCoord: { lat: 0, lng: 0 },
      direction: isForward ? 'forward' : 'backward',
      occupancy: 10 + Math.floor(Math.random() * 15),
      progress: 0,
      routeIndex: isForward ? idx : Math.max(0, routeLength - 1 - idx),
      pauseTimer: 0
    });
  }

  return buses;
}

export function createNewBus(id: string, routeLength: number, direction: 'forward' | 'backward'): BusInstance {
  const startIdx = direction === 'forward' ? 0 : Math.max(0, routeLength - 1);
  return {
    id,
    currentCoord: { lat: 0, lng: 0 },
    direction,
    occupancy: 0,
    progress: 0,
    routeIndex: startIdx,
    pauseTimer: 10 
  };
}
