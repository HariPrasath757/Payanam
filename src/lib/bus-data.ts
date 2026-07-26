export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Stop {
  id: string;
  name: string;
  coord: Coordinate;
  waitingCrowd: number;
}

export const BUS_STOPS: Stop[] = [
  { id: 's1', name: "Avadi", coord: { lat: 13.120132825960265, lng: 80.1021240433657 }, waitingCrowd: 15 },
  { id: 's2', name: "Hindu College", coord: { lat: 13.119066810809498, lng: 80.07389424134797 }, waitingCrowd: 15 },
  { id: 's3', name: "Pattabiram", coord: { lat: 13.122424776977745, lng: 80.06122754148294 }, waitingCrowd: 10 },
  { id: 's4', name: "Tiruninravur", coord: { lat: 13.124436858830125, lng: 80.03152775961289 }, waitingCrowd: 20 },
  { id: 's5', name: "Kavanur", coord: { lat: 13.180690205601984, lng: 80.02927922374283 }, waitingCrowd: 8 },
  { id: 's6', name: "Mannadi", coord: { lat: 13.203231836659702, lng: 80.02937063532941 }, waitingCrowd: 12 },
  { id: 's7', name: "Tamaraipakkam", coord: { lat: 13.22038570119922, lng: 80.02847925400708 }, waitingCrowd: 18 },
  { id: 's8', name: "Vengal College", coord: { lat: 13.262893665930639, lng: 80.02625647541174 }, waitingCrowd: 25 },
  { id: 's9', name: "Vadamadurai", coord: { lat: 13.286948658720462, lng: 80.04215967545166 }, waitingCrowd: 14 },
  { id: 's10', name: "Periyapalayam", coord: { lat: 13.308018172560448, lng: 80.04647375480725 }, waitingCrowd: 30 },
];

export const BUS_CAPACITY = 60;

export interface BusInstance {
  id: string;
  currentCoord: Coordinate;
  direction: 'forward' | 'backward'; // forward = Avadi -> Periyapalayam
  occupancy: number;
  progress: number; 
  routeIndex: number; 
  pauseTimer: number; 
}
