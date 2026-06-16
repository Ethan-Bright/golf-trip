import React, { useState, useEffect, useRef } from "react";

export default function SearchableCourseDropdown({
  courses,
  selectedCourseId,
  onCourseSelect,
  placeholder = "Select a course",
  label = "Select Course",
  disabled = false,
  error = false,
  className = "",
  onDropdownToggle,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filter courses based on search term
  const filteredCourses = courses.filter((course) =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected course name for display
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const displayText = selectedCourse ? selectedCourse.name : placeholder;

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

  useEffect(() => {
    if (typeof onDropdownToggle === "function") {
      onDropdownToggle(isDropdownOpen);
    }
  }, [isDropdownOpen, onDropdownToggle]);

  const handleCourseSelect = (courseId) => {
    onCourseSelect(courseId);
    setIsDropdownOpen(false);
    setSearchTerm(""); // Reset search after selection
  };

  return (
    <div
      className={`relative ${isDropdownOpen ? "z-20" : ""} ${className}`}
      ref={dropdownRef}
    >
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
          <span className={selectedCourseId ? "" : "text-[var(--text-muted)]"}>
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
          <div className="card card-elevated absolute z-30 w-full mt-1 overflow-hidden">
            {/* Search Input inside Dropdown */}
            <div className="p-2 border-b border-[var(--surface-card-border)]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search courses..."
                className="input"
                autoFocus
              />
            </div>

            {/* Course List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-3 text-[var(--text-muted)] text-center">
                  No courses found matching "{searchTerm}"
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelect(course.id)}
                    className={`w-full p-3 text-left hover:bg-brand-500/10 transition-colors ${
                      selectedCourseId === course.id
                        ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                        : "text-[var(--text-strong)]"
                    }`}
                  >
                    <div className="font-medium">{course.name}</div>
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


