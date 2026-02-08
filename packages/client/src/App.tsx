import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage.js';
import LocalSetupPage from './pages/LocalSetupPage.js';
import GamePage from './pages/GamePage.js';
import LobbyPage from './pages/LobbyPage.js';
import RoomPage from './pages/RoomPage.js';
import CompanionHostSetupPage from './pages/CompanionHostSetupPage.js';
import CompanionPage from './pages/CompanionPage.js';
import { SocketProvider } from './socket/SocketProvider.js';

/** Layout that provides a single shared socket for all online routes. */
function OnlineLayout() {
  return (
    <SocketProvider>
      <Outlet />
    </SocketProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local/setup" element={<LocalSetupPage />} />
        <Route path="/local/game" element={<GamePage />} />
        <Route element={<OnlineLayout />}>
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
          <Route path="/companion/host/setup" element={<CompanionHostSetupPage />} />
          <Route path="/companion/host/game/:roomId" element={<GamePage />} />
          <Route path="/companion/:roomId" element={<CompanionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
