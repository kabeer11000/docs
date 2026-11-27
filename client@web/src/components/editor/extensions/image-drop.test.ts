import { describe, expect, it } from "vitest";
import { fitWithin, MAX_IMAGE_WIDTH } from "./image-drop";

describe("fitWithin", () => {
  it("keeps small images as they are", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_IMAGE_WIDTH, 10)).toEqual({ width: MAX_IMAGE_WIDTH, height: 10 });
  });

  it("scales wide images to the max width, keeping the ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3201, 1000, 1600)).toEqual({ width: 1600, height: 500 });
  });

  it("never returns a zero height", () => {
    expect(fitWithin(100000, 1)).toEqual({ width: 1600, height: 1 });
  });
});
