import React, { useState, useEffect, useRef } from "react";

export default function SearchableTournamentDropdown({
  tournaments,
  selectedTournamentId,
  onTournamentSelect,
  placeholder = "Select a tournament",
  label = "Select Tournament",
  disabled = false,
  error = false,
  className = "",
  showMemberCount = true,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filter tournaments based on search term
  const filteredTournaments = tournaments.filter((tournament) =>
    tournament.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected tournament name for display
  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);
  const displayText = selectedTournament
    ? `${selectedTournament.name}${showMemberCount ? ` (${selectedTournament.memberCount || 0} members)` : ""}`
    : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm(""); // Reset search when closing
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTournamentSelect = (tournamentId) => {
    onTournamentSelect(tournamentId);
    setIsDropdownOpen(false);
    setSearchTerm(""); // Reset search after selection
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsDropdownOpen(!isDropdownOpen);
              setSearchTerm(""); // Reset search when opening
            }
          }}
          disabled={disabled}
          className={`w-full px-3 py-2 rounded-xl border ${
            error
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-700"
          } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 text-left flex items-center justify-between ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <span className={selectedTournamentId ? "" : "text-gray-500 dark:text-gray-400"}>
            {displayText}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isDropdownOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg">
            {/* Search Input inside Dropdown */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search tournaments..."
                className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-700"
                autoFocus
              />
            </div>

            {/* Tournament List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredTournaments.length === 0 ? (
                <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                  No tournaments found matching "{searchTerm}"
                </div>
              ) : (
                filteredTournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    onClick={() => handleTournamentSelect(tournament.id)}
                    className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      selectedTournamentId === tournament.id
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="font-medium">{tournament.name}</div>
                    {showMemberCount && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {tournament.memberCount || 0} members
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


