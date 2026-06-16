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
        className={`mobile-card p-5 ${
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
        <div className="mobile-card overflow-hidden">
          <div className="p-6 border-b border-[var(--surface-card-border)]">
            <h3 className="text-2xl font-bold text-[var(--text-strong)]">
              {selectedCourseData.name}
            </h3>
            <p className="text-[var(--text-muted)] mt-1">
              {selectedCourseData.holes.length} Holes • Par {totalPar}
            </p>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[var(--surface-card-border)]">
            {selectedCourseData.holes.map((hole) => (
              <div key={hole.holeNumber} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-[var(--text-muted)]">Hole</p>
                    <p className="text-lg font-semibold text-[var(--text-strong)]">
                      {hole.holeNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-[var(--text-muted)]">Par</p>
                    <p className="text-lg font-semibold text-brand-600 dark:text-brand-300">
                      {hole.par}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                  <span>Stroke Index</span>
                  <span className="font-semibold">{hole.strokeIndex}</span>
                </div>
                {hole.info && (
                  <p className="text-sm text-[var(--text-muted)]">
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
                    className={`btn btn-block ${
                      hole.video ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {hole.video ? "View Flyover" : "No Flyover Available"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto hide-scrollbar">
            <table className="w-full">
              <thead className="bg-brand-500/15">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-strong)]">
                    Hole
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-strong)]">
                    Par
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-strong)]">
                    Stroke Index
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-strong)]">
                    Information
                  </th>
                  {showFlyover && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-strong)]">
                      Flyover
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-card-border)]">
                {selectedCourseData.holes.map((hole, index) => (
                  <tr
                    key={hole.holeNumber}
                    className={
                      index % 2 === 0
                        ? "bg-transparent"
                        : "bg-[var(--surface-muted)]"
                    }
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-strong)]">
                      {hole.holeNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                      {hole.par}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                      {hole.strokeIndex}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
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
                            className="btn btn-primary btn-sm"
                          >
                            View Hole Flyover
                          </button>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">
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
        <div className="mobile-card p-10 text-center border border-dashed border-brand-500/40">
          <svg
            className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4"
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
          <p className="text-[var(--text-muted)] text-base">
            Select a course above to see hole-by-hole details.
          </p>
        </div>
      )}

      {flyover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card card-elevated w-full max-w-3xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-[var(--surface-card-border)] p-6">
              <div>
                <h4 className="text-xl font-semibold text-[var(--text-strong)]">
                  {flyover.course} • Hole {flyover.holeNumber}
                </h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Flyover video
                </p>
              </div>
              <button
                onClick={() => setFlyover(null)}
                className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-brand-400"
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
