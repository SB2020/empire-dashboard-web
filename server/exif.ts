/**
 * EXIF / Image Metadata Extraction Service
 * Extracts GPS coordinates, camera info, timestamps, and other metadata from images
 * Uses exif-reader for JPEG/TIFF EXIF parsing
 */
import exifReader from "exif-reader";

export interface ExifResult {
  gps: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    direction: number | null;
    speed: number | null;
  };
  camera: {
    make: string | null;
    model: string | null;
    lens: string | null;
    focalLength: number | null;
    aperture: number | null;
    iso: number | null;
    shutterSpeed: string | null;
    flash: boolean | null;
  };
  datetime: {
    original: string | null;
    digitized: string | null;
    modified: string | null;
    timezone: string | null;
  };
  image: {
    width: number | null;
    height: number | null;
    orientation: number | null;
    colorSpace: string | null;
    software: string | null;
  };
  hasGps: boolean;
  confidence: number;
}

const EMPTY_RESULT: ExifResult = {
  gps: { latitude: null, longitude: null, altitude: null, direction: null, speed: null },
  camera: { make: null, model: null, lens: null, focalLength: null, aperture: null, iso: null, shutterSpeed: null, flash: null },
  datetime: { original: null, digitized: null, modified: null, timezone: null },
  image: { width: null, height: null, orientation: null, colorSpace: null, software: null },
  hasGps: false,
  confidence: 0,
};

/**
 * Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
 */
function dmsToDecimal(dms: number[], ref: string): number {
  if (!dms || dms.length < 3) return 0;
  let decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === "S" || ref === "W") decimal = -decimal;
  return decimal;
}

/**
 * Extract EXIF metadata from a Buffer containing image data
 */
export function extractExifFromBuffer(buffer: Buffer): ExifResult {
  const result: ExifResult = JSON.parse(JSON.stringify(EMPTY_RESULT));

  try {
    // Find EXIF marker in JPEG (0xFFE1)
    let exifOffset = -1;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xE1) {
        exifOffset = i + 4; // Skip marker and length bytes
        break;
      }
    }

    if (exifOffset === -1) {
      return result;
    }

    const exifBuffer = buffer.subarray(exifOffset);
    const exif = exifReader(exifBuffer);

    if (!exif) return { ...result, confidence: 5 };

    let confidenceScore = 10;
    const gps = exif.GPSInfo;
    const photo = exif.Photo;
    const image = exif.Image;

    // Extract GPS data
    if (gps?.GPSLatitude && gps?.GPSLongitude) {
      const latRef = gps.GPSLatitudeRef || "N";
      const lngRef = gps.GPSLongitudeRef || "E";
      result.gps.latitude = dmsToDecimal(gps.GPSLatitude, latRef);
      result.gps.longitude = dmsToDecimal(gps.GPSLongitude, lngRef);
      result.hasGps = true;
      confidenceScore += 40;
    }

    if (gps?.GPSAltitude != null) {
      result.gps.altitude = gps.GPSAltitude;
      confidenceScore += 5;
    }
    if (gps?.GPSImgDirection != null) result.gps.direction = gps.GPSImgDirection;
    if (gps?.GPSSpeed != null) result.gps.speed = gps.GPSSpeed;

    // Camera info from Image tags
    if (image?.Make) { result.camera.make = String(image.Make).trim(); confidenceScore += 5; }
    if (image?.Model) { result.camera.model = String(image.Model).trim(); confidenceScore += 5; }

    // Photo-specific tags
    if (photo) {
      if (photo.LensModel) result.camera.lens = String(photo.LensModel).trim();
      if (photo.FocalLength != null) result.camera.focalLength = photo.FocalLength;
      if (photo.FNumber != null) result.camera.aperture = photo.FNumber;
      if (photo.ISOSpeedRatings != null) result.camera.iso = photo.ISOSpeedRatings;
      if (photo.ExposureTime != null) {
        const et = photo.ExposureTime;
        result.camera.shutterSpeed = et < 1 ? `1/${Math.round(1 / et)}` : `${et}s`;
      }
      if (photo.Flash != null) result.camera.flash = (photo.Flash & 1) === 1;

      // Datetime
      if (photo.DateTimeOriginal) {
        result.datetime.original = photo.DateTimeOriginal instanceof Date
          ? photo.DateTimeOriginal.toISOString()
          : String(photo.DateTimeOriginal);
        confidenceScore += 10;
      }
      if (photo.DateTimeDigitized) {
        result.datetime.digitized = photo.DateTimeDigitized instanceof Date
          ? photo.DateTimeDigitized.toISOString()
          : String(photo.DateTimeDigitized);
      }
      if (photo.OffsetTimeOriginal) result.datetime.timezone = String(photo.OffsetTimeOriginal);

      // Image dimensions from Photo
      if (photo.PixelXDimension != null) result.image.width = photo.PixelXDimension;
      if (photo.PixelYDimension != null) result.image.height = photo.PixelYDimension;
      if (photo.ColorSpace != null) result.image.colorSpace = photo.ColorSpace === 1 ? "sRGB" : "Adobe RGB";
    }

    // Image-level tags
    if (image?.DateTime) {
      result.datetime.modified = image.DateTime instanceof Date
        ? image.DateTime.toISOString()
        : String(image.DateTime);
    }
    if (image?.Orientation != null) result.image.orientation = image.Orientation;
    if (image?.Software) result.image.software = String(image.Software).trim();

    result.confidence = Math.min(100, confidenceScore);
    return result;
  } catch (error: any) {
    console.warn("[EXIF] Extraction failed:", error.message);
    return result;
  }
}

/**
 * Extract EXIF from a URL by fetching the image
 */
export async function extractExifFromUrl(imageUrl: string): Promise<ExifResult> {
  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": "SystemZero/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return extractExifFromBuffer(buffer);
  } catch (error: any) {
    console.warn("[EXIF] URL fetch failed:", error.message);
    return JSON.parse(JSON.stringify(EMPTY_RESULT));
  }
}
