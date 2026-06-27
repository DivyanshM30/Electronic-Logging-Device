# Spotter ELD - Project Submission

## Project Overview
Spotter is a comprehensive, full-stack trip planner and log generator designed specifically for truck drivers. It simplifies the complex process of route planning while strictly adhering to FMCSA Hours of Service (HOS) regulations. The application automates the generation of compliant Electronic Logging Device (ELD) Daily Log Sheets.

## Features
- **Intelligent Route Planning**: Calculates routes based on current, pickup, and dropoff locations.
- **HOS Compliance Engine**: Automatically processes driving segments and calculates required rest breaks, 10-hour resets, and tracks 70-hour cycle limits.
- **Interactive Map**: Visualizes the planned route step-by-step.
- **Automated ELD Logs**: Generates standard FMCSA 24-hour log grids dynamically based on the planned schedule.

## Technology Stack
- **Frontend**: React.js, Vite, Axios for API calls, and Leaflet for mapping.
- **Backend**: Django (Python), Django REST Framework.
- **Routing/HOS Engine**: Custom HOS Calculator and Route Service algorithms.

## Screenshots

### Main Interface & Empty State
![Spotter Empty State - Main UI](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2301).png)

### Loading Trip Plan
![Spotter Loading State](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2302).png)

### Route Map View
![Spotter Map View showing the calculated route](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2303).png)
![Spotter Map View alternate](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2304).png)

### ELD Logs Generation
![Spotter ELD Daily Log Sheets - Day 1](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2305).png)
![Spotter ELD Daily Log Sheets - Day 2](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2306).png)

### HOS Error / Validation Handling
![Spotter Validation or specific scenario](d:/Coding/projects/Internship/Spotter/screenshots/Screenshot%20(2307).png)

## Conclusion
Spotter successfully demonstrates a robust implementation addressing a real-world logistics challenge, combining an intuitive UI with a complex backend scheduling and routing engine.
