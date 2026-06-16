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
        <label className="field-label">
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
          className={`input text-left flex items-center justify-between ${
            error ? "border-red-500" : ""
          } ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <span className={selectedTournamentId ? "" : "text-[var(--text-muted)]"}>
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
          <div className="card card-elevated absolute z-10 w-full mt-1 overflow-hidden">
            {/* Search Input inside Dropdown */}
            <div className="p-2 border-b border-[var(--surface-card-border)]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search tournaments..."
                className="input"
                autoFocus
              />
            </div>

            {/* Tournament List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredTournaments.length === 0 ? (
                <div className="p-3 text-[var(--text-muted)] text-center">
                  No tournaments found matching "{searchTerm}"
                </div>
              ) : (
                filteredTournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    onClick={() => handleTournamentSelect(tournament.id)}
                    className={`w-full p-3 text-left hover:bg-brand-500/10 transition-colors ${
                      selectedTournamentId === tournament.id
                        ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                        : "text-[var(--text-strong)]"
                    }`}
                  >
                    <div className="font-medium">{tournament.name}</div>
                    {showMemberCount && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">
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


