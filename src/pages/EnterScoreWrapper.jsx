import React from "react";
import { useAuth } from "../context/AuthContext";
import EnterScore from "./EnterScore";

export default function EnterScoreWrapper() {
  const { user } = useAuth();
  return <EnterScore userId={user?.uid} user={user} />;
}
