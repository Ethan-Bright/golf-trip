import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6 relative overflow-hidden">
      {/* Swish Background Effect */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-green-400 to-green-600 rounded-full blur-3xl transform -rotate-12"></div>
          <div className="absolute top-32 right-20 w-80 h-80 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full blur-3xl transform rotate-12"></div>
          <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-green-300 to-yellow-500 rounded-full blur-3xl transform rotate-45"></div>
          <div className="absolute bottom-10 right-1/3 w-64 h-64 bg-gradient-to-br from-yellow-300 to-green-500 rounded-full blur-3xl transform -rotate-30"></div>
        </div>
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-green-300 dark:border-green-500 shadow-xl hover:shadow-2xl transition-all duration-200 mb-4 group"
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

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {user?.displayName || "Golfer"}!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Handicap:{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {user?.handicap || "—"}
            </span>
          </p>
        </header>

        {/* Navigation Cards */}
        <main className="space-y-4 mb-8">
          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={() => navigate("/leaderboard")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Leaderboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  View tournament standings
                </p>
              </div>
            </div>
          </button>

          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={() => navigate("/scores")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7H3v2h16V4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Enter Scores
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Record your round scores
                </p>
              </div>
            </div>
          </button>

          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={() => navigate("/join-team")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-2 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm0 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Join Team
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Join a tournament team
                </p>
              </div>
            </div>
          </button>

          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={() => navigate("/viewteams")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  View Teams
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Browse all teams
                </p>
              </div>
            </div>
          </button>

          {/* New Course Details Button */}
          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={() => navigate("/courses")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 17.93c-3.95.49-7.43-2.54-7.93-6.49a8.003 8.003 0 0115.86-1.53c.5 3.95-2.54 7.43-6.49 7.93zM11 6h2v6h-2V6zm0 8h2v2h-2v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Course Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  View information about courses
                </p>
              </div>
            </div>
          </button>

          <button
            className="w-full p-6 bg-white dark:bg-gray-800 text-left rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Sign Out
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Logout from your account
                </p>
              </div>
            </div>
          </button>
        </main>

        <footer className="text-center text-gray-500 dark:text-gray-400 text-sm">
          © 2025 Golf Trip Leaderboard
        </footer>

        {showProfileModal && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfileModal(false)}
          />
        )}
      </div>
    </div>
  );
}
