import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=216_5nu4aVQ",
    "https://youtu.be/216_5nu4aVQ",
    "https://youtube.com/shorts/216_5nu4aVQ",
    "https://www.youtube.com/embed/216_5nu4aVQ",
  ])("reconnaît YouTube : %s", (url) => {
    expect(parseVideoUrl(url)).toMatchObject({
      provider: "youtube",
      id: "216_5nu4aVQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/216_5nu4aVQ",
    });
  });

  it("reconnaît Vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")).toMatchObject({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
  });

  it.each([null, "", "pas une url", "https://example.com/video.mp4", "javascript:alert(1)"])(
    "refuse %s",
    (url) => {
      expect(parseVideoUrl(url)).toBeNull();
    },
  );
});
