import React from "react";
import { useAuth } from "../context/AuthContext";
import CreateGame from "./CreateGame";

export default function CreateGameWrapper({ courses }) {
  const { user } = useAuth();
  return (
    <CreateGame userId={user?.uid} user={user} courses={courses} />
  );
}




