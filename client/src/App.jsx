import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import CheckIn from './CheckIn';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/checkin/:roomName" element={<CheckIn />} />
      </Routes>
    </BrowserRouter>
  );
}
