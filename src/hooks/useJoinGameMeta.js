import { useEffect } from "react";
import { buildGameInviteUrl } from "../lib/gameInvite";
import { formatPlayerCapacityLabel, getMatchFormatLabel } from "../lib/matchFormats";

const DEFAULT_TITLE = "Golf Trip Leaderboard";
const DEFAULT_DESCRIPTION =
  "Track scores, manage tournaments, and play with your group.";

function upsertMeta(attrName, attrValue, content) {
  if (typeof document === "undefined" || !content) return;
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function formatHoleSummary(game) {
  const holeCount = game?.holeCount || 18;
  if (holeCount === 9) {
    return game?.nineType === "back" ? "Back 9" : "Front 9";
  }
  return game?.startingHole === 10 ? "18 holes from 10" : "18 holes";
}

/**
 * Updates document title + Open Graph / Twitter tags for the join-game page.
 * Crawlers that execute JS (some iMessage previews) benefit; WhatsApp uses the
 * Cloud Function HTML in production.
 */
export default function useJoinGameMeta(details) {
  useEffect(() => {
    if (!details?.game) {
      document.title = DEFAULT_TITLE;
      upsertMeta("property", "og:title", DEFAULT_TITLE);
      upsertMeta("property", "og:description", DEFAULT_DESCRIPTION);
      return undefined;
    }

    const { game, tournamentName, inviterName } = details;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildGameInviteUrl(game.id);
    const imageUrl = origin ? `${origin}/icons/maskable-512.png` : "/icons/maskable-512.png";
    const courseName = game.course?.name || "Golf course";
    const formatLabel = getMatchFormatLabel(game.matchFormat);
    const capacityLabel = formatPlayerCapacityLabel(game);

    const title = game.name
      ? `${game.name} · ${courseName}`
      : `Join ${courseName}`;

    const descriptionParts = [
      formatLabel,
      formatHoleSummary(game),
      capacityLabel,
      tournamentName,
      inviterName ? `Invited by ${inviterName}` : null,
    ].filter(Boolean);

    const description = descriptionParts.join(" · ");

    document.title = `${title} | Golf Trip`;
    upsertMeta("property", "og:site_name", "Golf Trip");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);
    upsertMeta("name", "description", description);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [details]);
}
