import React, { useState, useEffect } from "react";
import { db, createdAt } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function ScoreEntry({ tournamentId }) {
  const { user } = useAuth();
  const [holeInputs, setHoleInputs] = useState(Array(18).fill("")); // 1..18

  async function saveScores(e) {
    e.preventDefault();
    try {
      for (let i = 0; i < 18; i++) {
        const gross = parseInt(holeInputs[i], 10);
        if (isNaN(gross)) continue; // skip empty holes
        await addDoc(collection(db, "scores"), {
          tournamentId,
          playerUid: user.uid,
          holeNumber: i + 1,
          grossScore: gross,
          createdAt: createdAt()
        });
      }
      alert("Scores saved");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  return (
    <form onSubmit={saveScores}>
      <h3>Enter your gross scores</h3>
      <div style={{display:"grid", gridTemplateColumns: "repeat(6,1fr)", gap:8}}>
        {holeInputs.map((v, idx) => (
          <div key={idx}>
            <label>Hole {idx+1}</label>
            <input inputMode="numeric" value={v} onChange={e=>{
              const a = [...holeInputs]; a[idx] = e.target.value; setHoleInputs(a);
            }}/>
          </div>
        ))}
      </div>
      <button type="submit">Save scores</button>
    </form>
  );
}
