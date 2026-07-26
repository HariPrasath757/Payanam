# **App Name**: Payanam — Smart Bus Route Simulation and Tracking System

## Core Features:

- Real-Time Bus Simulation: Buses move continuously along a predefined route. Simulation runs using Node.js with Firebase Admin SDK. Bus speed is constant, only departure timing varies to maintain realistic spacing.
- Departure Scheduling Logic: Equal spacing between buses is maintained using terminal wait timers to simulate realistic dispatch intervals, preventing clustering. Automatic direction reversal at route endpoints.
- Direction-Based Filtering: Users select source and destination stops first. Only buses moving in the relevant direction are displayed. Opposite-direction buses continue updating in the background.
- Route Visualization: Bus route drawn using Leaflet.js with coordinates fetched from OSRM routing API. Stops marked as circular markers; source as green pin, destination as red pin.
- Occupancy Simulation: Passenger count simulated between 5 and 50, with small random variation per update cycle, for visualization purposes.
- Firebase Realtime Database Integration: Realtime updates sync simulation backend with frontend map, storing bus and stop data.
- User Interface Flow: Initial full-screen panel prompts users to select source and destination stops. After confirmation, the map loads, the route is drawn, and only relevant buses are shown.

## Style Guidelines:

- Map-centric UI with minimal overlay controls.
- Bus emoji markers (direction mirrored), circular stop markers, green source pin, red destination pin.
- Smooth simulated position updates.