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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto drop-shadow-lg animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-green-900">Edit Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl transition"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 text-center font-medium transition ${
              activeTab === "profile"
                ? "text-green-700 border-b-2 border-green-700 bg-green-50"
                : "text-gray-600 hover:text-green-700"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-3 text-center font-medium transition ${
              activeTab === "password"
                ? "text-green-700 border-b-2 border-green-700 bg-green-50"
                : "text-gray-600 hover:text-green-700"
            }`}
          >
            Password
          </button>
        </div>

        <div className="p-6 space-y-5">
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
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
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg cursor-pointer hover:bg-green-200 transition"
                  >
                    Choose Photo
                  </label>
                  {profilePicturePreview && (
                    <img
                      src={profilePicturePreview}
                      alt="Profile preview"
                      className="w-14 h-14 rounded-full object-cover border border-green-200"
                    />
                  )}
                </div>
                {uploadProgress > 0 && (
                  <div className="w-full bg-green-100 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-700 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Handicap */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  Handicap
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={handicap}
                  onChange={(e) => setHandicap(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition disabled:opacity-50 font-semibold"
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {["Current", "New", "Confirm New"].map((label, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    {label} Password
                  </label>
                  <input
                    type="password"
                    value={
                      i === 0 ? oldPassword : i === 1 ? newPassword : confirmPassword
                    }
                    onChange={(e) =>
                      i === 0
                        ? setOldPassword(e.target.value)
                        : i === 1
                        ? setNewPassword(e.target.value)
                        : setConfirmPassword(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition disabled:opacity-50 font-semibold"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>
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
    <div className="min-h-screen flex flex-col items-center justify-start bg-green-100 p-6">
      {/* Header */}
      <header className="w-full text-center mb-8 mt-6 flex flex-col items-center">
        <button
          onClick={() => setShowProfileModal(true)}
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-300 hover:border-green-500 transition-all duration-200 shadow-lg hover:shadow-xl mb-3"
        >
          {user?.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-green-200 flex items-center justify-center">
              <span className="text-3xl text-green-700 font-bold">
                {user?.displayName?.charAt(0) || "?"}
              </span>
            </div>
          )}
        </button>

        <p
          onClick={() => setShowProfileModal(true)}
          className="text-green-700 text-sm hover:underline cursor-pointer mb-4"
        >
          Edit profile
        </p>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-green-900">
          Welcome, {user?.displayName || "Golfer"}!
        </h2>
        <p className="text-green-800 mt-2 text-lg">
          Handicap: <span className="font-semibold">{user?.handicap || "—"}</span>
        </p>
      </header>

      {/* Buttons Section */}
      <main className="w-full max-w-xs flex flex-col gap-5">
        <button
          className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold shadow-lg hover:bg-green-800 transition"
          onClick={() => navigate("/leaderboard")}
        >
          View Leaderboard
        </button>

        <button
          className="w-full py-3 bg-yellow-500 text-green-900 rounded-xl font-semibold shadow-lg hover:bg-yellow-600 transition"
          onClick={() => navigate("/scores")}
        >
          Enter Scores
        </button>

        <button
          onClick={() => navigate("/join-team")}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold shadow-lg hover:bg-green-700 transition"
        >
          Join a Team
        </button>

        <button
          onClick={() => navigate("/viewteams")}
          className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold shadow-lg hover:bg-green-600 transition"
        >
          View Teams
        </button>

        <button
          className="w-full py-3 bg-blue-400 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-500 transition"
          onClick={() => navigate("/courses")}
        >
          Course Info
        </button>

        <button
          className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg hover:bg-red-600 transition"
          onClick={handleLogout}
        >
          Logout
        </button>
      </main>

      <footer className="mt-12 text-green-900 text-sm">
        2025 Golf Trip Leaderboard
      </footer>

      {showProfileModal && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
