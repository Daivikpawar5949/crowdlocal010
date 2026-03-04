import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';

// ── Socket Connection ──────────────────────────────────
// Dynamically resolve backend URL so it works from mobile (LAN IP) and laptop (localhost) alike
const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5001`;
const socket = io(SERVER_URL);

// ── Room Color Map ─────────────────────────────────────
const ROOM_COLORS = {
  'Main Hall': { bar: 'bg-blue-500', glow: 'shadow-blue-500/30', text: 'text-blue-400', border: 'border-blue-500/20', qrBg: '#1e3a5f' },
  'Food Court': { bar: 'bg-emerald-500', glow: 'shadow-emerald-500/30', text: 'text-emerald-400', border: 'border-emerald-500/20', qrBg: '#1a3a2a' },
  'VIP Room': { bar: 'bg-purple-500', glow: 'shadow-purple-500/30', text: 'text-purple-400', border: 'border-purple-500/20', qrBg: '#2d1a4e' },
};

// ── Slug map: display name → URL slug ──────────────────
const ROOM_SLUGS = {
  'Main Hall': 'MainHall',
  'Food Court': 'FoodCourt',
  'VIP Room': 'VIPRoom',
};

// ── Sub-Components ─────────────────────────────────────

function ProgressBar({ current, capacity, color }) {
  const percentage = Math.min((current / capacity) * 100, 100);
  const isWarning = percentage > 90;
  const barColor = isWarning ? 'bg-red-500' : color;
  const glowColor = isWarning ? 'shadow-red-500/40' : '';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">Occupancy</span>
        <span className={`font-bold ${isWarning ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
          {current} / {capacity} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out ${glowColor} shadow-lg`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isWarning && (
        <p className="text-red-400 text-xs mt-1 font-semibold animate-pulse">
          ⚠ Capacity critical — over 90%!
        </p>
      )}
    </div>
  );
}

function ActivityLog({ activities }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [activities]);

  if (!activities || activities.length === 0) {
    return <div className="text-slate-500 text-xs italic py-2">No recent activity</div>;
  }

  return (
    <div ref={logRef} className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
      {activities.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-xs animate-fadeIn">
          <span className="text-slate-500 shrink-0 mt-0.5">●</span>
          <span className="text-slate-300">{a.message}</span>
          <span className="text-slate-600 ml-auto shrink-0">
            {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function RoomCard({ room, checkinBaseUrl }) {
  const colors = ROOM_COLORS[room.name] || ROOM_COLORS['Main Hall'];
  const percentage = (room.currentOccupancy / room.capacity) * 100;
  const isWarning = percentage > 90;
  const slug = ROOM_SLUGS[room.name] || room.name.replace(/\s+/g, '');
  const qrUrl = `${checkinBaseUrl}/checkin/${slug}`;

  return (
    <div
      className={`glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] flex flex-col ${
        isWarning ? 'border border-red-500/30 shadow-lg shadow-red-500/10' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className={`text-xl font-bold ${colors.text}`}>{room.name}</h2>
          <p className="text-slate-500 text-xs mt-0.5">Capacity: {room.capacity}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isWarning ? 'bg-red-500' : 'bg-emerald-500'} animate-live-pulse`} />
          <span className={`text-xs font-medium ${isWarning ? 'text-red-400' : 'text-emerald-400'}`}>
            {isWarning ? 'CRITICAL' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Big number */}
      <div className="text-center my-3">
        <span className={`text-5xl font-black ${isWarning ? 'text-red-400' : 'text-white'}`}>
          {room.currentOccupancy}
        </span>
        <span className="text-slate-500 text-lg ml-1">/ {room.capacity}</span>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={room.currentOccupancy} capacity={room.capacity} color={colors.bar} />

      {/* Activity Log */}
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Live Entry Log
        </h3>
        <ActivityLog activities={room.recentActivity} />
      </div>

      {/* QR Code */}
      <div className="mt-auto pt-4 border-t border-slate-700/50 mt-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
          Scan to Check In
        </h3>
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl shadow-lg">
            <QRCodeSVG
              value={qrUrl}
              size={130}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              includeMargin={false}
            />
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-2 font-mono break-all">
          {qrUrl}
        </p>
      </div>
    </div>
  );
}

function GlobalStats({ rooms }) {
  const totalOccupancy = rooms.reduce((s, r) => s + r.currentOccupancy, 0);
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="glass rounded-xl p-4 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Attendees</p>
        <p className="text-2xl font-black text-white">{totalOccupancy}</p>
      </div>
      <div className="glass rounded-xl p-4 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Capacity</p>
        <p className="text-2xl font-black text-white">{totalCapacity}</p>
      </div>
      <div className="glass rounded-xl p-4 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Active Zones</p>
        <p className="text-2xl font-black text-emerald-400">{rooms.filter((r) => r.currentOccupancy > 0).length}</p>
      </div>
      <div className="glass rounded-xl p-4 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Utilization</p>
        <p className="text-2xl font-black text-blue-400">
          {totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0}%
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [connected, setConnected] = useState(false);
  const [checkinBaseUrl, setCheckinBaseUrl] = useState(
    `${window.location.protocol}//${window.location.host}`
  );

  useEffect(() => {
    // Fetch LAN IP from backend so QR codes always use the network IP
    fetch(`${SERVER_URL}/api/network-info`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ip) {
          setCheckinBaseUrl(`http://${data.ip}:3000`);
        }
      })
      .catch(() => {});

    // Fetch initial room state via REST
    fetch(`${SERVER_URL}/api/rooms`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRooms(data.rooms);
      })
      .catch(() => {});

    // Real-time updates via Socket.io
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('roomUpdate', (data) => setRooms(data));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomUpdate');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">CrowdLocal</h1>
              <p className="text-xs text-slate-400">Admin Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'} animate-live-pulse`} />
            <span className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Global Stats */}
        <GlobalStats rooms={rooms} />

        {/* Room Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room.name} room={room} checkinBaseUrl={checkinBaseUrl} />
          ))}

          {rooms.length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className="text-slate-500 text-lg">Connecting to server…</p>
              <p className="text-slate-600 text-sm mt-2">
                Make sure the backend is running on port 5001
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-600">
          CrowdLocal — Real-Time Event Crowd Management System
        </div>
      </footer>
    </div>
  );
}
