import React, { useState } from "react";
import { courses } from "../data/courses";
import SearchableCourseDropdown from "../components/SearchableCourseDropdown";
import PageShell from "../components/layout/PageShell";

export default function CourseInfo() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [flyover, setFlyover] = useState(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);
  const showFlyover = selectedCourseData?.id === "pezula";

  const totalPar = selectedCourseData
    ? selectedCourseData.holes.reduce((sum, hole) => sum + hole.par, 0)
    : 0;

  return (
    <PageShell
      title="Course Information"
      description="Select a course to view detailed hole data, par, and flyover videos."
      backText="Dashboard"
      backHref="/dashboard"
    >
      <div
        className={`mobile-card p-5 border border-green-100/70 dark:border-gray-800/70 ${
          isDropdownOpen ? "relative z-40" : ""
        }`}
      >
        <SearchableCourseDropdown
          courses={courses}
          selectedCourseId={selectedCourse}
          onCourseSelect={setSelectedCourse}
          placeholder="Select a Course"
          label=""
          error={false}
          className="text-lg font-medium"
          onDropdownToggle={setDropdownOpen}
        />
      </div>

      {selectedCourseData ? (
        <div className="mobile-card overflow-hidden border border-gray-100 dark:border-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedCourseData.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {selectedCourseData.holes.length} Holes • Par {totalPar}
            </p>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {selectedCourseData.holes.map((hole) => (
              <div key={hole.holeNumber} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Hole</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {hole.holeNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-gray-500">Par</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {hole.par}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Stroke Index</span>
                  <span className="font-semibold">{hole.strokeIndex}</span>
                </div>
                {hole.info && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {hole.info}
                  </p>
                )}
                {showFlyover && (
                  <button
                    onClick={() =>
                      setFlyover({
                        url: hole.video,
                        holeNumber: hole.holeNumber,
                        course: selectedCourseData.name,
                      })
                    }
                    disabled={!hole.video}
                    className={`w-full rounded-2xl px-4 py-2 text-sm font-semibold shadow ${
                      hole.video
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {hole.video ? "View Flyover" : "No Flyover Available"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
      ) : (
        <div className="mobile-card p-10 text-center border border-dashed border-green-200 dark:border-gray-700">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
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
          <p className="text-gray-600 dark:text-gray-300 text-base">
            Select a course above to see hole-by-hole details.
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
    </PageShell>
  );
}
