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

  const handleCourseSelect = (courseId) => {
    onCourseSelect(courseId);
    setIsDropdownOpen(false);
    setSearchTerm(""); // Reset search after selection
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          className={`w-full p-3 sm:p-4 rounded-2xl border ${
            error
              ? "border-red-500"
              : "border-gray-200 dark:border-gray-600"
          } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 text-left flex items-center justify-between ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <span className={selectedCourseId ? "" : "text-gray-500 dark:text-gray-400"}>
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
                placeholder="Type to search courses..."
                className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-700"
                autoFocus
              />
            </div>

            {/* Course List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                  No courses found matching "{searchTerm}"
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelect(course.id)}
                    className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      selectedCourseId === course.id
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "text-gray-900 dark:text-white"
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

