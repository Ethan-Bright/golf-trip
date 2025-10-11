import React, { useState } from "react";
import { courses } from "../data/courses";

export default function ViewCourses() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedHole, setSelectedHole] = useState(null);
  const [showInteractive, setShowInteractive] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center bg-green-50 p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-6 text-center">
        Course Info
      </h1>

      {/* Course Dropdown */}
      <select
        onChange={(e) => {
          const course = courses.find((c) => c.id === e.target.value);
          setSelectedCourse(course);
          setSelectedHole(null);
          setShowInteractive(false); // reset interactive view when course changes
        }}
        defaultValue=""
        className="mb-6 w-full max-w-xs p-3 rounded-lg border border-green-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
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

      {/* Hole Dropdown */}
      {selectedCourse && (
        <select
          onChange={(e) => {
            const hole = selectedCourse.holes.find(
              (h) => h.holeNumber === parseInt(e.target.value)
            );
            setSelectedHole(hole);
          }}
          defaultValue=""
          className="mb-6 w-full max-w-xs p-3 rounded-lg border border-green-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
        >
          <option value="" disabled>
            Select a Hole
          </option>
          {selectedCourse.holes.map((hole) => (
            <option key={hole.holeNumber} value={hole.holeNumber}>
              Hole {hole.holeNumber} - Par {hole.par}
            </option>
          ))}
        </select>
      )}

      {/* Hole Info Card */}
      {selectedHole && (
        <div className="w-full max-w-md bg-white border border-green-200 rounded-lg p-4 shadow-sm mb-4">
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Hole {selectedHole.holeNumber}
          </h2>
          <p className="mb-1">
            <span className="font-semibold">Par:</span> {selectedHole.par}
          </p>
          <p className="mb-1">
            <span className="font-semibold">S.I.:</span>{" "}
            {selectedHole.strokeIndex}
          </p>
          <p className="mb-3">
            <span className="font-semibold">Info:</span> {selectedHole.info}
          </p>

          {selectedCourse.id === "pezula" && selectedHole.video && (
            <div className="w-full aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={selectedHole.video}
                title={`Hole ${selectedHole.holeNumber} Video`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
        </div>
      )}

      {/* Goosevalley Interactive Button */}
      {selectedCourse?.id === "goosevalley" && (
        <button
          onClick={() => setShowInteractive((prev) => !prev)}
          className="mb-4 px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          {showInteractive
            ? "Hide Interactive Course"
            : "View Interactive Course"}
        </button>
      )}

      {/* Goosevalley Interactive Iframe */}
      {selectedCourse?.id === "goose_valley" && (
        <button
          onClick={() => setShowInteractive((prev) => !prev)}
          className="mb-4 px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          {showInteractive
            ? "Hide Interactive Course"
            : "View Interactive Course"}
        </button>
      )}
    </div>
  );
}
