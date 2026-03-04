import { useState } from 'react';
import { useParams } from 'react-router-dom';

// Dynamically resolve backend so it works from any device on the LAN
const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5001`;

// ── Slug → Display Name Map ────────────────────────────
const SLUG_TO_DISPLAY = {
  MainHall: 'Main Hall',
  FoodCourt: 'Food Court',
  VIPRoom: 'VIP Room',
};

const ROOM_ACCENT = {
  MainHall: { gradient: 'from-blue-600 to-blue-700', ring: 'ring-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500' },
  FoodCourt: { gradient: 'from-emerald-600 to-emerald-700', ring: 'ring-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500' },
  VIPRoom: { gradient: 'from-purple-600 to-purple-700', ring: 'ring-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500' },
};

export default function CheckIn() {
  const { roomName } = useParams(); // slug like "MainHall"
  const displayName = SLUG_TO_DISPLAY[roomName] || roomName;
  const accent = ROOM_ACCENT[roomName] || ROOM_ACCENT.MainHall;

  const [name, setName] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', text }
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatus({ type: 'error', text: 'Please enter your name.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: name.trim(), roomName }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', text: data.message });
        setName('');
      } else {
        setStatus({ type: 'error', text: data.error || 'Something went wrong.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Could not reach server. Try again.' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${accent.gradient} shadow-lg mb-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome to CrowdLocal</h1>
          <p className="text-slate-400 text-sm mt-1">Real-Time Crowd Management</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {/* Room Badge */}
          <div className="text-center mb-6">
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${accent.text} bg-slate-800/80 border border-slate-700/50`}>
              📍 {displayName}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Input */}
            <div>
              <label htmlFor="attendee-name" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                id="attendee-name"
                type="text"
                placeholder="e.g. Daivik"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-base focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-base bg-gradient-to-r ${accent.gradient} hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-black/20`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking in…
                </span>
              ) : (
                `Enter ${displayName}`
              )}
            </button>
          </form>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-5 px-4 py-3 rounded-xl text-sm font-medium text-center transition-all ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {status.type === 'success' ? '✅ ' : '❌ '}
              {status.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          CrowdLocal — Real-Time Event Crowd Management
        </p>
      </div>
    </div>
  );
}
