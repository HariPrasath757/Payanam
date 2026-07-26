# Payanam — Smart Bus Tracking System

## Overview
Payanam is a real-time, interactive bus tracking and simulation system designed for optimized public transit management. It leverages road-accurate routing and high-frequency state synchronization to provide a live "Digital Twin" of a transit network.

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS + ShadCN UI
- **Database**: Firebase Realtime Database (RTDB)
- **Maps**: Leaflet (via `react-leaflet`)
- **Routing**: Open Source Routing Machine (OSRM)
- **Icons**: Lucide React

## Core Functionalities

### 1. Real-Time Simulation Engine
- **Road-Accurate Movement**: Buses do not move in straight lines; they follow decoded OSRM road paths.
- **Bi-Directional Traffic**: Buses operate in both 'forward' and 'backward' directions across the route.
- **Boarding & Deboarding**: When a bus arrives at a stop (index match), it pauses to board waiting passengers.
- **Wait Limit**: At least 5 passengers always remain at a stop to simulate consistent demand.

### 2. Intelligent Fleet Management
- **Standard Fleet**: Starts with 8 buses (4 each way).
- **Dynamic Scaling**: If the total system-wide waiting count exceeds 250, the system automatically commissions up to 12 buses to handle the load.
- **Manual Overrides**: Admins can adjust the occupancy of any bus or the crowd at any stop via the "System Manager" panel.

### 3. Hardware Integration (IoT Sync)
- **Structure**: Listens to the `/waiting/{stop}/{route}/{card}` path in the Realtime Database.
- **Events**: Physical RFID/Smart Card scans are detected instantly.
- **Feedback**: A 10-second closeable notification appears on the dashboard, and the stop's waiter count increments automatically.

### 4. Live Map Analytics
- **Stop Indicators**: Circles represent stops; size and color change based on crowd density.
- **Bus Tracking**: Emoji markers mirror their direction. Popups show real-time occupancy vs. capacity.
- **Vacancy Tracking**: Displayed as `60 - currentOccupancy`. ETA is calculated dynamically based on route index distance.

## Data Schemas
- **Stop**: `id`, `name`, `coord`, `waitingCrowd`.
- **Bus**: `id`, `currentCoord`, `direction`, `occupancy`, `progress`, `routeIndex`, `pauseTimer`.

## Deployment
Configured for **Firebase App Hosting** with automatic synchronization between the browser-based simulation and the production database.

## Screenshots

<img width="376" height="367" alt="image" src="https://github.com/user-attachments/assets/89764dd8-f55f-47e6-8aae-eb2c8dee773f" />

<img width="393" height="445" alt="image" src="https://github.com/user-attachments/assets/f49749fe-847d-4e51-8f6e-33230c812cca" />

<img width="1600" height="862" alt="image" src="https://github.com/user-attachments/assets/907f8bf5-12a6-44f2-b91c-5501634e2d5c" />

<img width="1600" height="847" alt="image" src="https://github.com/user-attachments/assets/c247742c-1d2f-4b2e-b81d-e0e088da72de" />

