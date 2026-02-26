import { describe, it, expect } from "vitest";
import { generateSyntheticTrafficCameras, generateSyntheticWorldCams } from "./cameras";

describe("Traffic Cameras", () => {
  it("generates synthetic traffic cameras with valid structure", () => {
    const cameras = generateSyntheticTrafficCameras();
    expect(cameras.length).toBeGreaterThan(0);
    cameras.forEach(cam => {
      expect(cam).toHaveProperty("id");
      expect(cam).toHaveProperty("name");
      expect(cam).toHaveProperty("latitude");
      expect(cam).toHaveProperty("longitude");
      expect(cam).toHaveProperty("state");
      expect(cam).toHaveProperty("route");
      expect(cam).toHaveProperty("source");
      expect(typeof cam.latitude).toBe("number");
      expect(typeof cam.longitude).toBe("number");
      expect(cam.latitude).toBeGreaterThanOrEqual(-90);
      expect(cam.latitude).toBeLessThanOrEqual(90);
      expect(cam.longitude).toBeGreaterThanOrEqual(-180);
      expect(cam.longitude).toBeLessThanOrEqual(180);
    });
  });

  it("covers multiple US states", () => {
    const cameras = generateSyntheticTrafficCameras();
    const states = new Set(cameras.map(c => c.state));
    expect(states.size).toBeGreaterThanOrEqual(5);
  });
});

describe("World Cams", () => {
  it("generates synthetic world cams with valid structure", () => {
    const cams = generateSyntheticWorldCams();
    expect(cams.length).toBeGreaterThan(0);
    cams.forEach(cam => {
      expect(cam).toHaveProperty("id");
      expect(cam).toHaveProperty("title");
      expect(cam).toHaveProperty("latitude");
      expect(cam).toHaveProperty("longitude");
      expect(cam).toHaveProperty("country");
      expect(cam).toHaveProperty("city");
      expect(cam).toHaveProperty("category");
      expect(cam).toHaveProperty("status");
      expect(cam).toHaveProperty("viewers");
      expect(typeof cam.latitude).toBe("number");
      expect(typeof cam.longitude).toBe("number");
    });
  });

  it("covers multiple countries", () => {
    const cams = generateSyntheticWorldCams();
    const countries = new Set(cams.map(c => c.country));
    expect(countries.size).toBeGreaterThanOrEqual(5);
  });

  it("includes multiple categories", () => {
    const cams = generateSyntheticWorldCams();
    const categories = new Set(cams.map(c => c.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
