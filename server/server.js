// ─────────────────────────────────────────────────────────
// CrowdLocal — Real-Time Event Crowd Management Server
// ─────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import os from 'os';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── MongoDB Connection ─────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdlocal';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => console.error('❌  MongoDB connection error:', err));

// ── Schemas & Models ───────────────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  currentLocation: { type: String, default: null }, // null = outside / not in any room
  timestamp: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  currentOccupancy: { type: Number, default: 0 },
});

const activitySchema = new mongoose.Schema({
  message: { type: String, required: true },
  room: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Activity = mongoose.model('Activity', activitySchema);

// ── Room slug ↔ display-name mapping ───────────────────

const SLUG_TO_ROOM = {
  MainHall: 'Main Hall',
  FoodCourt: 'Food Court',
  VIPRoom: 'VIP Room',
};

function resolveRoomName(input) {
  // Accept slug ("MainHall") or display name ("Main Hall")
  return SLUG_TO_ROOM[input] || input;
}

// ── Seed Default Rooms ─────────────────────────────────

const DEFAULT_ROOMS = [
  { name: 'Main Hall', capacity: 200 },
  { name: 'Food Court', capacity: 50 },
  { name: 'VIP Room', capacity: 20 },
];

async function seedRooms() {
  for (const room of DEFAULT_ROOMS) {
    await Room.findOneAndUpdate(
      { name: room.name },
      { $setOnInsert: room },
      { upsert: true, new: true }
    );
  }
  console.log('🏠  Rooms seeded');
}
seedRooms();

// ── Helper: Build current state snapshot ───────────────

async function getRoomState() {
  const rooms = await Room.find({});
  const activities = await Activity.find({})
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  return rooms.map((room) => ({
    name: room.name,
    capacity: room.capacity,
    currentOccupancy: room.currentOccupancy,
    recentActivity: activities
      .filter((a) => a.room === room.name)
      .slice(0, 5)
      .map((a) => ({
        message: a.message,
        timestamp: a.timestamp,
      })),
  }));
}

// ── REST API ───────────────────────────────────────────

// GET /api/network-info — return the server's LAN IP for QR code generation
app.get('/api/network-info', (_req, res) => {
  const interfaces = os.networkInterfaces();
  let lanIp = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        lanIp = iface.address;
        break;
      }
    }
    if (lanIp !== 'localhost') break;
  }
  res.json({ ip: lanIp });
});

// GET /api/rooms — fetch current room state
app.get('/api/rooms', async (_req, res) => {
  try {
    const state = await getRoomState();
    res.json({ success: true, rooms: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/scan — simulate a QR code scan (or real mobile check-in)
app.post('/api/scan', async (req, res) => {
  try {
    const { userName, roomName: rawRoomName } = req.body;
    const roomName = resolveRoomName(rawRoomName);

    if (!userName || !roomName) {
      return res.status(400).json({
        success: false,
        error: 'Both userName and roomName are required.',
      });
    }

    // Validate target room
    const targetRoom = await Room.findOne({ name: roomName });
    if (!targetRoom) {
      return res.status(404).json({
        success: false,
        error: `Room "${roomName}" not found.`,
      });
    }

    // Check capacity
    if (targetRoom.currentOccupancy >= targetRoom.capacity) {
      return res.status(409).json({
        success: false,
        error: `"${roomName}" is at full capacity (${targetRoom.capacity}).`,
      });
    }

    // Find or create user
    let user = await User.findOne({ name: userName });
    if (!user) {
      user = await User.create({ name: userName, currentLocation: null });
    }

    // If user is already in the target room, no-op
    if (user.currentLocation === roomName) {
      return res.json({
        success: true,
        message: `${userName} is already in ${roomName}.`,
      });
    }

    let activityMessage = '';

    // ── Transfer Logic ──
    // 1. Decrement old room if user was somewhere
    if (user.currentLocation) {
      await Room.findOneAndUpdate(
        { name: user.currentLocation },
        { $inc: { currentOccupancy: -1 } }
      );
      activityMessage = `${userName} moved from ${user.currentLocation} to ${roomName}`;
    } else {
      activityMessage = `${userName} entered ${roomName}`;
    }

    // 2. Increment new room
    await Room.findOneAndUpdate(
      { name: roomName },
      { $inc: { currentOccupancy: 1 } }
    );

    // 3. Update user location
    user.currentLocation = roomName;
    user.timestamp = new Date();
    await user.save();

    // 4. Log the activity
    await Activity.create({ message: activityMessage, room: roomName });

    // 5. Broadcast real-time update via Socket.io
    const updatedState = await getRoomState();
    io.emit('roomUpdate', updatedState);
    io.emit('activity', { message: activityMessage, room: roomName, timestamp: new Date() });

    res.json({ success: true, message: activityMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/exit — user leaves venue entirely
app.post('/api/exit', async (req, res) => {
  try {
    const { userName } = req.body;
    if (!userName) {
      return res.status(400).json({ success: false, error: 'userName is required.' });
    }

    const user = await User.findOne({ name: userName });
    if (!user || !user.currentLocation) {
      return res.json({ success: true, message: `${userName} is not in any room.` });
    }

    const prevRoom = user.currentLocation;
    await Room.findOneAndUpdate(
      { name: prevRoom },
      { $inc: { currentOccupancy: -1 } }
    );

    user.currentLocation = null;
    user.timestamp = new Date();
    await user.save();

    const activityMessage = `${userName} exited ${prevRoom}`;
    await Activity.create({ message: activityMessage, room: prevRoom });

    const updatedState = await getRoomState();
    io.emit('roomUpdate', updatedState);
    io.emit('activity', { message: activityMessage, room: prevRoom, timestamp: new Date() });

    res.json({ success: true, message: activityMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Socket.io ──────────────────────────────────────────

io.on('connection', async (socket) => {
  console.log(`🔌  Client connected: ${socket.id}`);

  // Send current state on connect
  const state = await getRoomState();
  socket.emit('roomUpdate', state);

  socket.on('disconnect', () => {
    console.log(`🔌  Client disconnected: ${socket.id}`);
  });
});

// ── Start Server ───────────────────────────────────────

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  CrowdLocal server running on http://localhost:${PORT}`);
});
