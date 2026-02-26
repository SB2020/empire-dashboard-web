import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Eye, Camera, Video, Crosshair, Shield, AlertTriangle, Activity,
  RefreshCw, Maximize2, Minimize2, Grid3X3, LayoutGrid, Pause, Play,
  Settings, Wifi, WifiOff, MapPin, Clock, Zap, Radio, Search,
  ChevronDown, ChevronRight, MoreHorizontal, Download, Share2,
  ScanLine, Target, Radar, Box, Layers, Sun, Moon, Thermometer,
  VideoOff, Smartphone, MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// ─── YOLO Detection Types ────────────────────────────────────────────────
interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (normalized 0-1)
  color: string;
}

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: "live" | "offline" | "recording" | "device";
  type: "traffic" | "surveillance" | "webcam" | "satellite" | "drone" | "device";
  provider: string;
  embedUrl: string;
  viewUrl: string;
  youtubeId?: string;
  detections: Detection[];
  fps: number;
  resolution: string;
  lastDetection: string;
  alertLevel: "normal" | "caution" | "alert" | "critical";
  objectCount: number;
}

type ViewMode = "grid-2x2" | "grid-3x3" | "grid-4x4" | "single" | "theater";

// ─── YOLO Class Colors ──────────────────────────────────────────────────
const YOLO_CLASSES: Record<string, { color: string; category: string }> = {
  person: { color: "#00ff41", category: "person" },
  car: { color: "#00d4ff", category: "vehicle" },
  truck: { color: "#0099cc", category: "vehicle" },
  bus: { color: "#0077aa", category: "vehicle" },
  motorcycle: { color: "#00bbee", category: "vehicle" },
  bicycle: { color: "#33ccff", category: "vehicle" },
  dog: { color: "#ff9900", category: "animal" },
  cat: { color: "#ffaa33", category: "animal" },
  bird: { color: "#ffcc00", category: "animal" },
  horse: { color: "#ff8800", category: "animal" },
  backpack: { color: "#ff00ff", category: "object" },
  umbrella: { color: "#cc00ff", category: "object" },
  handbag: { color: "#aa00ff", category: "object" },
  suitcase: { color: "#8800ff", category: "object" },
  fire: { color: "#ff0000", category: "anomaly" },
  smoke: { color: "#ff3333", category: "anomaly" },
  weapon: { color: "#ff0000", category: "anomaly" },
  airplane: { color: "#00d4ff", category: "vehicle" },
  ship: { color: "#0099cc", category: "vehicle" },
  bear: { color: "#ff9900", category: "animal" },
  fish: { color: "#00d4ff", category: "animal" },
  rocket: { color: "#ff0000", category: "object" },
};

// ─── Simulated YOLO Detections ──────────────────────────────────────────
function generateDetections(camType: string): Detection[] {
  const count = Math.floor(Math.random() * 8) + 1;
  const detections: Detection[] = [];
  const classes = camType === "traffic"
    ? ["car", "truck", "bus", "person", "motorcycle", "bicycle"]
    : camType === "surveillance"
    ? ["person", "car", "backpack", "dog", "bicycle"]
    : camType === "device"
    ? ["person", "cat", "dog", "backpack", "handbag"]
    : ["person", "car", "bird", "dog", "cat"];

  for (let i = 0; i < count; i++) {
    const cls = classes[Math.floor(Math.random() * classes.length)];
    detections.push({
      class: cls,
      confidence: 0.65 + Math.random() * 0.34,
      bbox: [
        Math.random() * 0.7,
        Math.random() * 0.7,
        0.05 + Math.random() * 0.2,
        0.05 + Math.random() * 0.25,
      ],
      color: YOLO_CLASSES[cls]?.color || "#00ff41",
    });
  }
  return detections;
}

// ─── Camera Feed Data ───────────────────────────────────────────────────
function buildCameraFeeds(): CameraFeed[] {
  return [
    // DEVICE CAMERA (first slot — user's own camera)
    { id: "device-cam", name: "DEVICE CAMERA", location: "Local Device", latitude: 0, longitude: 0, status: "device", type: "device", provider: "Device", embedUrl: "", viewUrl: "", detections: [], fps: 30, resolution: "1280x720", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 0 },
    // EarthCam — YouTube embeds
    { id: "yolo-1", name: "TIMES SQUARE CAM-01", location: "New York, US", latitude: 40.758, longitude: -73.9855, status: "live", type: "surveillance", provider: "EarthCam", embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1", viewUrl: "", youtubeId: "1-iS7LArMPA", detections: generateDetections("surveillance"), fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 47 },
    { id: "yolo-4", name: "BOURBON STREET", location: "New Orleans, US", latitude: 29.9584, longitude: -90.0654, status: "live", type: "surveillance", provider: "EarthCam", embedUrl: "https://www.youtube.com/embed/zaFOnIVap9M?autoplay=1&mute=1", viewUrl: "", youtubeId: "zaFOnIVap9M", detections: generateDetections("surveillance"), fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 34 },
    { id: "yolo-ec3", name: "ABBEY ROAD CROSSING", location: "London, UK", latitude: 51.5320, longitude: -0.1778, status: "live", type: "webcam", provider: "EarthCam", embedUrl: "https://www.youtube.com/embed/dqBs3o-l4Vc?autoplay=1&mute=1", viewUrl: "", youtubeId: "dqBs3o-l4Vc", detections: generateDetections("surveillance"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 12 },
    // SkylineWebcams — iframe embeds
    { id: "yolo-3", name: "SHIBUYA CROSSING", location: "Tokyo, JP", latitude: 35.6595, longitude: 139.7004, status: "live", type: "webcam", provider: "SkylineWebcams", embedUrl: "https://www.youtube.com/embed/3n0_UcBxnpk?autoplay=1&mute=1", viewUrl: "", youtubeId: "3n0_UcBxnpk", detections: generateDetections("surveillance"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 89 },
    { id: "yolo-sw2", name: "VENICE GRAND CANAL", location: "Venice, IT", latitude: 45.4408, longitude: 12.3155, status: "live", type: "webcam", provider: "SkylineWebcams", embedUrl: "https://www.youtube.com/embed/vPbQcM4k1Ys?autoplay=1&mute=1", viewUrl: "", youtubeId: "vPbQcM4k1Ys", detections: generateDetections("webcam"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 15 },
    // Explore.org wildlife
    { id: "yolo-7", name: "KATMAI BEAR CAM", location: "King Salmon, US", latitude: 58.7519, longitude: -155.0631, status: "live", type: "webcam", provider: "Explore.org", embedUrl: "https://www.youtube.com/embed/GSHPJBpJOVE?autoplay=1&mute=1", viewUrl: "", youtubeId: "GSHPJBpJOVE", detections: [{ class: "bear", confidence: 0.94, bbox: [0.3, 0.4, 0.15, 0.2], color: "#ff9900" }], fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 5 },
    // YouTube Live streams
    { id: "yolo-8", name: "LAX RUNWAY CAM", location: "Los Angeles, US", latitude: 33.9425, longitude: -118.4081, status: "live", type: "surveillance", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/dFBMnBbOxKI?autoplay=1&mute=1", viewUrl: "", youtubeId: "dFBMnBbOxKI", detections: [{ class: "airplane", confidence: 0.99, bbox: [0.2, 0.3, 0.3, 0.15], color: "#00d4ff" }], fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 12 },
    { id: "yolo-11", name: "ISS EARTH VIEW", location: "Low Earth Orbit", latitude: 0, longitude: 0, status: "live", type: "satellite", provider: "NASA", embedUrl: "https://www.youtube.com/embed/P9C25Un7xaM?autoplay=1&mute=1", viewUrl: "", youtubeId: "P9C25Un7xaM", detections: [], fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 0 },
    { id: "yolo-12", name: "JACKSON HOLE TOWN SQ", location: "Jackson, WY, US", latitude: 43.4799, longitude: -110.7624, status: "live", type: "webcam", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1", viewUrl: "", youtubeId: "1EiC9bvVGnk", detections: generateDetections("surveillance"), fps: 30, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 8 },
    { id: "yolo-13", name: "MIAMI BEACH", location: "Miami, US", latitude: 25.7907, longitude: -80.1300, status: "live", type: "webcam", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/4b32VSkTh5s?autoplay=1&mute=1", viewUrl: "", youtubeId: "4b32VSkTh5s", detections: generateDetections("webcam"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 20 },
    { id: "yolo-14", name: "DUBLIN TEMPLE BAR", location: "Dublin, IE", latitude: 53.3454, longitude: -6.2644, status: "live", type: "webcam", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/e_v_gRo1Kps?autoplay=1&mute=1", viewUrl: "", youtubeId: "e_v_gRo1Kps", detections: generateDetections("surveillance"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 15 },
    { id: "yolo-2", name: "I-405 TRAFFIC CAM", location: "Los Angeles, US", latitude: 34.0522, longitude: -118.4437, status: "live", type: "traffic", provider: "Caltrans", embedUrl: "https://www.youtube.com/embed/NMre6IAAAiU?autoplay=1&mute=1", viewUrl: "", youtubeId: "NMre6IAAAiU", detections: generateDetections("traffic"), fps: 15, resolution: "1280x720", lastDetection: new Date().toISOString(), alertLevel: "caution", objectCount: 23 },
    { id: "yolo-5", name: "DUBAI MARINA", location: "Dubai, AE", latitude: 25.0805, longitude: 55.1403, status: "live", type: "webcam", provider: "WorldCams", embedUrl: "https://www.youtube.com/embed/QMN-304F-YI?autoplay=1&mute=1", viewUrl: "", youtubeId: "QMN-304F-YI", detections: generateDetections("surveillance"), fps: 20, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 15 },
    { id: "yolo-9", name: "SUEZ CANAL", location: "Ismailia, EG", latitude: 30.4575, longitude: 32.3499, status: "live", type: "surveillance", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/wbByvFJTwns?autoplay=1&mute=1", viewUrl: "", youtubeId: "wbByvFJTwns", detections: [{ class: "ship", confidence: 0.96, bbox: [0.1, 0.3, 0.4, 0.2], color: "#0099cc" }], fps: 15, resolution: "1280x720", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 3 },
    { id: "yolo-10", name: "MECCA GRAND MOSQUE", location: "Mecca, SA", latitude: 21.4225, longitude: 39.8262, status: "live", type: "webcam", provider: "YouTube", embedUrl: "https://www.youtube.com/embed/P-yFUxo0Lzk?autoplay=1&mute=1", viewUrl: "", youtubeId: "P-yFUxo0Lzk", detections: generateDetections("surveillance"), fps: 25, resolution: "1920x1080", lastDetection: new Date().toISOString(), alertLevel: "normal", objectCount: 200 },
  ];
}

// ─── Detection Overlay Component ────────────────────────────────────────
function DetectionOverlay({ detections, showLabels }: { detections: Detection[]; showLabels: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {detections.map((d, i) => (
        <div
          key={i}
          className="absolute border-2 transition-all duration-300"
          style={{
            left: `${d.bbox[0] * 100}%`,
            top: `${d.bbox[1] * 100}%`,
            width: `${d.bbox[2] * 100}%`,
            height: `${d.bbox[3] * 100}%`,
            borderColor: d.color,
            boxShadow: `0 0 8px ${d.color}40`,
          }}
        >
          {showLabels && (
            <div
              className="absolute -top-5 left-0 px-1 text-[9px] font-mono font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ backgroundColor: d.color, color: "#000" }}
            >
              {d.class} {(d.confidence * 100).toFixed(0)}%
            </div>
          )}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: d.color }} />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: d.color }} />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: d.color }} />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: d.color }} />
        </div>
      ))}
    </div>
  );
}

// ─── CRT Scanline Effect ────────────────────────────────────────────────
function CRTEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.1) 1px, rgba(0,255,65,0.1) 2px)",
      }} />
    </div>
  );
}

// ─── Device Camera Component ────────────────────────────────────────────
function DeviceCameraView({ isActive }: { isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "requesting">("prompt");

  const requestCamera = useCallback(async () => {
    setPermissionState("requesting");
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setPermissionState("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setPermissionState("denied");
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setPermissionState("denied");
        setError("No camera found on this device.");
      } else {
        setPermissionState("denied");
        setError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  if (permissionState === "granted" && stream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3 p-4">
      {permissionState === "requesting" ? (
        <>
          <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-neon-green/70 text-center">Requesting camera access...</span>
        </>
      ) : error ? (
        <>
          <VideoOff className="w-8 h-8 text-red-400/60" />
          <span className="text-[10px] text-red-400/70 text-center max-w-[200px]">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={requestCamera}
            className="text-[10px] border-neon-green/40 text-neon-green hover:bg-neon-green/10 mt-1"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> RETRY
          </Button>
        </>
      ) : (
        <>
          <Smartphone className="w-10 h-10 text-neon-green/40" />
          <span className="text-[11px] text-neon-green/60 text-center">Device camera not active</span>
          <Button
            variant="outline"
            size="sm"
            onClick={requestCamera}
            className="text-[10px] border-neon-green/40 text-neon-green hover:bg-neon-green/10 mt-1 animate-pulse"
          >
            <Camera className="w-3 h-3 mr-1" /> ENABLE CAMERA
          </Button>
          <span className="text-[9px] text-neon-green/30 text-center mt-1">Click to grant camera permission</span>
        </>
      )}
    </div>
  );
}

// ─── Live Stream Embed Component ────────────────────────────────────────
function LiveStreamEmbed({ camera }: { camera: CameraFeed }) {
  const [loadError, setLoadError] = useState(false);

  if (camera.type === "device") {
    return <DeviceCameraView isActive={true} />;
  }

  if (camera.embedUrl && !loadError) {
    return (
      <iframe
        src={camera.embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setLoadError(true)}
        title={camera.name}
        loading="lazy"
      />
    );
  }

  // Fallback: CRT placeholder for feeds without embed URLs
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="absolute inset-0 opacity-20" style={{
        background: "radial-gradient(ellipse at 30% 40%, rgba(0,255,65,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(0,200,255,0.1) 0%, transparent 50%)",
      }} />
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: "linear-gradient(rgba(0,255,65,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.3) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MonitorPlay className="w-8 h-8 text-neon-green/30 mx-auto mb-2" />
          <div className="text-[10px] text-neon-green/40">FEED CONNECTING...</div>
          <div className="text-[9px] text-neon-green/20 mt-1">{camera.provider}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Camera Tile Component ──────────────────────────────────────────────
function CameraTile({
  camera,
  isSelected,
  onClick,
  showDetections,
  showLabels,
  viewMode,
}: {
  camera: CameraFeed;
  isSelected: boolean;
  onClick: () => void;
  showDetections: boolean;
  showLabels: boolean;
  viewMode: ViewMode;
}) {
  const alertColors = {
    normal: "border-neon-green/30",
    caution: "border-yellow-500/50",
    alert: "border-orange-500/50",
    critical: "border-red-500/70 animate-pulse",
  };

  const isLarge = viewMode === "single" || viewMode === "theater";

  return (
    <div
      className={`relative bg-black rounded overflow-hidden cursor-pointer border-2 transition-all group ${
        alertColors[camera.alertLevel]
      } ${isSelected ? "ring-2 ring-neon-green shadow-[0_0_20px_rgba(0,255,65,0.3)]" : "hover:border-neon-green/50"}`}
      onClick={onClick}
      style={{ aspectRatio: isLarge ? "16/9" : "4/3" }}
    >
      {/* Actual Live Stream */}
      <LiveStreamEmbed camera={camera} />

      <CRTEffect />

      {/* Detection Overlay on top of real video */}
      {showDetections && <DetectionOverlay detections={camera.detections} showLabels={showLabels} />}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${camera.status === "live" || camera.status === "device" ? "bg-red-500 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-[10px] font-mono font-bold text-neon-green tracking-wider drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{camera.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-neon-green/60 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{camera.fps}fps</span>
          <span className="text-[9px] font-mono text-neon-green/40 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{camera.resolution}</span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="flex items-center gap-1.5">
          {camera.type === "device" ? (
            <Smartphone className="w-3 h-3 text-neon-cyan/60" />
          ) : (
            <MapPin className="w-3 h-3 text-neon-green/60" />
          )}
          <span className="text-[9px] font-mono text-neon-green/70 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{camera.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {camera.detections.length > 0 && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-neon-green/40 text-neon-green font-mono bg-black/50">
              <Target className="w-2.5 h-2.5 mr-0.5" />
              {camera.detections.length} OBJ
            </Badge>
          )}
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-neon-cyan/40 text-neon-cyan font-mono bg-black/50">
            {camera.provider}
          </Badge>
        </div>
      </div>

      {/* Timestamp overlay */}
      <div className="absolute top-8 right-2 text-[9px] font-mono text-neon-green/40 z-20 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
        {new Date().toLocaleTimeString()} UTC
      </div>

      {/* Hover actions */}
      <div className="absolute top-8 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 bg-black/60 text-neon-green hover:bg-neon-green/20" onClick={(e) => { e.stopPropagation(); toast.success("Snapshot saved to evidence"); }}>
          <Download className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main YOLO Camera Page ──────────────────────────────────────────────
export default function YoloCameraPage() {
  const [cameras] = useState<CameraFeed[]>(buildCameraFeeds);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid-3x3");
  const [showDetections, setShowDetections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Refresh detections periodically
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const activeCameras = useMemo(() => {
    let cams = cameras;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      cams = cams.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q));
    }
    return cams.map(c => ({ ...c, detections: c.type === "device" ? generateDetections("device") : generateDetections(c.type) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, searchQuery, tick]);

  const totalDetections = useMemo(() =>
    activeCameras.reduce((sum, c) => sum + c.detections.length, 0),
    [activeCameras]
  );

  const detectionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const cam of activeCameras) {
      for (const d of cam.detections) {
        stats[d.class] = (stats[d.class] || 0) + 1;
      }
    }
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [activeCameras]);

  const gridClass = {
    "grid-2x2": "grid-cols-2",
    "grid-3x3": "grid-cols-3",
    "grid-4x4": "grid-cols-4",
    single: "grid-cols-1",
    theater: "grid-cols-1",
  }[viewMode];

  const selected = activeCameras.find(c => c.id === selectedCamera);

  return (
    <div className="h-full flex flex-col bg-black text-neon-green font-mono">
      {/* Top Command Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neon-green/20 bg-black/90 backdrop-blur flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-neon-green animate-pulse" />
            <span className="text-sm font-bold tracking-[0.2em] text-neon-green">YOLO SURVEILLANCE</span>
          </div>
          <Badge variant="outline" className="border-neon-green/40 text-neon-green text-[10px] font-mono">
            YOLOv5 DETECTION ENGINE
          </Badge>
          <Badge variant="outline" className="border-red-500/40 text-red-400 text-[10px] font-mono animate-pulse">
            <Radio className="w-3 h-3 mr-1" /> LIVE
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 mr-4 text-[10px]">
            <span className="text-neon-green/60">
              <Camera className="w-3 h-3 inline mr-1" />
              {activeCameras.length} FEEDS
            </span>
            <span className="text-neon-cyan/60">
              <Target className="w-3 h-3 inline mr-1" />
              {totalDetections} DETECTIONS
            </span>
            <span className="text-yellow-400/60">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {activeCameras.filter(c => c.alertLevel !== "normal").length} ALERTS
            </span>
          </div>

          <div className="flex items-center gap-1 border border-neon-green/20 rounded p-0.5">
            {([
              { mode: "grid-2x2" as ViewMode, icon: LayoutGrid, label: "2x2" },
              { mode: "grid-3x3" as ViewMode, icon: Grid3X3, label: "3x3" },
              { mode: "grid-4x4" as ViewMode, icon: Layers, label: "4x4" },
              { mode: "single" as ViewMode, icon: Maximize2, label: "1x1" },
            ]).map(({ mode, icon: Icon }) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={`h-6 w-6 p-0 ${viewMode === mode ? "bg-neon-green/20 text-neon-green" : "text-neon-green/40 hover:text-neon-green"}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetections(!showDetections)}
            className={`h-7 px-2 text-[10px] ${showDetections ? "text-neon-green bg-neon-green/10" : "text-neon-green/40"}`}
          >
            <Box className="w-3 h-3 mr-1" /> BBOX
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLabels(!showLabels)}
            className={`h-7 px-2 text-[10px] ${showLabels ? "text-neon-green bg-neon-green/10" : "text-neon-green/40"}`}
          >
            <ScanLine className="w-3 h-3 mr-1" /> LABELS
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className={`h-7 px-2 text-[10px] ${isPaused ? "text-yellow-400" : "text-neon-green/60"}`}
          >
            {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
            {isPaused ? "RESUME" : "PAUSE"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Camera Grid */}
        <div className="flex-1 p-2 overflow-auto">
          <div className={`grid ${gridClass} gap-2`}>
            {activeCameras.map(camera => (
              <CameraTile
                key={camera.id}
                camera={camera}
                isSelected={selectedCamera === camera.id}
                onClick={() => setSelectedCamera(selectedCamera === camera.id ? null : camera.id)}
                showDetections={showDetections}
                showLabels={showLabels}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar - Detection Log */}
        {showSidebar && (
          <div className="w-72 border-l border-neon-green/20 bg-black/90 flex flex-col">
            <div className="p-3 border-b border-neon-green/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-neon-green">DETECTION LOG</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-neon-green/40" onClick={() => setShowSidebar(false)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neon-green/40" />
                <input
                  className="w-full bg-neon-green/5 border border-neon-green/20 rounded px-6 py-1 text-[10px] text-neon-green placeholder:text-neon-green/30 focus:outline-none focus:border-neon-green/50"
                  placeholder="Filter cameras..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                {detectionStats.slice(0, 8).map(([cls, count]) => (
                  <div key={cls} className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: YOLO_CLASSES[cls]?.color || "#00ff41" }} />
                      <span className="text-neon-green/80 uppercase">{cls}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-neon-green/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (count / Math.max(1, totalDetections)) * 300)}%`,
                            backgroundColor: YOLO_CLASSES[cls]?.color || "#00ff41",
                          }}
                        />
                      </div>
                      <span className="text-neon-green/60 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selected && (
              <div className="p-3 border-b border-neon-green/20">
                <div className="text-[11px] font-bold tracking-wider text-neon-green mb-2">SELECTED FEED</div>
                <div className="space-y-1 text-[9px]">
                  {[
                    ["NAME", selected.name],
                    ["LOCATION", selected.location],
                    ["PROVIDER", selected.provider],
                    ["RESOLUTION", selected.resolution],
                    ["FPS", String(selected.fps)],
                    ["OBJECTS", String(selected.detections.length)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-neon-green/50">{label}</span>
                      <span className={label === "PROVIDER" ? "text-neon-cyan" : "text-neon-green"}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-neon-green/50">ALERT</span>
                    <span className={selected.alertLevel === "normal" ? "text-neon-green" : selected.alertLevel === "caution" ? "text-yellow-400" : "text-red-400"}>
                      {selected.alertLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {activeCameras.flatMap(cam =>
                  cam.detections.map((d, i) => ({
                    cam: cam.name,
                    ...d,
                    key: `${cam.id}-${i}`,
                  }))
                ).slice(0, 50).map(item => (
                  <div key={item.key} className="flex items-center gap-2 px-2 py-1 rounded bg-neon-green/5 hover:bg-neon-green/10 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-neon-green/80 truncate uppercase">{item.class}</div>
                      <div className="text-[8px] text-neon-green/40 truncate">{item.cam}</div>
                    </div>
                    <span className="text-[9px] text-neon-green/60">{(item.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!showSidebar && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-14 h-6 w-6 p-0 text-neon-green/40 hover:text-neon-green z-30"
            onClick={() => setShowSidebar(true)}
          >
            <ChevronDown className="w-3 h-3 rotate-90" />
          </Button>
        )}
      </div>
    </div>
  );
}
