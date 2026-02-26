import { describe, it, expect } from "vitest";
import { extractExifFromBuffer } from "./exif";

describe("EXIF extraction", () => {
  it("returns empty result for non-image buffer", () => {
    const buffer = Buffer.from("not an image");
    const result = extractExifFromBuffer(buffer);
    expect(result.hasGps).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.gps.latitude).toBeNull();
    expect(result.gps.longitude).toBeNull();
    expect(result.camera.make).toBeNull();
    expect(result.camera.model).toBeNull();
    expect(result.datetime.original).toBeNull();
  });

  it("returns empty result for empty buffer", () => {
    const buffer = Buffer.alloc(0);
    const result = extractExifFromBuffer(buffer);
    expect(result.hasGps).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("returns empty result for buffer with JPEG header but no EXIF", () => {
    // JPEG SOI marker without APP1 EXIF
    const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = extractExifFromBuffer(buffer);
    expect(result.hasGps).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("result structure has all expected fields", () => {
    const buffer = Buffer.from("test");
    const result = extractExifFromBuffer(buffer);
    expect(result).toHaveProperty("gps");
    expect(result).toHaveProperty("camera");
    expect(result).toHaveProperty("datetime");
    expect(result).toHaveProperty("image");
    expect(result).toHaveProperty("hasGps");
    expect(result).toHaveProperty("confidence");
    expect(result.gps).toHaveProperty("latitude");
    expect(result.gps).toHaveProperty("longitude");
    expect(result.gps).toHaveProperty("altitude");
    expect(result.gps).toHaveProperty("direction");
    expect(result.gps).toHaveProperty("speed");
    expect(result.camera).toHaveProperty("make");
    expect(result.camera).toHaveProperty("model");
    expect(result.camera).toHaveProperty("lens");
    expect(result.camera).toHaveProperty("focalLength");
    expect(result.camera).toHaveProperty("aperture");
    expect(result.camera).toHaveProperty("iso");
    expect(result.camera).toHaveProperty("shutterSpeed");
    expect(result.camera).toHaveProperty("flash");
  });
});
