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

<img width="1308" height="658" alt="image" src="https://github.com/user-attachments/assets/5a8382fd-e0d1-4a83-9bfe-c632248af629" />

<img width="1321" height="657" alt="image" src="https://github.com/user-attachments/assets/35c09d63-0820-4b0a-ac0d-79781e53c01f" />

<img width="1302" height="653" alt="image" src="https://github.com/user-attachments/assets/8b4e8fb5-dfc2-40fd-9a7b-b65d4ca39a5f" />

<img width="393" height="445" alt="image" src="https://github.com/user-attachments/assets/6e679938-8539-48e1-b95d-b51a48bb905c" />

<img width="1281" height="943" alt="image" src="https://github.com/user-attachments/assets/cd68040e-8b31-4d2c-a2bb-7f46a8a423b0" />
