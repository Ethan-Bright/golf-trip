import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait until loading completes
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TournamentProvider>
          <Router>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </Router>
        </TournamentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
