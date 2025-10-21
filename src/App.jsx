import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import JoinTeam from "./pages/JoinTeam";
import { courses } from "./data/courses";
import EnterScoreWrapper from "./pages/EnterScoreWrapper";
import ViewTeams from "./pages/ViewTeams";
import ViewMembers from "./pages/ViewMembers";
import CourseInfo from "./pages/CourseInfo";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router basename={import.meta.env.PROD ? "/golf-trip" : "/"}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/scores"
              element={
                <PrivateRoute>
                  <EnterScoreWrapper courses={courses} />
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
            <Route
              path="/members"
              element={
                <PrivateRoute>
                  <ViewMembers />
                </PrivateRoute>
              }
            />
            <Route path="/courses" element={<CourseInfo />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
