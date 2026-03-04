# CrowdLocal — Real-Time Event Crowd Management

A university mini-project for managing event crowd flow across zones in real-time.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB + Socket.io

## Architecture
```
client/   → React dashboard (port 3000)
server/   → Express API + WebSocket server (port 5000)
```

## Prerequisites
- **Node.js** v18+
- **MongoDB** running locally on port 27017

## Setup & Run

### 1. Start MongoDB
```bash
mongod
```

### 2. Start the Backend
```bash
cd server
npm install
npm run dev
```

### 3. Start the Frontend
```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## API Endpoints

### `POST /api/scan`
Simulate a QR code scan to move an attendee into a room.
```json
{
  "userName": "Rahul",
  "roomName": "Main Hall"
}
```

### `POST /api/exit`
Remove an attendee from their current room.
```json
{
  "userName": "Rahul"
}
```

### `GET /api/rooms`
Fetch current state of all rooms.

## Rooms
| Room       | Capacity |
|------------|----------|
| Main Hall  | 200      |
| Food Court | 50       |
| VIP Room   | 20       |

## Features
- Real-time occupancy tracking via Socket.io
- Transfer logic (decrement old room, increment new room)
- Capacity alerts (progress bar turns red at >90%)
- Live activity logs per room
- QR scan simulator in the dashboard
- Dark-themed glassmorphism "Command Center" UI
