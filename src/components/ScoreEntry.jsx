import React, { useState, useEffect } from "react";
import { db, createdAt } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import useModal from "../hooks/useModal";

export default function ScoreEntry({ tournamentId, course }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { modal, showModal, hideModal, showSuccess, showError } = useModal();
  const [holeInputs, setHoleInputs] = useState(Array(18).fill(""));
  const [netScores, setNetScores] = useState(Array(18).fill(0));
  const [points, setPoints] = useState(0);

  // Calculate net scores and Stableford points
  const calculateNetScores = () => {
    if (!user?.handicap || !course) return;

    const handicap = user.handicap;
    const baseStroke = Math.floor(handicap / 18);
    const extraStrokes = handicap % 18;

    const updatedNetScores = holeInputs.map((v, idx) => {
      const gross = parseInt(v, 10);
      if (isNaN(gross)) return 0;

      const hole = course.holes[idx];
      const holeStroke =
        baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
      return Math.max(0, gross - holeStroke);
    });

    setNetScores(updatedNetScores);

    const totalPoints = updatedNetScores.reduce((sum, net, idx) => {
      const hole = course.holes[idx];
      if (net === 0) return sum;
      return sum + Math.max(0, hole.par + 2 - net);
    }, 0);

    setPoints(totalPoints);
  };

  const handleInputChange = (e, idx) => {
    const newInputs = [...holeInputs];
    newInputs[idx] = e.target.value;
    setHoleInputs(newInputs);
  };

  const saveScores = async () => {
    try {
      for (let i = 0; i < 18; i++) {
        const gross = parseInt(holeInputs[i], 10);
        if (isNaN(gross)) continue; // skip empty holes
        await addDoc(collection(db, "scores"), {
          tournamentId,
          playerUid: user.uid,
          holeNumber: i + 1,
          grossScore: gross,
          netScore: netScores[i],
          points: Math.max(0, course.holes[i].par + 2 - netScores[i]),
          createdAt: createdAt(),
        });
      }
      showSuccess("Scores saved successfully!", "Success"); // don't reset holeInputs
    } catch (err) {
      console.error(err);
      showError(err.message, "Error");
    }
  };

  useEffect(() => {
    calculateNetScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeInputs]);

  return (
    <div className="card p-6">
      <h3 className="text-xl font-bold text-brand-600 dark:text-brand-300 mb-6 text-center">
        Enter Your With Handicaps Scores
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {holeInputs.map((v, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-3"
          >
            <label className="text-sm font-semibold text-[var(--text-strong)]">
              Hole {idx + 1}{" "}
              <span className="text-xs text-[var(--text-muted)]">
                (Par {course.holes[idx].par})
              </span>
              <span className="text-xs text-[var(--text-muted)] ml-1">
                (S.I. {course.holes[idx].strokeIndex})
              </span>
            </label>

            <input
              inputMode="numeric"
              value={v}
              onChange={(e) => handleInputChange(e, idx)}
              className="input min-h-0 mt-1 h-11 w-16 text-center text-base font-semibold focus:ring-2 focus:ring-brand-500"
              placeholder="-"
            />
            <div className="text-xs text-[var(--text-muted)] mt-1 text-center">
              With Handicaps: {netScores[idx] || "-"} | Points:{" "}
              {netScores[idx]
                ? Math.max(0, course.holes[idx].par + 2 - netScores[idx])
                : "-"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center font-semibold text-lg text-brand-600 dark:text-brand-300">
        Total Points: {points}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
        {/* <button
          type="button"
          onClick={saveScores}
          className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl shadow-md hover:bg-green-800 transition"
        >
          Save Scores
        </button> */}

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="btn btn-secondary"
        >
          Back to Dashboard
        </button>
      </div>
      
      <Modal {...modal} onClose={hideModal} />
    </div>
  );
}
