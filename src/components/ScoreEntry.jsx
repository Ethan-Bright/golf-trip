import React, { useState, useEffect } from "react";
import { db, createdAt } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ScoreEntry({ tournamentId, course }) {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      alert("Scores saved!"); // don't reset holeInputs
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  useEffect(() => {
    calculateNetScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeInputs]);

  return (
    <div className="bg-green-50 p-6 rounded-2xl shadow-lg border border-green-100">
      <h3 className="text-xl font-bold text-green-700 mb-6 text-center">
        Enter Your Gross Scores
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {holeInputs.map((v, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center bg-white rounded-lg shadow-sm p-3 border border-green-100"
          >
            <label className="text-sm font-semibold text-green-700">
              Hole {idx + 1}{" "}
              <span className="text-xs text-green-600">
                (Par {course.holes[idx].par})
              </span>
              <span className="text-xs text-green-600 ml-1">
                (S.I. {course.holes[idx].strokeIndex})
              </span>
            </label>

            <input
              inputMode="numeric"
              value={v}
              onChange={(e) => handleInputChange(e, idx)}
              className="mt-1 w-16 text-center border border-green-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="-"
            />
            <div className="text-xs text-green-600 mt-1 text-center">
              Net: {netScores[idx] || "-"} | Points:{" "}
              {netScores[idx]
                ? Math.max(0, course.holes[idx].par + 2 - netScores[idx])
                : "-"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center font-semibold text-lg text-green-700">
        Total Points: {points}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={saveScores}
          className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl shadow-md hover:bg-green-800 transition"
        >
          Save Scores
        </button>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 bg-gray-400 text-white rounded-xl shadow-md hover:bg-gray-500 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
