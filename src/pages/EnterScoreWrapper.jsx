import React from "react";
import { useAuth } from "../context/AuthContext";
import EnterScore from "./EnterScore";

export default function EnterScoreWrapper({ courses }) {
  const { user } = useAuth();
  return <EnterScore userId={user?.uid} user={user} courses={courses} />;
}
