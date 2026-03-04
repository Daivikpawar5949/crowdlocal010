Role: Expert Full-Stack Developer (MERN Stack)
Project: "CrowdLocal" - A real-time university mini-project for event crowd management.

Objective: > Create a single-page React dashboard and a Node.js/Express/MongoDB backend that tracks attendee movement across three zones: Main Hall (Cap: 200), Food Court (Cap: 50), and VIP Room (Cap: 20).

Core Feature Logic:

User Movement: When a user scans a QR code (simulated via an API POST request to /api/scan), the system must check their current location in MongoDB.

Transfer Logic: If the user is already in 'Room A' and scans for 'Room B', the backend must:

Decrement the occupancy of 'Room A'.

Increment the occupancy of 'Room B'.

Update the user's currentLocation in the database.

Real-Time Sync: Use Socket.io to broadcast the updated occupancy counts and a "Recent Activity" message (e.g., "Rahul moved to Food Court") to the frontend instantly.

Frontend Requirements (React + Tailwind):

UI Style: Dark-themed, professional "Command Center" aesthetic with Glassmorphism.

Three Section Cards: Each displaying: Room Name, a Progress Bar (Occupancy/Capacity), and a small "Live Log" of recent entries for that specific room.

Capacity Alerts: The Progress Bar should turn red if occupancy exceeds 90%.

Backend Requirements (Node/Express + MongoDB):

Schema: A User schema storing name, currentLocation, and timestamp.

Schema: A Room schema (or simple constant object) to track current totals.

API Endpoint: POST /api/scan accepting { "userName": "string", "roomName": "string" }.

Deliverable:
Provide the code for server.js (Backend) and App.jsx (Frontend) in a clear, modular format. Ensure the WebSocket integration is robust so no manual refresh is needed to see the numbers change.

