import { describe, expect, it } from "vitest";
import { missingForPublish, publishChecklist } from "./publish";

const empty = { pitch: "", story: "", cover_url: null, video_url: null };
const ready = { pitch: "Un coin pusher néon.", story: "<p>Le jeu.</p>", cover_url: null, video_url: null };

describe("publishChecklist", () => {
  it("liste l'accroche et la description comme obligatoires", () => {
    const required = publishChecklist(empty, 1).filter((i) => i.required).map((i) => i.key);
    expect(required).toEqual(["pitch", "story"]);
  });

  it("coche les points conseillés quand ils sont remplis", () => {
    const items = publishChecklist({ ...ready, video_url: "https://youtu.be/x" }, 3);
    expect(items.every((i) => i.done)).toBe(true);
  });

  it("indique l'onglet où compléter chaque point", () => {
    expect(publishChecklist(empty, 1).map((i) => i.tab)).toEqual(["basics", "story", "basics", "team"]);
  });
});

describe("missingForPublish", () => {
  it("renvoie les points obligatoires manquants", () => {
    expect(missingForPublish(empty).map((i) => i.key)).toEqual(["pitch", "story"]);
    expect(missingForPublish({ ...empty, pitch: "  " }).map((i) => i.key)).toEqual(["pitch", "story"]);
    expect(missingForPublish({ ...ready, story: "<p> </p>" }).map((i) => i.key)).toEqual(["story"]);
  });

  it("est vide quand le projet peut être publié, même sans visuel ni équipe", () => {
    expect(missingForPublish(ready)).toEqual([]);
  });
});
