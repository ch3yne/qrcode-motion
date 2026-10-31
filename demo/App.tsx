import { useCallback, useEffect, useState } from "react";
import { QrMotion } from "../src/react";
import avatar from "./assets/avatar.png";

/** QR payload. Change this line to change the code content. */
const DEFAULT_PAYLOAD = "https://example.com";

/**
 * Debug helper: `?bytes=120` builds a payload of that many bytes.
 * Length sets the module count: 7 bytes -> 21x21, 700 bytes -> 137x137.
 */
function resolvePayload(): string {
  const raw = new URLSearchParams(window.location.search).get("bytes");
  const bytes = raw ? Number(raw) : 0;
  if (!Number.isFinite(bytes) || bytes < 1) return DEFAULT_PAYLOAD;
  if (bytes <= DEFAULT_PAYLOAD.length) return DEFAULT_PAYLOAD.slice(0, bytes);
  return DEFAULT_PAYLOAD + "a".repeat(bytes - DEFAULT_PAYLOAD.length);
}

const QR_PAYLOAD = resolvePayload();
/** ECC level: H leaves enough redundancy to survive the centered logo. */
const QR_ECC = "H";
/** Rendered size in px. */
const QR_SIZE = 480;

export default function App() {
  const [seed, setSeed] = useState(0);

  const replay = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") replay();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [replay]);

  return (
    <div className="page">
      <button className="tile" onClick={replay} aria-label="重新播放">
        <QrMotion
          value={QR_PAYLOAD}
          ecc={QR_ECC}
          size={QR_SIZE}
          logo={avatar}
          replayKey={seed}
          animated
          tint="mono"
        />
      </button>
    </div>
  );
}
