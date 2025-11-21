import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import TournamentModal from "../components/TournamentModal";
import PageShell from "../components/layout/PageShell";

// Profile Modal Component
function ProfileModal({ user, onClose }) {
  const { updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [handicap, setHandicap] = useState(user?.handicap || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(
    user?.profilePictureUrl || null
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicturePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    setUploadProgress(0);

    try {
      await updateProfile(displayName, handicap, profilePicture, (progress) => {
        setUploadProgress(progress);
      });
      setSuccess("Profile updated successfully!");
      setProfilePicture(null);
      setUploadProgress(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(oldPassword, newPassword);
      setSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Profile Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 text-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl p-1"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-4 text-center font-medium ${
              activeTab === "profile"
                ? "text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-4 text-center font-medium ${
              activeTab === "password"
                ? "text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Password
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    id="profile-picture-edit"
                  />
                  <label
                    htmlFor="profile-picture-edit"
                    className="px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-2xl cursor-pointer font-medium"
                  >
                    Choose Photo
                  </label>
                  {profilePicturePreview && (
                    <img
                      src={profilePicturePreview}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-green-200 dark:border-green-700"
                    />
                  )}
                </div>
                {uploadProgress > 0 && (
                  <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-600 dark:bg-green-400 h-2 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                  required
                />
              </div>

              {/* Handicap */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Handicap
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={handicap}
                  onChange={(e) => setHandicap(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              {["Current", "New", "Confirm New"].map((label, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {label} Password
                  </label>
                  <input
                    type="password"
                    value={
                      i === 0
                        ? oldPassword
                        : i === 1
                        ? newPassword
                        : confirmPassword
                    }
                    onChange={(e) => {
                      if (i === 0) setOldPassword(e.target.value);
                      else if (i === 1) setNewPassword(e.target.value);
                      else setConfirmPassword(e.target.value);
                    }}
                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                    required
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-2xl text-sm">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { currentTournament, setTournament } = useTournament();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentName, setTournamentName] = useState("");
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Always fetch tournament name when currentTournament changes
  useEffect(() => {
    const fetchTournamentName = async () => {
      if (currentTournament) {
        const tournamentRef = doc(db, "tournaments", currentTournament);
        const tournamentSnap = await getDoc(tournamentRef);
        if (tournamentSnap.exists()) {
          setTournamentName(tournamentSnap.data().name);
        }
      }
    };

    fetchTournamentName();
  }, [currentTournament]);

  useEffect(() => {
    const fetchTournaments = async () => {
      // First, get fresh user data from Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const userData = userSnapshot.data();
      const userTournaments = userData?.tournaments || [];
      
      if (!userTournaments || userTournaments.length === 0) {
        setTournaments([]);
        return;
      }
      
      const tournamentData = await Promise.all(
        userTournaments.map(async (tournamentId) => {
          const tournamentRef = doc(db, "tournaments", tournamentId);
          const tournamentSnap = await getDoc(tournamentRef);
          if (tournamentSnap.exists()) {
            return {
              id: tournamentId,
              ...tournamentSnap.data(),
            };
          }
          return null;
        })
      );
      
      setTournaments(tournamentData.filter(Boolean));
      
      // Get current tournament name
      if (currentTournament) {
        const currentRef = doc(db, "tournaments", currentTournament);
        const currentSnap = await getDoc(currentRef);
        if (currentSnap.exists()) {
          setTournamentName(currentSnap.data().name);
        } else {
          // Try to find in tournament data
          const current = tournamentData.find(t => t?.id === currentTournament);
          if (current) {
            setTournamentName(current.name);
          }
        }
      }
    };

    if (user?.uid) {
      fetchTournaments();
    }
  }, [user?.uid, currentTournament]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const handleMenuNavigate = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleEditProfile = () => {
    setShowProfileModal(true);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  const formatUpdatedAt = (timestamp) => {
    if (!timestamp) return "Not updated yet";
    try {
      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().toLocaleString();
      }
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString();
      }
    } catch (error) {
      console.error("Error formatting timestamp:", error);
    }
    return "Not updated yet";
  };

  const quickActions = [
    {
      title: "Edit Profile",
      description: "Update your details & handicap",
      iconClass:
        "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300",
      onClick: handleEditProfile,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z" />
          <path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" />
        </svg>
      ),
    },
    {
      title: "How to Use",
      description: "Guide new golfers through the flow",
      iconClass:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300",
      onClick: () => handleMenuNavigate("/how-to-use"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 17A2.5 2.5 0 0 0 4 14.5V4.5A2.5 2.5 0 0 1 6.5 2H20v17" />
        </svg>
      ),
    },
    {
      title: "Submit Suggestions",
      description: "Request features or tweaks",
      iconClass:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
      onClick: () => handleMenuNavigate("/submit-suggestion"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.9A5 5 0 0 1 9 18h6a5 5 0 0 1 1-3.1A7 7 0 0 0 12 2z" />
        </svg>
      ),
    },
    {
      title: "Invite Friend",
      description: "Share the trip with others",
      iconClass:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
      onClick: () => handleMenuNavigate("/invite-friend"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <path d="m17 11 2 2 4-4" />
        </svg>
      ),
    },
  ];

  const navCards = [
    {
      title: "Leaderboard",
      description: "View tournament standings",
      onClick: () => navigate("/leaderboard"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
    {
      title: "Create Match",
      description: "Create or edit a match for your group",
      onClick: () => navigate("/create-game"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
        </svg>
      ),
    },
    {
      title: "Enter Scores",
      description: "Join an existing match to enter scores",
      onClick: () => navigate("/scores"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7H3v2h16V4z" />
        </svg>
      ),
    },
    {
      title: "Join / Leave Team",
      description: "Manage your tournament teams",
      onClick: () => navigate("/join-team"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-2 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm0 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
        </svg>
      ),
    },
    {
      title: "View Teams",
      description: "Browse all tournament teams",
      onClick: () => navigate("/viewteams"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
      ),
    },
    {
      title: "View Members",
      description: "See tournament or all users",
      onClick: () => navigate("/members"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-2 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm0 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
        </svg>
      ),
    },
    {
      title: "View My Stats",
      description: "Review your personal statistics",
      onClick: () => navigate("/my-stats"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
    },
    {
      title: "Course Information",
      description: "View course details & hole information",
      onClick: () => navigate("/course-info"),
      iconClass:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      title: "Sign Out",
      description: "Log out of your account",
      onClick: handleLogout,
      iconClass: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <PageShell
        title={user?.displayName ? `Welcome, ${user.displayName}!` : "Welcome!"}
        // description="Manage tournaments, matches, and stats from one place."
        showBackButton={false}
        actions={null}
        headerClassName="text-center"
        contentClassName="pb-28"
      >
        <div className="fixed top-4 left-4 z-40" ref={menuRef}>
          <button
            type="button"
            aria-label="Open quick menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-700 shadow-xl backdrop-blur flex flex-col items-center justify-center gap-1 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 dark:focus:ring-offset-gray-900"
          >
            <span
              className={`block w-6 h-0.5 rounded-full bg-green-600 dark:bg-green-300 transition transform ${
                isMenuOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full bg-green-600 dark:bg-green-300 transition ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full bg-green-600 dark:bg-green-300 transition transform ${
                isMenuOpen ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </button>

          {isMenuOpen && (
            <div className="mt-3 w-64 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-green-100 dark:border-gray-700 p-3 space-y-2">
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 px-2">
                Quick actions
              </p>
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 text-left text-gray-800 dark:text-gray-100 transition"
                >
                  <span
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center ${action.iconClass}`}
                  >
                    {action.icon}
                  </span>
                  <div>
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="mobile-card p-6 text-center space-y-4">
          <button
            onClick={() => setShowProfileModal(true)}
            className="mx-auto w-24 h-24 rounded-3xl overflow-hidden border-4 border-green-300 dark:border-green-500 shadow-xl hover:shadow-2xl transition-all duration-200 group"
          >
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 flex items-center justify-center group-hover:from-green-500 group-hover:to-green-700 dark:group-hover:from-green-600 dark:group-hover:to-green-800 transition-all duration-200">
                <span className="text-3xl text-white font-bold">
                  {user?.displayName?.charAt(0) || "?"}
                </span>
              </div>
            )}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-gray-600 dark:text-gray-300">
            <div>
              <p className="text-xs uppercase tracking-wide">Handicap</p>
              <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                {user?.handicap || "—"}
              </p>
            </div>
            {tournamentName && (
              <div className="sm:border-l sm:border-gray-200/70 dark:sm:border-gray-700/70 sm:pl-4">
                <p className="text-xs uppercase tracking-wide">Current tournament</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {tournamentName}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowTournamentModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-yellow-300/70 dark:border-yellow-500/60 bg-yellow-500/90 dark:bg-yellow-500/30 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-yellow-100 shadow-sm hover:bg-yellow-500 dark:hover:bg-yellow-500/40 transition"
            >
              Manage tournaments
            </button>
          </div>
        </section>

        {tournaments.length > 0 && (
          <section className="mobile-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Your tournaments
              </h3>
              <button
                onClick={() => setShowTournamentModal(true)}
                className="text-sm font-semibold text-green-600 dark:text-green-300"
              >
                Manage
              </button>
            </div>
            <ul className="space-y-3">
              {tournaments.slice(0, 3).map((tournament) => (
                <li
                  key={tournament.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100/60 dark:border-gray-800 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {tournament.name || "Untitled tournament"}
                    </p>
                  </div>
                  {currentTournament === tournament.id ? (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => setTournament(tournament.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-xl border border-green-200 text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/10"
                    >
                      Set active
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {tournaments.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing your most recent tournaments
              </p>
            )}
          </section>
        )}

        <section className="mobile-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Navigate the app
          </h3>
          <div className="flex flex-col gap-3">
            {navCards.map((card) => (
              <button
                key={card.title}
                onClick={card.onClick}
                className="w-full flex items-center gap-4 rounded-2xl px-3 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/70 transition"
              >
                <span
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.iconClass}`}
                >
                  {card.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {card.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
          Golf Trip Leaderboard
        </p>
      </PageShell>

      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          className={showProfileModal ? "block" : "hidden"}
        />
      )}
      <TournamentModal
        isOpen={showTournamentModal}
        onClose={() => setShowTournamentModal(false)}
      />
    </>
  );
}
