import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

const CRAWLER_UA =
  /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|applebot|bingbot|googlebot/i;

const FORMAT_LABELS = {
  stableford: "Stableford Points",
  "1v1matchplayhandicaps": "1v1 Match Play (With Handicaps)",
  "1v1matchplaynohandicap": "1v1 Match Play (No Handicaps)",
  "2v2matchplayhandicaps": "2v2 Match Play (With Handicaps)",
  "2v2matchplaynohandicap": "2v2 Match Play (No Handicaps)",
  american: "American Scoring",
  "american net": "American Scoring (With Handicaps)",
  wolf: "Wolf (3 Players)",
  "wolf-handicap": "Wolf (3 Players, With Handicaps)",
  strokeplay: "Stroke Play",
  scorecard: "Scorecard",
};

const PLAYER_LIMITS = {
  "1v1matchplayhandicaps": 2,
  "1v1matchplaynohandicap": 2,
  "2v2matchplayhandicaps": 4,
  "2v2matchplaynohandicap": 4,
  wolf: 3,
  "wolf-handicap": 3,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeFormat(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getFormatLabel(value) {
  const key = normalizeFormat(value);
  return FORMAT_LABELS[key] || value || "Golf game";
}

function formatHoleSummary(game) {
  const holeCount = game?.holeCount || 18;
  if (holeCount === 9) {
    return game?.nineType === "back" ? "Back 9" : "Front 9";
  }
  return game?.startingHole === 10 ? "18 holes from 10" : "18 holes";
}

function formatCapacity(game) {
  const current = Array.isArray(game?.players) ? game.players.length : 0;
  const max = PLAYER_LIMITS[normalizeFormat(game?.matchFormat)] ?? null;
  if (max === null) {
    return `${current} player${current === 1 ? "" : "s"}`;
  }
  return `${current}/${max} players`;
}

function absoluteUrl(req, path) {
  const host = req.get("x-forwarded-host") || req.get("host");
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${protocol}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildPreviewCopy({ game, tournamentName, inviterName }) {
  const courseName = game?.course?.name || "Golf course";
  const formatLabel = getFormatLabel(game?.matchFormat);
  const title = game?.name ? `${game.name} · ${courseName}` : `Join ${courseName}`;

  const description = [
    formatLabel,
    formatHoleSummary(game),
    formatCapacity(game),
    tournamentName,
    inviterName ? `Invited by ${inviterName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return { title, description, courseName };
}

async function fetchInviteDetails(gameId) {
  const gameSnap = await db.collection("games").doc(gameId).get();
  if (!gameSnap.exists) return null;

  const game = { id: gameSnap.id, ...gameSnap.data() };
  let tournamentName = "";
  let inviterName = "";

  if (game.tournamentId) {
    const tournamentSnap = await db
      .collection("tournaments")
      .doc(game.tournamentId)
      .get();
    if (tournamentSnap.exists) {
      tournamentName = tournamentSnap.data().name || "";
    }
  }

  if (game.createdBy) {
    const creatorSnap = await db.collection("users").doc(game.createdBy).get();
    if (creatorSnap.exists) {
      inviterName = creatorSnap.data().displayName || "";
    }
  }

  return { game, tournamentName, inviterName };
}

function renderOgHtml({ title, description, url, imageUrl, bodyText }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="Golf Trip" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(bodyText || description)}</p>
    <p><a href="${escapeHtml(url)}">Open invite</a></p>
  </main>
</body>
</html>`;
}

export const joinGameOg = onRequest(async (req, res) => {
  const pathMatch = req.path.match(/\/join-game\/([^/?#]+)/i);
  const gameId = pathMatch?.[1];

  if (!gameId) {
    res.status(404).send("Invite link not found.");
    return;
  }

  const userAgent = req.get("user-agent") || "";
  const isCrawler = CRAWLER_UA.test(userAgent);

  if (!isCrawler) {
    res.redirect(302, `/?inviteGame=${encodeURIComponent(gameId)}`);
    return;
  }

  try {
    const details = await fetchInviteDetails(gameId);
    const pageUrl = absoluteUrl(req, `/join-game/${gameId}`);
    const imageUrl = absoluteUrl(req, "/icons/maskable-512.png");

    if (!details?.game) {
      res
        .status(404)
        .send(
          renderOgHtml({
            title: "Invite not found | Golf Trip",
            description: "This golf game invite could not be found.",
            url: pageUrl,
            imageUrl,
            bodyText: "This invite link may have expired.",
          })
        );
      return;
    }

    const { title, description } = buildPreviewCopy(details);

    res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .set("Cache-Control", "public, max-age=300")
      .send(
        renderOgHtml({
          title: `${title} | Golf Trip`,
          description,
          url: pageUrl,
          imageUrl,
          bodyText: description,
        })
      );
  } catch (error) {
    console.error("joinGameOg failed:", error);
    res.status(500).send("Unable to load game invite preview.");
  }
});
