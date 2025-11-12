import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courses } from "../data/courses";

export default function CourseInfo() {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [flyover, setFlyover] = useState(null);

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);
  const showFlyover = selectedCourseData?.id === "pezula";

  // Calculate total par for header display
  const totalPar = selectedCourseData
    ? selectedCourseData.holes.reduce((sum, hole) => sum + hole.par, 0)
    : 0;

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 relative">
      {/* Swish Background Effect */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-green-400 to-green-600 rounded-full blur-3xl transform -rotate-12"></div>
          <div className="absolute top-32 right-20 w-80 h-80 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full blur-3xl transform rotate-12"></div>
          <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-green-300 to-yellow-500 rounded-full blur-3xl transform rotate-45"></div>
          <div className="absolute bottom-10 right-1/3 w-64 h-64 bg-gradient-to-br from-yellow-300 to-green-500 rounded-full blur-3xl transform -rotate-30"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto p-6 pb-24">
        {/* Header */}
        <header className="text-center mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Course Information
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Select a course to view detailed information
          </p>
        </header>

        {/* Course Dropdown */}
        <div className="mb-6">
          <select
            onChange={(e) => setSelectedCourse(e.target.value)}
            value={selectedCourse || ""}
            className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 text-lg font-medium"
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
        </div>

        {/* Course Info Table */}
        {selectedCourseData && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCourseData.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {selectedCourseData.holes.length} Holes • Par {totalPar}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Hole
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Par
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Stroke Index
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Information
                    </th>
                    {showFlyover && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Flyover
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedCourseData.holes.map((hole, index) => (
                    <tr
                      key={hole.holeNumber}
                      className={
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50 dark:bg-gray-700/50"
                      }
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {hole.holeNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {hole.par}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {hole.strokeIndex}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {hole.info}
                      </td>
                      {showFlyover && (
                        <td className="px-4 py-3">
                          {hole.video ? (
                            <button
                              onClick={() =>
                                setFlyover({
                                  url: hole.video,
                                  holeNumber: hole.holeNumber,
                                  course: selectedCourseData.name,
                                })
                              }
                              className="inline-flex items-center rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                            >
                              View Hole Flyover
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              Not available
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedCourseData && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Please select a course from the dropdown above to view its
              information
            </p>
          </div>
        )}
        {flyover && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
              <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {flyover.course} • Hole {flyover.holeNumber}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Flyover video
                  </p>
                </div>
                <button
                  onClick={() => setFlyover(null)}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus:ring-offset-gray-900"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={flyover.url}
                  title={`Hole ${flyover.holeNumber} flyover`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
