import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.js';
import LocalSetupPage from './pages/LocalSetupPage.js';
import GamePage from './pages/GamePage.js';
import LobbyPage from './pages/LobbyPage.js';
import RoomPage from './pages/RoomPage.js';
import CompanionHostSetupPage from './pages/CompanionHostSetupPage.js';
import CompanionPage from './pages/CompanionPage.js';
import { SocketWrapper } from './socket/SocketProvider.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local/setup" element={<LocalSetupPage />} />
        <Route path="/local/game" element={<GamePage />} />
        <Route path="/lobby" element={<SocketWrapper><LobbyPage /></SocketWrapper>} />
        <Route path="/room/:roomId" element={<SocketWrapper><RoomPage /></SocketWrapper>} />
        <Route path="/game/:roomId" element={<SocketWrapper><GamePage /></SocketWrapper>} />
        <Route path="/companion/host/setup" element={<SocketWrapper><CompanionHostSetupPage /></SocketWrapper>} />
        <Route path="/companion/host/game/:roomId" element={<SocketWrapper><GamePage /></SocketWrapper>} />
        <Route path="/companion/:roomId" element={<SocketWrapper><CompanionPage /></SocketWrapper>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
