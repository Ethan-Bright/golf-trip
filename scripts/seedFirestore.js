/* eslint-env node */
/* global process */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import { courses } from "../src/data/courses.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SERVICE_ACCOUNT_PATH = path.join(
  __dirname,
  "..",
  "serviceAccountKey.json"
);

async function loadServiceAccount() {
  const directJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (directJson) {
    try {
      return JSON.parse(directJson);
    } catch (error) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed: ${error.message}`
      );
    }
  }

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const keyPath = explicitPath
    ? path.resolve(explicitPath)
    : DEFAULT_SERVICE_ACCOUNT_PATH;

  try {
    const contents = await readFile(keyPath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Failed to read service account key from ${keyPath}. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON. (${error.message})`
    );
  }
}

function cloneCourse(course) {
  return JSON.parse(JSON.stringify(course));
}

function buildHandicapAllowances(course, handicap = 0) {
  const holeCount = course.holes.length;
  const allowances = Array.from({ length: holeCount }, () => 0);

  if (!handicap || handicap <= 0) return allowances;

  const holesByStrokeIndex = course.holes
    .map((hole, index) => ({
      index,
      strokeIndex:
        typeof hole.strokeIndex === "number" ? hole.strokeIndex : index + 1,
    }))
    .sort((a, b) => a.strokeIndex - b.strokeIndex);

  let strokesRemaining = handicap;
  while (strokesRemaining > 0) {
    for (const hole of holesByStrokeIndex) {
      allowances[hole.index] += 1;
      strokesRemaining -= 1;
      if (strokesRemaining === 0) break;
    }
  }

  return allowances;
}

function createStablefordScores(course, handicap = 0, variation = 0) {
  const allowances = buildHandicapAllowances(course, handicap);
  
  return course.holes.map((hole, index) => {
    const diff = ((index + variation) % 3) - 1; // -1, 0, 1
    const gross = Math.max(1, hole.par + diff);
    const netScore = Math.max(0, gross - (allowances[index] || 0));
    const toPar = netScore - hole.par;
    let points = 0;
    if (toPar <= -2) points = 4;
    else if (toPar === -1) points = 3;
    else if (toPar === 0) points = 2;
    else if (toPar === 1) points = 1;

    return {
      gross,
      net: points,
      netScore: netScore,
    };
  });
}

function createGrossScores(course, variation = 0) {
  return course.holes.map((hole, index) => {
    const diff = ((index + variation) % 3) - 1;
    const gross = Math.max(1, hole.par + diff);

    return {
      gross,
      net: null,
      netScore: gross - hole.par,
    };
  });
}

function createStrokeplayScores(course, handicap = 0, variation = 0) {
  const allowances = buildHandicapAllowances(course, handicap);

  return course.holes.map((hole, index) => {
    const diff = ((index + variation) % 4) - 1; // -1,0,1,2
    const gross = Math.max(1, hole.par + diff);
    const netScore = gross - (allowances[index] || 0);

    return {
      gross,
      net: netScore,
      netScore,
    };
  });
}

function createAmericanScores(course, handicap = 0, variation = 0) {
  const allowances = buildHandicapAllowances(course, handicap);

  return course.holes.map((hole, index) => {
    const diff = ((index + variation) % 4) - 1;
    const gross = Math.max(1, hole.par + diff);
    const netScore = gross - (allowances[index] || 0);

    return {
      gross,
      net: null,
      netScore,
    };
  });
}

async function main() {
  const serviceAccount = await loadServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const shouldReset = process.argv.includes("--reset");

  const tournamentId = "demo-tournament";
  const tournamentPasswordPlain =
    process.env.SEED_TOURNAMENT_PASSWORD || "demo";
  const hashedTournamentPassword = await bcrypt.hash(
    tournamentPasswordPlain,
    10
  );
  const course = courses[0];
  if (!course) {
    throw new Error(
      "No course data found in src/data/courses.js. Cannot proceed with seeding."
    );
  }
  const coursePayload = cloneCourse(course);

  const tournamentDoc = {
    name: "Demo Golf Weekender",
    location: "Pebble Beach, CA",
    format: "Mixed Formats Showcase",
    startDate: admin.firestore.Timestamp.fromDate(new Date("2025-07-18")),
    endDate: admin.firestore.Timestamp.fromDate(new Date("2025-07-21")),
    createdAt: now,
    updatedAt: now,
    organizerId: "user-alice-ace",
    password: hashedTournamentPassword,
  };

  const sampleUsers = [
    {
      id: "user-alice-ace",
      displayName: "Alice Ace",
      email: "alice@example.com",
      handicap: 8,
      role: "player",
      teamId: "team-eagles",
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-bob-birdie",
      displayName: "Bob Birdie",
      email: "bob@example.com",
      handicap: 12,
      role: "player",
      teamId: "team-eagles",
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-cara-chip",
      displayName: "Cara Chip",
      email: "cara@example.com",
      handicap: 6,
      role: "player",
      teamId: "team-birdies",
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-dan-driver",
      displayName: "Dan Driver",
      email: "dan@example.com",
      handicap: 10,
      role: "player",
      teamId: "team-birdies",
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-ella-eagle",
      displayName: "Ella Eagle",
      email: "ella@example.com",
      handicap: 15,
      role: "player",
      teamId: null,
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-fred-fairway",
      displayName: "Fred Fairway",
      email: "fred@example.com",
      handicap: 18,
      role: "player",
      teamId: null,
      tournaments: [tournamentId],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const sampleTeams = [
    {
      id: "team-eagles",
      name: "Team Eagles",
      tournamentId,
      player1: {
        uid: "user-alice-ace",
        displayName: "Alice Ace",
        handicap: 8,
      },
      player2: {
        uid: "user-bob-birdie",
        displayName: "Bob Birdie",
        handicap: 12,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-birdies",
      name: "Team Birdies",
      tournamentId,
      player1: {
        uid: "user-cara-chip",
        displayName: "Cara Chip",
        handicap: 6,
      },
      player2: {
        uid: "user-dan-driver",
        displayName: "Dan Driver",
        handicap: 10,
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const baseGameFields = {
    tournamentId,
    courseId: course.id,
    course: coursePayload,
    holeCount: 18,
    nineType: "front",
    status: "inProgress",
    createdAt: now,
    updatedAt: now,
  };

  const sampleGames = [
    {
      id: "game-stableford-demo",
      name: "Stableford Showcase",
      matchFormat: "stableford",
      players: [
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createStablefordScores(course, 8, 0),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createStablefordScores(course, 12, 1),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createStablefordScores(course, 6, 2),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createStablefordScores(course, 10, 3),
        },
      ],
    },
    {
      id: "game-matchplay-1v1-handicap",
      name: "1v1 Match Play (Handicaps)",
      matchFormat: "1v1matchplayhandicaps",
      players: [
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createStrokeplayScores(course, 8, 0),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createStrokeplayScores(course, 6, 1),
        },
      ],
    },
    {
      id: "game-matchplay-1v1-gross",
      name: "1v1 Match Play (Without Handicaps)",
      matchFormat: "1v1matchplaynohandicap",
      players: [
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createGrossScores(course, 0),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createGrossScores(course, 2),
        },
      ],
    },
    {
      id: "game-matchplay-2v2-handicap",
      name: "2v2 Match Play (Handicaps)",
      matchFormat: "2v2matchplayhandicaps",
      players: [
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createStrokeplayScores(course, 8, 0),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createStrokeplayScores(course, 12, 2),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createStrokeplayScores(course, 6, 1),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createStrokeplayScores(course, 10, 3),
        },
      ],
    },
    {
      id: "game-matchplay-2v2-gross",
      name: "2v2 Match Play (Without Handicaps)",
      matchFormat: "2v2matchplaynohandicap",
      players: [
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createGrossScores(course, 0),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createGrossScores(course, 1),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createGrossScores(course, 2),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createGrossScores(course, 3),
        },
      ],
    },
    {
      id: "game-american-gross-3",
      name: "American Scoring (Without Handicaps) - 3 Players",
      matchFormat: "american",
      players: [
        {
          userId: "user-ella-eagle",
          name: "Ella Eagle",
          handicap: 15,
          scores: createAmericanScores(course, 15, 0),
        },
        {
          userId: "user-fred-fairway",
          name: "Fred Fairway",
          handicap: 18,
          scores: createAmericanScores(course, 18, 1),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createAmericanScores(course, 6, 2),
        },
      ],
    },
    {
      id: "game-american-gross-4",
      name: "American Scoring (Without Handicaps) - 4 Players",
      matchFormat: "american",
      players: [
        {
          userId: "user-ella-eagle",
          name: "Ella Eagle",
          handicap: 15,
          scores: createAmericanScores(course, 15, 0),
        },
        {
          userId: "user-fred-fairway",
          name: "Fred Fairway",
          handicap: 18,
          scores: createAmericanScores(course, 18, 1),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createAmericanScores(course, 6, 2),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createAmericanScores(course, 10, 3),
        },
      ],
    },
    {
      id: "game-american-net-3",
      name: "American Scoring (With Handicaps) - 3 Players",
      matchFormat: "american net",
      players: [
        {
          userId: "user-ella-eagle",
          name: "Ella Eagle",
          handicap: 15,
          scores: createAmericanScores(course, 15, 0),
        },
        {
          userId: "user-fred-fairway",
          name: "Fred Fairway",
          handicap: 18,
          scores: createAmericanScores(course, 18, 1),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createAmericanScores(course, 12, 2),
        },
      ],
    },
    {
      id: "game-american-net-4",
      name: "American Scoring (With Handicaps) - 4 Players",
      matchFormat: "american net",
      players: [
        {
          userId: "user-ella-eagle",
          name: "Ella Eagle",
          handicap: 15,
          scores: createAmericanScores(course, 15, 0),
        },
        {
          userId: "user-fred-fairway",
          name: "Fred Fairway",
          handicap: 18,
          scores: createAmericanScores(course, 18, 1),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createAmericanScores(course, 12, 2),
        },
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createAmericanScores(course, 8, 3),
        },
      ],
    },
    {
      id: "game-strokeplay",
      name: "Stroke Play Championship",
      matchFormat: "strokeplay",
      players: [
        {
          userId: "user-alice-ace",
          name: "Alice Ace",
          handicap: 8,
          scores: createStrokeplayScores(course, 8, 0),
        },
        {
          userId: "user-bob-birdie",
          name: "Bob Birdie",
          handicap: 12,
          scores: createStrokeplayScores(course, 12, 1),
        },
        {
          userId: "user-cara-chip",
          name: "Cara Chip",
          handicap: 6,
          scores: createStrokeplayScores(course, 6, 2),
        },
        {
          userId: "user-dan-driver",
          name: "Dan Driver",
          handicap: 10,
          scores: createStrokeplayScores(course, 10, 3),
        },
      ],
    },
    {
      id: "game-scorecard",
      name: "Scorecard Sample",
      matchFormat: "scorecard",
      players: [
        {
          userId: "user-ella-eagle",
          name: "Ella Eagle",
          handicap: 15,
          scores: createGrossScores(course, 1),
        },
        {
          userId: "user-fred-fairway",
          name: "Fred Fairway",
          handicap: 18,
          scores: createGrossScores(course, 2),
        },
      ],
    },
  ];

  const collectionsToReset = [
    { name: "games", ids: sampleGames.map((game) => game.id) },
    { name: "users", ids: sampleUsers.map((user) => user.id) },
    { name: "tournaments", ids: [tournamentId] },
  ];

  if (shouldReset) {
    console.log("Reset flag detected – deleting existing demo documents (if any).");
    for (const { name, ids } of collectionsToReset) {
      for (const id of ids) {
        await db.collection(name).doc(id).delete().catch(() => {});
      }
    }
    for (const team of sampleTeams) {
      await db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("teams")
        .doc(team.id)
        .delete()
        .catch(() => {});
      await db.collection("teams").doc(team.id).delete().catch(() => {});
    }
    // Also delete members subcollection
    const membersRef = db.collection("tournaments").doc(tournamentId).collection("members");
    const membersSnapshot = await membersRef.get();
    for (const memberDoc of membersSnapshot.docs) {
      await memberDoc.ref.delete().catch(() => {});
    }
  }

  await db.collection("tournaments").doc(tournamentId).set(tournamentDoc, {
    merge: true,
  });

  await Promise.all(
    sampleUsers.map((user) =>
      db.collection("users").doc(user.id).set(user, { merge: true })
    )
  );

  // Add users to tournament members subcollection
  await Promise.all(
    sampleUsers.map((user) =>
      db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("members")
        .doc(user.id)
        .set(
          {
            uid: user.id,
            displayName: user.displayName,
            handicap: user.handicap,
            profilePictureUrl: user.profilePictureUrl || null,
            joinedAt: now,
          },
          { merge: true }
        )
    )
  );

  await Promise.all(
    sampleTeams.map((team) => {
      const teamData = {
        ...team,
        tournamentId,
        updatedAt: now,
      };
      const teamRef = db
        .collection("tournaments")
        .doc(tournamentId)
        .collection("teams")
        .doc(team.id);

      return Promise.all([
        teamRef.set(teamData, { merge: true }),
        db.collection("teams").doc(team.id).set(teamData, { merge: true }),
      ]);
    })
  );

  await Promise.all(
    sampleGames.map((game) => {
      const playerIds = Array.from(
        new Set((game.players || []).map((player) => player.userId).filter(Boolean))
      );
      return db
        .collection("games")
        .doc(game.id)
        .set({ ...baseGameFields, ...game, playerIds }, { merge: true });
    })
  );

  // Update tournament member count
  await db
    .collection("tournaments")
    .doc(tournamentId)
    .set({ memberCount: sampleUsers.length }, { merge: true });

  console.log("✅ Firestore seeding complete!");
  console.log(
    `Created tournament ${tournamentId}, ${sampleUsers.length} users, ${sampleTeams.length} teams, and ${sampleGames.length} games.`
  );
  console.log(
    "Use `node scripts/seedFirestore.js --reset` to overwrite demo documents."
  );
  console.log(
    `Tournament join password: ${tournamentPasswordPlain} (override with SEED_TOURNAMENT_PASSWORD env var).`
  );
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});

