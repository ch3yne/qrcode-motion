import { useCallback, useEffect, useState } from "react";
import { QrMotion } from "../src/react";
import avatar from "./assets/avatar.png";

/** 二维码内容：改这一行就行 */
const DEFAULT_PAYLOAD = "https://example.com";

/**
 * 调试用：`?bytes=120` 生成指定字节数的内容。
 * 内容长度决定模块数（7 字节 → 21×21，700 字节 → 137×137），
 * 用它逐档检查不同密度下的观感与可扫性。
 */
function resolvePayload(): string {
  const raw = new URLSearchParams(window.location.search).get("bytes");
  const bytes = raw ? Number(raw) : 0;
  if (!Number.isFinite(bytes) || bytes < 1) return DEFAULT_PAYLOAD;
  if (bytes <= DEFAULT_PAYLOAD.length) return DEFAULT_PAYLOAD.slice(0, bytes);
  return DEFAULT_PAYLOAD + "a".repeat(bytes - DEFAULT_PAYLOAD.length);
}

const QR_PAYLOAD = resolvePayload();
/** 纠错等级：有中心 logo 用 H，留足冗余 */
const QR_ECC = "H";
/** 码面尺寸（px） */
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
