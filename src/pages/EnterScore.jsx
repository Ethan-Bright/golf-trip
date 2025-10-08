import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courses } from "../data/courses";
import ScoreEntry from "../components/ScoreEntry";

export default function EnterScore() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const navigate = useNavigate();

  const handleCourseSelect = (e) => {
    const courseId = e.target.value;
    const course = courses.find((c) => c.id === courseId);
    setSelectedCourse(course);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6 text-center">
        Enter Scores
      </h1>

      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
      >
        ← Back to Dashboard
      </button>

      {/* Course Selection Dropdown */}
      <select
        onChange={handleCourseSelect}
        defaultValue=""
        className="mb-6 w-64 p-3 rounded-lg border border-green-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
      >
        <option value="" disabled>
          Select a Course
        </option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>

      {/* Once course is selected, show the ScoreEntry form */}
      {selectedCourse && (
        <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-lg border border-green-100">
          <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
            {selectedCourse.name}
          </h2>
          <ScoreEntry
            tournamentId={selectedCourse.id}
            course={selectedCourse}
          />
        </div>
      )}
    </div>
  );
}
