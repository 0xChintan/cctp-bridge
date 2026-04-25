import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Bridge } from './components/Bridge';
import { Docs } from './pages/Docs';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Navbar />
          <Routes>
            <Route path="/" element={<Bridge />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
