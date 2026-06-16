import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { TournamentProvider } from "./context/TournamentContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import JoinTeam from "./pages/JoinTeam";
import TournamentSelect from "./pages/TournamentSelect";
import { courses } from "./data/courses";
import EnterScoreWrapper from "./pages/EnterScoreWrapper";
import CreateGameWrapper from "./pages/CreateGameWrapper";
import ViewTeams from "./pages/ViewTeams";
import ViewMembers from "./pages/ViewMembers";
import CourseInfo from "./pages/CourseInfo";
import MyStats from "./pages/MyStats";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import HowToUse from "./pages/HowToUse";
import SubmitSuggestion from "./pages/SubmitSuggestion";
import InviteFriend from "./pages/InviteFriend";
import JoinGame from "./pages/JoinGame";
import MobileNav from "./components/layout/MobileNav";
import PWARefreshControl from "./components/PWARefreshControl";
import InstallPrompt from "./components/InstallPrompt";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait until loading completes
  if (!user) return <Navigate to="/login" />;
  return children;
}

function InviteGameRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteGameId = searchParams.get("inviteGame");

  React.useEffect(() => {
    if (inviteGameId) {
      navigate(`/join-game/${inviteGameId}`, { replace: true });
    }
  }, [inviteGameId, navigate]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <InviteGameRedirect />
      <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/join-game/:gameId" element={<JoinGame />} />
                  <Route
                    path="/scores"
                    element={
                      <PrivateRoute>
                        <EnterScoreWrapper />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/create-game"
                    element={
                      <PrivateRoute>
                        <CreateGameWrapper courses={courses} />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tournament-select"
                    element={
                      <PrivateRoute>
                        <TournamentSelect />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <PrivateRoute>
                        <Leaderboard />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/join-team" element={<JoinTeam />} />
                  <Route
                    path="/ViewTeams"
                    element={
                      <PrivateRoute>
                        <ViewTeams />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/members" element={<ViewMembers />} />
                  <Route
                    path="/course-info"
                    element={
                      <PrivateRoute>
                        <CourseInfo />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/my-stats"
                    element={
                      <PrivateRoute>
                        <MyStats />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/how-to-use"
                    element={
                      <PrivateRoute>
                        <HowToUse />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/submit-suggestion"
                    element={
                      <PrivateRoute>
                        <SubmitSuggestion />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/invite-friend"
                    element={
                      <PrivateRoute>
                        <InviteFriend />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
      <MobileNav />
      <PWARefreshControl />
      <InstallPrompt />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TournamentProvider>
          <Router>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </Router>
        </TournamentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
