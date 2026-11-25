/**
 * Personal rough-cut controls. The user picks imported media and an order.
 * Nothing here classifies footage or chooses an effect.
 */

import { useMemo, useState } from "react";
import { useT } from "../../i18n";
import { roughCutDurationFrames } from "../../lib/fieldProtection";
import type { ClipType, UserRoughCutItemReq } from "../../lib/types";
import * as edit from "../../store/editActions";
import { useMediaStore } from "../../store/mediaStore";
import { useProjectStore } from "../../store/projectStore";

const PLACABLE = new Set<ClipType>(["video", "audio", "image", "lottie"]);

export function PersonalWorkbench() {
  const t = useT();
  const items = useMediaStore((state) => state.items);
  const fps = useProjectStore((state) => state.timeline.fps);
  const media = useMemo(
    () => items.filter((item) => PLACABLE.has(item.type) && !item.missing),
    [items],
  );
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const known = new Set(media.map((item) => item.id));
  const shownIds = [
    ...order.filter((id) => known.has(id)),
    ...media.map((item) => item.id).filter((id) => !order.includes(id)),
  ];
  const byId = new Map(media.map((item) => [item.id, item]));

  const move = (id: string, direction: -1 | 1) => {
    const current = shownIds;
    const index = current.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setOrder(next);
  };

  const place = async () => {
    const selected = shownIds.filter((id) => checked[id]).map((id) => byId.get(id)!);
    if (selected.length === 0) {
      setMessage(t("workbench.needSelection"));
      return;
    }
    const payload: UserRoughCutItemReq[] = selected.map((item) => ({
      mediaRef: item.id,
      mediaType: item.type,
      durationFrames: roughCutDurationFrames(item.type, item.duration, fps),
      hasAudio: item.type === "video" && item.hasAudio,
    }));
    setBusy(true);
    setMessage(null);
    try {
      await edit.placeUserRoughCut(payload, title, Math.max(1, Math.trunc(fps > 0 ? fps * 5 : 150)));
      setMessage(t("workbench.placed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label={t("workbench.title")}
      style={{
        flex: "0 0 auto",
        maxHeight: 240,
        overflow: "auto",
        padding: "8px 10px",
        borderBottom: "var(--bw-thin) solid var(--border-primary)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <strong style={{ fontSize: "var(--fs-sm)" }}>{t("workbench.title")}</strong>
      <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-tertiary)", lineHeight: 1.4 }}>
        {t("workbench.rule")}
      </p>
      {shownIds.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--fs-xs)" }}>{t("workbench.empty")}</p>
      ) : (
        shownIds.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 28 }}>
              <input
                aria-label={t("workbench.include", { name: item.name })}
                type="checkbox"
                checked={checked[id] === true}
                onChange={(event) => setChecked((current) => ({ ...current, [id]: event.target.checked }))}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--fs-xs)" }}>
                {index + 1}. {item.name}
              </span>
              <button type="button" aria-label={t("workbench.moveUp", { name: item.name })} onClick={() => move(id, -1)} disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                aria-label={t("workbench.moveDown", { name: item.name })}
                onClick={() => move(id, 1)}
                disabled={index === shownIds.length - 1}
              >
                ↓
              </button>
            </div>
          );
        })
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)" }}>
        {t("workbench.titleText")}
        <input
          aria-label={t("workbench.titleText")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("workbench.titlePlaceholder")}
        />
      </label>
      <button type="button" onClick={() => void place()} disabled={busy}>
        {t("workbench.place")}
      </button>
      <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-tertiary)", lineHeight: 1.4 }}>
        {t("workbench.saveExport")}
      </p>
      {message ? <p style={{ margin: 0, fontSize: "var(--fs-xs)" }}>{message}</p> : null}
    </section>
  );
}
