"use client";

import { useState } from 'react';
import { BUS_STOPS, Stop } from '@/lib/bus-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Bus } from 'lucide-react';

interface SelectionScreenProps {
  onConfirm: (source: Stop, destination: Stop) => void;
}

export default function SelectionScreen({ onConfirm }: SelectionScreenProps) {
  const [sourceId, setSourceId] = useState<string>('');
  const [destId, setDestId] = useState<string>('');

  const handleConfirm = () => {
    const source = BUS_STOPS.find(s => s.id === sourceId);
    const dest = BUS_STOPS.find(s => s.id === destId);
    if (source && dest && sourceId !== destId) {
      onConfirm(source, dest);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Bus className="text-primary w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Payanam</CardTitle>
          <CardDescription>Smart Bus Route Tracking System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Source Stop
            </label>
            <Select onValueChange={setSourceId} value={sourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Where are you starting?" />
              </SelectTrigger>
              <SelectContent>
                {BUS_STOPS.map(stop => (
                  <SelectItem key={stop.id} value={stop.id} disabled={stop.id === destId}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Navigation className="w-4 h-4 text-red-600" />
              Destination Stop
            </label>
            <Select onValueChange={setDestId} value={destId}>
              <SelectTrigger>
                <SelectValue placeholder="Where do you want to go?" />
              </SelectTrigger>
              <SelectContent>
                {BUS_STOPS.map(stop => (
                  <SelectItem key={stop.id} value={stop.id} disabled={stop.id === sourceId}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full font-semibold h-12" 
            size="lg" 
            onClick={handleConfirm}
            disabled={!sourceId || !destId || sourceId === destId}
          >
            Find Buses
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
