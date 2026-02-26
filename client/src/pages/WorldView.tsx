import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
import {
  Globe, Plane, Activity, CloudLightning, Shield, Newspaper,
  Radio, Eye, Crosshair, Layers, Maximize2, AlertTriangle,
  TrendingUp, MessageSquare, Wifi, RefreshCw,
  ChevronLeft, ChevronRight, Target, Radar, Satellite,
  Camera, Video, Upload, Copy, Share2, MapPin, Image,
  Navigation, X, ExternalLink, FileText, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLink } from "@/hooks/useAppLink";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type ViewMode = "STANDARD" | "CRT" | "FLIR" | "TACTICAL" | "SATELLITE";
type DataLayer = "flights" | "earthquakes" | "weather" | "geoEvents" | "cameras" | "worldcams" | "all";
type LeftPanel = "intel" | "events" | "social";
type RightPanel = "seismic" | "cameras" | "worldcams" | "exif" | "streetview";

function severityColor(sev: string): string {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "text-red-400";
  if (s === "HIGH") return "text-orange-400";
  if (s === "MEDIUM") return "text-yellow-400";
  return "text-emerald-400";
}

function severityBg(sev: string): string {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "bg-red-500/20 border-red-500/40";
  if (s === "HIGH") return "bg-orange-500/20 border-orange-500/40";
  if (s === "MEDIUM") return "bg-yellow-500/20 border-yellow-500/40";
  return "bg-emerald-500/20 border-emerald-500/40";
}

function eventTypeIcon(type: string) {
  const map: Record<string, string> = {
    conflict: "\u2694\uFE0F", protest: "\u270A", disaster: "\uD83C\uDF0A",
    election: "\uD83D\uDDF3\uFE0F", cyber: "\uD83D\uDCBB", health: "\uD83C\uDFE5",
    economic: "\uD83D\uDCC8",
  };
  return map[type] || "\uD83D\uDCCA";
}

function sentimentColor(s: string) {
  if (s === "positive") return "text-emerald-400";
  if (s === "negative") return "text-red-400";
  if (s === "mixed") return "text-amber-400";
  return "text-zinc-400";
}

function copyToClipboard(text: string, label = "Data") {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied to clipboard`);
  }).catch(() => {
    toast.error("Copy failed");
  });
}

function ShareButton({ data, label }: { data: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); copyToClipboard(data, label); }}
        className="p-1 rounded hover:bg-cyan-900/30 transition-colors"
        title="Copy"
      >
        <Copy className="w-3 h-3 text-zinc-500 hover:text-cyan-400" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (navigator.share) {
            navigator.share({ title: label, text: data }).catch(() => {});
          } else {
            copyToClipboard(data, label);
          }
        }}
        className="p-1 rounded hover:bg-cyan-900/30 transition-colors"
        title="Share"
      >
        <Share2 className="w-3 h-3 text-zinc-500 hover:text-cyan-400" />
      </button>
    </div>
  );
}

export default function WorldView() {
  const { user } = useAuth();
  const { openLink } = useAppLink();
  const [viewMode, setViewMode] = useState<ViewMode>("STANDARD");
  const [activeLayer, setActiveLayer] = useState<DataLayer>("all");
  const [selectedPanel, setSelectedPanel] = useState<LeftPanel>("intel");
  const [rightPanel, setRightPanel] = useState<RightPanel>("seismic");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [streetViewActive, setStreetViewActive] = useState(false);
  const [streetViewLocation, setStreetViewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [exifUrl, setExifUrl] = useState("");
  const [selectedWorldCam, setSelectedWorldCam] = useState<string | null>(null);
  const [worldCamFilter, setWorldCamFilter] = useState<string>("all");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const streetViewRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  // Animated flight system
  const flightMarkersRef = useRef<google.maps.Marker[]>([]);
  const flightTrailsRef = useRef<google.maps.Polyline[]>([]);
  const flightPulsesRef = useRef<google.maps.Circle[]>([]);
  const flightInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const prevFlightPosRef = useRef<Map<string, { lat: number; lng: number; heading: number }>>(new Map());
  const animFrameRef = useRef<number>(0);

  const { data: osintData, isLoading, refetch, isFetching } = trpc.osint.dashboard.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60000,
  });
  const { data: socialTrends } = trpc.osint.socialTrends.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 120000,
  });
  const { data: trafficCams } = trpc.osint.trafficCameras.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 300000,
  });
  const { data: worldCams } = trpc.osint.worldCams.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 300000,
  });

  const analyzeMutation = trpc.osint.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      toast.success("Intelligence analysis complete");
    },
    onError: (err) => toast.error(err.message),
  });

  const exifMutation = trpc.osint.exifExtract.useMutation({
    onSuccess: (data) => {
      toast.success(`EXIF extracted — Confidence: ${data.confidence}%`);
      if (data.hasGps && data.gps.latitude && data.gps.longitude && mapRef.current) {
        mapRef.current.panTo({ lat: data.gps.latitude, lng: data.gps.longitude });
        mapRef.current.setZoom(15);
        const marker = new google.maps.Marker({
          position: { lat: data.gps.latitude, lng: data.gps.longitude },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#f59e0b",
            fillOpacity: 0.9,
            strokeColor: "#f59e0b",
            strokeWeight: 2,
          },
          title: "EXIF GPS Location",
        });
        markersRef.current.push(marker);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setOptions({
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0a0f1a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#4a6fa5" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a3a5c" }] },
        { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#2a5a8c" }] },
        { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
        { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "road", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#1a3a5c" }] },
      ],
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: false,
      zoomControl: false,
      center: { lat: 20, lng: 10 },
      zoom: 2.5,
      minZoom: 2,
      backgroundColor: "#0a0f1a",
    });

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setStreetViewLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });
  }, []);

  // Toggle satellite view mode
  useEffect(() => {
    if (!mapRef.current) return;
    if (viewMode === "SATELLITE") {
      mapRef.current.setMapTypeId("hybrid");
    } else {
      mapRef.current.setMapTypeId("roadmap");
    }
  }, [viewMode]);

  // Toggle traffic layer
  useEffect(() => {
    if (!mapRef.current) return;
    if (activeLayer === "cameras" || activeLayer === "all") {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(mapRef.current);
    } else {
      trafficLayerRef.current?.setMap(null);
    }
  }, [activeLayer]);

  // Street View panorama
  useEffect(() => {
    if (!mapRef.current || !streetViewLocation || !streetViewActive) return;
    const svContainer = document.getElementById("streetview-pano");
    if (!svContainer) return;

    streetViewRef.current = new google.maps.StreetViewPanorama(svContainer, {
      position: streetViewLocation,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      showRoadLabels: true,
      motionTracking: false,
    });
  }, [streetViewLocation, streetViewActive]);

  // Shared InfoWindow for all markers
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  // Plot data on map with enhanced interactivity
  useEffect(() => {
    if (!mapRef.current || !osintData) return;
    const map = mapRef.current;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
    const iw = infoWindowRef.current;

    // ── Earthquake Heatmap Layer ──
    if (activeLayer === "all" || activeLayer === "earthquakes") {
      const heatData = (osintData.earthquakes || []).filter(eq => eq.latitude && eq.longitude).map(eq => ({
        location: new google.maps.LatLng(eq.latitude, eq.longitude),
        weight: Math.pow(2, eq.magnitude),
      }));
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      try {
        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
          data: heatData,
          map,
          radius: 40,
          opacity: 0.35,
          gradient: [
            "rgba(0,255,0,0)", "rgba(0,255,0,0.4)", "rgba(255,255,0,0.6)",
            "rgba(255,165,0,0.8)", "rgba(255,0,0,1)",
          ],
        });
      } catch { /* visualization library not loaded */ }

      (osintData.earthquakes || []).forEach(eq => {
        if (eq.latitude && eq.longitude) {
          const size = Math.max(8, eq.magnitude * 4);
          const color = eq.magnitude >= 5 ? "#ef4444" : eq.magnitude >= 4 ? "#f59e0b" : "#22c55e";
          const marker = new google.maps.Marker({
            position: { lat: eq.latitude, lng: eq.longitude },
            map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: size, fillColor: color, fillOpacity: 0.6, strokeColor: color, strokeWeight: 1 },
            title: `M${eq.magnitude} — ${eq.place}`,
          });
          marker.addListener("click", () => {
            iw.setContent(`
              <div style="font-family:monospace;background:#0a0f1a;color:#e2e8f0;padding:10px;border-radius:6px;min-width:220px;border:1px solid ${color}40;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                  <span style="font-size:18px;font-weight:bold;color:${color};">M${eq.magnitude}</span>
                  <span style="font-size:10px;color:#64748b;">SEISMIC EVENT</span>
                </div>
                <div style="font-size:11px;line-height:1.6;">
                  <div><span style="color:#64748b;">LOCATION</span> ${eq.place}</div>
                  <div><span style="color:#64748b;">DEPTH</span> ${eq.depth || "N/A"} km</div>
                  <div><span style="color:#64748b;">COORDS</span> ${eq.latitude.toFixed(4)}, ${eq.longitude.toFixed(4)}</div>
                  <div><span style="color:#64748b;">TIME</span> ${new Date(eq.time).toLocaleString()}</div>
                </div>
              </div>
            `);
            iw.open(map, marker);
          });
          markersRef.current.push(marker);
        }
      });
    } else {
      if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    }

    // ── Geo Events with InfoWindows ──
    if (activeLayer === "all" || activeLayer === "geoEvents") {
      (osintData.geoEvents || []).forEach(ev => {
        if (ev.latitude && ev.longitude) {
          const colors: Record<string, string> = {
            conflict: "#ef4444", protest: "#f59e0b", disaster: "#3b82f6",
            election: "#a855f7", cyber: "#06b6d4", health: "#22c55e", economic: "#eab308",
          };
          const color = colors[ev.type] || "#ffffff";
          const marker = new google.maps.Marker({
            position: { lat: ev.latitude, lng: ev.longitude },
            map,
            icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: color, fillOpacity: 0.8, strokeColor: color, strokeWeight: 2 },
            title: `[${ev.severity}] ${ev.title}`,
          });
          marker.addListener("click", () => {
            iw.setContent(`
              <div style="font-family:monospace;background:#0a0f1a;color:#e2e8f0;padding:10px;border-radius:6px;min-width:240px;border:1px solid ${color}40;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                  <span style="font-size:14px;">${eventTypeIcon(ev.type)}</span>
                  <span style="font-size:10px;text-transform:uppercase;color:${color};font-weight:bold;letter-spacing:1px;">${ev.type} — ${ev.severity}</span>
                </div>
                <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${ev.title}</div>
                <div style="font-size:10px;color:#94a3b8;line-height:1.5;">${ev.description || ""}</div>
                <div style="font-size:9px;color:#475569;margin-top:6px;border-top:1px solid #1e293b;padding-top:4px;">
                  ${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}
                </div>
              </div>
            `);
            iw.open(map, marker);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // Flights are rendered by the animated flight system below (not static markers)

    // ── Traffic cameras with InfoWindows ──
    if ((activeLayer === "all" || activeLayer === "cameras") && trafficCams) {
      trafficCams.forEach(cam => {
        if (cam.latitude && cam.longitude) {
          const marker = new google.maps.Marker({
            position: { lat: cam.latitude, lng: cam.longitude },
            map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#8b5cf6", fillOpacity: 0.8, strokeColor: "#8b5cf6", strokeWeight: 1 },
            title: `[CAM] ${cam.name}`,
          });
          marker.addListener("click", () => {
            iw.setContent(`
              <div style="font-family:monospace;background:#0a0f1a;color:#e2e8f0;padding:10px;border-radius:6px;min-width:200px;border:1px solid #8b5cf640;">
                <div style="font-size:10px;color:#8b5cf6;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">TRAFFIC CAMERA</div>
                <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${cam.name}</div>
                <div style="font-size:10px;line-height:1.6;">
                  <div><span style="color:#64748b;">ROUTE</span> ${cam.route} ${cam.direction}</div>
                  <div><span style="color:#64748b;">STATE</span> ${cam.state}</div>
                  <div><span style="color:#64748b;">SOURCE</span> ${cam.source}</div>
                </div>
              </div>
            `);
            iw.open(map, marker);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // ── World cams with InfoWindows and inline watch ──
    if ((activeLayer === "all" || activeLayer === "worldcams") && worldCams) {
      worldCams.forEach(cam => {
        if (cam.latitude && cam.longitude) {
          const marker = new google.maps.Marker({
            position: { lat: cam.latitude, lng: cam.longitude },
            map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: "#ec4899", fillOpacity: 0.8, strokeColor: "#ec4899", strokeWeight: 1 },
            title: `[LIVE] ${cam.title}`,
          });
          marker.addListener("click", () => {
            const hasEmbed = (cam as any).embedUrl;
            iw.setContent(`
              <div style="font-family:monospace;background:#0a0f1a;color:#e2e8f0;padding:10px;border-radius:6px;min-width:240px;border:1px solid #ec489940;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 2s infinite;"></span>
                  <span style="font-size:10px;color:#ec4899;font-weight:bold;letter-spacing:1px;">WORLD CAM — LIVE</span>
                </div>
                <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${cam.title}</div>
                <div style="font-size:10px;line-height:1.6;">
                  <div><span style="color:#64748b;">LOCATION</span> ${cam.city}, ${cam.country}</div>
                  <div><span style="color:#64748b;">VIEWERS</span> ${cam.viewers.toLocaleString()}</div>
                  <div><span style="color:#64748b;">CATEGORY</span> ${(cam as any).category || "general"}</div>
                  ${(cam as any).description ? `<div style="color:#94a3b8;margin-top:4px;">${(cam as any).description}</div>` : ""}
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;">
                  ${cam.viewUrl && cam.viewUrl !== "#" ? `<a href="#" onclick="event.preventDefault();window.dispatchEvent(new CustomEvent('open-in-app',{detail:{url:'${cam.viewUrl}',title:'${(cam as any).label || "Live Cam"}'}}))" style="font-size:10px;padding:3px 8px;background:#ec489930;border:1px solid #ec489950;border-radius:4px;color:#ec4899;text-decoration:none;cursor:pointer;">WATCH LIVE ↗</a>` : ""}
                  ${hasEmbed ? `<a href="#" onclick="event.preventDefault();window.dispatchEvent(new CustomEvent('open-in-app',{detail:{url:'${(cam as any).embedUrl}',title:'Embed'}}))" style="font-size:10px;padding:3px 8px;background:#06b6d430;border:1px solid #06b6d450;border-radius:4px;color:#06b6d4;text-decoration:none;cursor:pointer;">EMBED ↗</a>` : ""}
                </div>
              </div>
            `);
            iw.open(map, marker);
          });
          markersRef.current.push(marker);
        }
      });
    }
  }, [osintData, activeLayer, trafficCams, worldCams]);

  const stats = useMemo(() => {
    if (!osintData) return null;
    return {
      flights: osintData.flights?.length || 0,
      quakes: osintData.earthquakes?.length || 0,
      criticalQuakes: osintData.earthquakes?.filter((q: any) => q.magnitude >= 5).length || 0,
      weatherAlerts: osintData.weatherAlerts?.length || 0,
      cves: osintData.cves?.length || 0,
      criticalCVEs: osintData.cves?.filter((c: any) => c.severity === "CRITICAL").length || 0,
      news: osintData.globalNews?.length || 0,
      geoEvents: osintData.geoEvents?.length || 0,
      criticalEvents: osintData.geoEvents?.filter((e: any) => e.severity === "CRITICAL").length || 0,
      regions: osintData.systemStatus?.regions || [],
      feedsOnline: osintData.systemStatus?.feedsOnline || 0,
      feedsTotal: osintData.systemStatus?.feedsTotal || 7,
      dataPoints: osintData.systemStatus?.dataPoints || 0,
      trafficCams: trafficCams?.length || 0,
      worldCams: worldCams?.length || 0,
    };
  }, [osintData, trafficCams, worldCams]);

  // ─── Animated Flight Paths System ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const flights = osintData?.flights || [];
    const showFlights = activeLayer === "all" || activeLayer === "flights";

    // Clean up previous flight overlays
    flightMarkersRef.current.forEach(m => m.setMap(null));
    flightTrailsRef.current.forEach(t => t.setMap(null));
    flightPulsesRef.current.forEach(p => p.setMap(null));
    flightMarkersRef.current = [];
    flightTrailsRef.current = [];
    flightPulsesRef.current = [];
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (!showFlights || flights.length === 0) {
      prevFlightPosRef.current.clear();
      return;
    }

    // Custom plane SVG path (pointing up, rotated by heading)
    const planePath = "M 0,-8 L 2,-4 L 2,0 L 6,4 L 6,5 L 2,3 L 2,6 L 4,8 L 4,9 L 0,7.5 L -4,9 L -4,8 L -2,6 L -2,3 L -6,5 L -6,4 L -2,0 L -2,-4 Z";

    const prevPositions = prevFlightPosRef.current;
    const newPositions = new Map<string, { lat: number; lng: number; heading: number }>();

    // Create shared InfoWindow
    if (!flightInfoRef.current) {
      flightInfoRef.current = new google.maps.InfoWindow();
    }

    const visibleFlights = flights.filter(fl => fl.latitude && fl.longitude && !fl.onGround).slice(0, 100);

    visibleFlights.forEach(fl => {
      const lat = fl.latitude!;
      const lng = fl.longitude!;
      const heading = fl.heading || 0;
      const key = fl.icao24 || fl.callsign;
      const prev = prevPositions.get(key);

      newPositions.set(key, { lat, lng, heading });

      // Altitude-based color: low=green, mid=cyan, high=blue, very high=purple
      const alt = fl.altitude || 0;
      const color = alt > 12000 ? "#a855f7" : alt > 8000 ? "#3b82f6" : alt > 4000 ? "#06b6d4" : "#22c55e";
      const trailColor = alt > 12000 ? "#a855f780" : alt > 8000 ? "#3b82f680" : alt > 4000 ? "#06b6d480" : "#22c55e80";

      // ── Trail polyline (from previous position to current) ──
      if (prev && (Math.abs(prev.lat - lat) > 0.001 || Math.abs(prev.lng - lng) > 0.001)) {
        // Generate intermediate points for a smooth arc
        const midLat = (prev.lat + lat) / 2;
        const midLng = (prev.lng + lng) / 2;
        const trailPath = [
          { lat: prev.lat, lng: prev.lng },
          { lat: midLat, lng: midLng },
          { lat, lng },
        ];

        const trail = new google.maps.Polyline({
          path: trailPath,
          geodesic: true,
          strokeColor: trailColor,
          strokeOpacity: 0,
          strokeWeight: 2,
          map,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.6,
              strokeColor: color,
              strokeWeight: 2,
              scale: 1,
            },
            offset: "0",
            repeat: "6px",
          }],
        });
        flightTrailsRef.current.push(trail);
      }

      // ── Pulsing glow circle ──
      const pulse = new google.maps.Circle({
        center: { lat, lng },
        radius: 15000 + (alt / 1000) * 2000,
        fillColor: color,
        fillOpacity: 0.08,
        strokeColor: color,
        strokeOpacity: 0.2,
        strokeWeight: 1,
        map,
        clickable: false,
      });
      flightPulsesRef.current.push(pulse);

      // ── Plane marker with custom SVG ──
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: planePath,
          scale: 1.2,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 0.5,
          rotation: heading,
          anchor: new google.maps.Point(0, 0),
        },
        title: `${fl.callsign?.trim() || "UNKNOWN"} | ${fl.originCountry} | ALT: ${alt}m | SPD: ${Math.round(fl.velocity || 0)}m/s`,
        zIndex: 1000 + Math.round(alt / 100),
      });

      // ── Click info window ──
      marker.addListener("click", () => {
        const speed = fl.velocity ? Math.round(fl.velocity * 3.6) : 0; // m/s to km/h
        const altFt = alt ? Math.round(alt * 3.281) : 0;
        flightInfoRef.current?.setContent(`
          <div style="font-family: 'JetBrains Mono', monospace; background: #0a0f1a; color: #e2e8f0; padding: 12px; border-radius: 8px; min-width: 220px; border: 1px solid #1a3a5c;">
            <div style="font-size: 14px; font-weight: bold; color: ${color}; margin-bottom: 8px; letter-spacing: 1px;">
              \u2708 ${fl.callsign?.trim() || "UNKNOWN"}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 11px;">
              <span style="color: #64748b;">ORIGIN</span><span>${fl.originCountry}</span>
              <span style="color: #64748b;">ICAO24</span><span>${fl.icao24}</span>
              <span style="color: #64748b;">ALT</span><span>${alt.toLocaleString()}m / ${altFt.toLocaleString()}ft</span>
              <span style="color: #64748b;">SPEED</span><span>${speed} km/h / ${Math.round(speed * 0.54)} kts</span>
              <span style="color: #64748b;">HEADING</span><span>${Math.round(heading)}\u00B0</span>
              <span style="color: #64748b;">COORDS</span><span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
              <span style="color: #64748b;">STATUS</span><span style="color: #22c55e;">\u25CF AIRBORNE</span>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #1a3a5c; font-size: 10px; color: #475569;">
              Last contact: ${new Date(fl.lastContact * 1000).toLocaleTimeString()}
            </div>
          </div>
        `);
        flightInfoRef.current?.open(map, marker);
      });

      flightMarkersRef.current.push(marker);
    });

    // Save current positions for next trail render
    prevFlightPosRef.current = newPositions;

    // ── Pulse animation loop ──
    let pulsePhase = 0;
    const animatePulses = () => {
      pulsePhase += 0.02;
      const opacity = 0.04 + Math.sin(pulsePhase) * 0.04;
      const strokeOp = 0.1 + Math.sin(pulsePhase) * 0.1;
      flightPulsesRef.current.forEach(p => {
        p.setOptions({ fillOpacity: Math.max(0, opacity), strokeOpacity: Math.max(0, strokeOp) });
      });
      animFrameRef.current = requestAnimationFrame(animatePulses);
    };
    animFrameRef.current = requestAnimationFrame(animatePulses);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [osintData?.flights, activeLayer]);

  const isFlir = viewMode === "FLIR";
  const isCrt = viewMode === "CRT";

  return (
    <div className="h-[calc(100vh-2rem)] -m-4 md:-m-6 flex flex-col overflow-hidden relative">
      {/* CRT Scanline Overlay */}
      {isCrt && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,65,0.03)_2px,rgba(0,255,65,0.03)_4px)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.4))]" />
        </div>
      )}
      {isFlir && (
        <div className="pointer-events-none fixed inset-0 z-50 mix-blend-multiply bg-gradient-to-b from-amber-900/20 to-purple-900/20" />
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-900/30 bg-black/60 backdrop-blur-xl z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Radar className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: "4s" }} />
          <span className="font-mono text-sm font-bold tracking-widest text-cyan-300">WORLDVIEW</span>
          <span className="text-[10px] font-mono text-zinc-500">{viewMode} MODE</span>
          {stats && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
              <Wifi className="w-3 h-3 mr-1" />{stats.feedsOnline}/{stats.feedsTotal} FEEDS
            </Badge>
          )}
          {streetViewActive && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 font-mono animate-pulse">
              <Navigation className="w-3 h-3 mr-1" />STREET VIEW — CLICK MAP
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-7 bg-black/60 border border-cyan-900/30">
              <TabsTrigger value="STANDARD" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-cyan-900/40 data-[state=active]:text-cyan-300">EO</TabsTrigger>
              <TabsTrigger value="CRT" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-green-900/40 data-[state=active]:text-green-300">CRT</TabsTrigger>
              <TabsTrigger value="FLIR" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">FLIR</TabsTrigger>
              <TabsTrigger value="TACTICAL" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-red-900/40 data-[state=active]:text-red-300">TAC</TabsTrigger>
              <TabsTrigger value="SATELLITE" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-purple-900/40 data-[state=active]:text-purple-300">SAT</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Layer Tabs */}
          <Tabs value={activeLayer} onValueChange={(v) => setActiveLayer(v as DataLayer)}>
            <TabsList className="h-7 bg-black/60 border border-cyan-900/30">
              <TabsTrigger value="all" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-cyan-900/40"><Layers className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="flights" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-cyan-900/40"><Plane className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="earthquakes" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-cyan-900/40"><Activity className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="geoEvents" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-cyan-900/40"><Target className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="cameras" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-purple-900/40"><Camera className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="worldcams" className="text-[10px] h-5 px-2 font-mono data-[state=active]:bg-pink-900/40"><Video className="w-3 h-3" /></TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Action Buttons */}
          <Button
            variant="ghost" size="icon" className={`h-7 w-7 ${streetViewActive ? "bg-amber-900/40" : ""}`}
            onClick={() => { setStreetViewActive(!streetViewActive); if (streetViewActive) setStreetViewLocation(null); }}
            title="Toggle Street View Mode"
          >
            <Navigation className={`w-3.5 h-3.5 ${streetViewActive ? "text-amber-400" : "text-cyan-400"}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => analyzeMutation.mutate({ focus: undefined })} disabled={analyzeMutation.isPending}>
            <Crosshair className={`w-3.5 h-3.5 text-amber-400 ${analyzeMutation.isPending ? "animate-pulse" : ""}`} />
          </Button>
          <GenerateReportButton />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMapFullscreen(!mapFullscreen)}>
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          </Button>
        </div>
      </div>

      {/* AI Analysis Drawer */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-amber-900/30 bg-black/80 backdrop-blur-xl z-30 overflow-hidden shrink-0"
          >
            <div className="p-4 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-amber-400">INTELLIGENCE ANALYSIS</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShareButton data={analysisResult} label="Intelligence Analysis" />
                  <button onClick={() => setAnalysisResult(null)} className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300">DISMISS</button>
                </div>
              </div>
              <div className="text-xs text-zinc-300 prose-sm max-w-none">
                <Streamdown>{analysisResult}</Streamdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Street View Panel */}
      <AnimatePresence>
        {streetViewActive && streetViewLocation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 250, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-amber-900/30 bg-black/60 z-30 overflow-hidden shrink-0 relative"
          >
            <div className="absolute top-2 right-2 z-40 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 font-mono">
                <Navigation className="w-3 h-3 mr-1" />
                {streetViewLocation.lat.toFixed(4)}, {streetViewLocation.lng.toFixed(4)}
              </Badge>
              <ShareButton data={`${streetViewLocation.lat},${streetViewLocation.lng}`} label="Street View Coordinates" />
              <button
                onClick={() => { setStreetViewLocation(null); setStreetViewActive(false); }}
                className="p-1 rounded bg-black/60 hover:bg-red-900/40 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400 hover:text-red-400" />
              </button>
            </div>
            <div id="streetview-pano" className="w-full h-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left Panel */}
        <AnimatePresence>
          {!mapFullscreen && !leftCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-r border-cyan-900/20 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex border-b border-cyan-900/20 shrink-0">
                {([
                  { id: "intel" as const, label: "INTEL", icon: Eye },
                  { id: "events" as const, label: "EVENTS", icon: AlertTriangle },
                  { id: "social" as const, label: "SOCIAL", icon: MessageSquare },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedPanel(tab.id)}
                    className={`flex-1 py-2 text-[10px] font-mono tracking-wider flex items-center justify-center gap-1 transition-colors
                      ${selectedPanel === tab.id ? "text-cyan-300 bg-cyan-900/20 border-b-2 border-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1 overflow-hidden">
                <div className="p-3 space-y-2">
                  {selectedPanel === "intel" && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-mono text-cyan-500 tracking-widest">
                          GLOBAL INTELLIGENCE — {osintData?.globalNews?.length || 0} ITEMS
                        </div>
                        <ShareButton
                          data={(osintData?.globalNews || []).map((n: any) => `[${n.region}] ${n.title} — ${n.url}`).join("\n")}
                          label="All Intel"
                        />
                      </div>
                      {(osintData?.globalNews || []).map((item: any, i: number) => (
                        <motion.div
                          key={i}
                          onClick={() => item.url && openLink(item.url, item.title || "News")}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="block p-2.5 rounded border border-cyan-900/20 bg-cyan-950/10 hover:bg-cyan-900/20 hover:border-cyan-700/30 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-cyan-800/40 text-cyan-500 font-mono">{item.region}</Badge>
                              <span className="text-[8px] font-mono text-zinc-600">{item.source}</span>
                            </div>
                            <ShareButton data={`${item.title}\n${item.url}`} label="News Item" />
                          </div>
                          <p className="text-xs text-zinc-300 leading-tight group-hover:text-cyan-200 transition-colors">{item.title}</p>
                          <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2">{item.description}</p>
                        </motion.div>
                      ))}
                      {(!osintData?.globalNews || osintData.globalNews.length === 0) && (
                        <div className="text-center py-8 text-zinc-600 text-xs font-mono">AWAITING INTEL...</div>
                      )}
                    </>
                  )}

                  {selectedPanel === "events" && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-mono text-amber-500 tracking-widest">
                          GLOBAL EVENTS — {osintData?.geoEvents?.length || 0} ACTIVE
                        </div>
                        <ShareButton
                          data={(osintData?.geoEvents || []).map((e: any) => `[${e.severity}] ${e.type}: ${e.title} (${e.country})`).join("\n")}
                          label="All Events"
                        />
                      </div>
                      {(osintData?.geoEvents || []).map((ev: any, i: number) => (
                        <motion.div
                          key={ev.id || i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-2.5 rounded border ${severityBg(ev.severity)} cursor-pointer hover:scale-[1.02] transition-transform`}
                          onClick={() => {
                            if (mapRef.current && ev.latitude && ev.longitude) {
                              mapRef.current.panTo({ lat: ev.latitude, lng: ev.longitude });
                              mapRef.current.setZoom(6);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{eventTypeIcon(ev.type)}</span>
                              <Badge variant="outline" className={`text-[8px] px-1 py-0 font-mono ${severityColor(ev.severity)}`}>{ev.severity}</Badge>
                              <span className="text-[8px] font-mono text-zinc-500">{ev.country}</span>
                            </div>
                            <ShareButton data={`[${ev.severity}] ${ev.title}\nLocation: ${ev.latitude},${ev.longitude}`} label="Event" />
                          </div>
                          <p className="text-xs text-zinc-300 leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">{ev.source}</p>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {selectedPanel === "social" && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-mono text-purple-500 tracking-widest">
                          SOCIAL INTELLIGENCE — {socialTrends?.length || 0} TRENDS
                        </div>
                        <ShareButton
                          data={(socialTrends || []).map((t: any) => `[${t.platform}] ${t.topic} — ${t.volume} mentions`).join("\n")}
                          label="Social Trends"
                        />
                      </div>
                      {(socialTrends || []).map((trend: any, i: number) => (
                        <motion.div
                          key={i}
                          onClick={() => trend.url && trend.url !== "#" && openLink(trend.url, trend.name || "Trend")}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="block p-2.5 rounded border border-purple-900/20 bg-purple-950/10 hover:bg-purple-900/20 hover:border-purple-700/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-purple-800/40 text-purple-400 font-mono">{trend.platform}</Badge>
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-700/40 text-zinc-500 font-mono">{trend.region}</Badge>
                            </div>
                            <span className={`text-[8px] font-mono ${sentimentColor(trend.sentiment)}`}>{(trend.sentiment || "").toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium">{trend.topic}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-500">{(trend.volume || 0).toLocaleString()} mentions</span>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Collapse Toggle */}
        {!mapFullscreen && (
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 z-30 bg-black/60 border border-cyan-900/30 rounded-r px-0.5 py-4 text-cyan-500 hover:text-cyan-300 transition-colors"
            style={{ left: leftCollapsed ? 0 : 320 }}
          >
            {leftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}

        {/* Center: Map */}
        <div className="flex-1 relative">
          <div className={`absolute inset-0 ${isFlir ? "hue-rotate-[40deg] saturate-150" : ""} ${isCrt ? "brightness-110 contrast-125" : ""}`}>
            <MapView onMapReady={handleMapReady} className="w-full h-full" />
          </div>

          {/* Top Stats */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 flex-wrap justify-center">
            {stats && (
              <>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
                  <Plane className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] font-mono text-cyan-300">{stats.flights}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-mono text-amber-300">{stats.quakes}</span>
                  {stats.criticalQuakes > 0 && <span className="text-[10px] font-mono text-red-400">({stats.criticalQuakes} M5+)</span>}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
                  <Target className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-mono text-red-300">{stats.geoEvents}</span>
                  {stats.criticalEvents > 0 && <span className="text-[10px] font-mono text-red-400 animate-pulse">({stats.criticalEvents} CRIT)</span>}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
                  <Camera className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-mono text-purple-300">{stats.trafficCams} CAM</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
                  <Video className="w-3 h-3 text-pink-400" />
                  <span className="text-[10px] font-mono text-pink-300">{stats.worldCams} LIVE</span>
                </div>
              </>
            )}
          </div>

          {/* Classification Banner */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-center">
            <div className="px-6 py-0.5 bg-red-900/80 backdrop-blur text-[9px] font-mono tracking-[0.3em] text-red-200 rounded-b">
              TOP SECRET // SI // NOFORN // SYSTEM_ZERO
            </div>
          </div>

          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <Crosshair className="w-8 h-8 text-cyan-500/20" />
          </div>

          {/* Bottom Status */}
          <div className="absolute bottom-3 left-3 z-20">
            <div className="px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
              <span className="text-[9px] font-mono text-cyan-500">
                {stats?.dataPoints || 0} DATA POINTS • {stats?.regions?.length || 0} REGIONS • REFRESH 60s
              </span>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 z-20">
            <div className="px-2 py-1 rounded bg-black/70 backdrop-blur border border-cyan-900/30">
              <span className="text-[9px] font-mono text-emerald-400">
                {new Date().toISOString().replace("T", " ").substring(0, 19)} UTC
              </span>
            </div>
          </div>
        </div>

        {/* Right Collapse Toggle */}
        {!mapFullscreen && (
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 z-30 bg-black/60 border border-cyan-900/30 rounded-l px-0.5 py-4 text-cyan-500 hover:text-cyan-300 transition-colors"
            style={{ right: rightCollapsed ? 0 : 320 }}
          >
            {rightCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {/* Right Panel */}
        <AnimatePresence>
          {!mapFullscreen && !rightCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-cyan-900/20 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden shrink-0"
            >
              {/* Right Panel Tabs */}
              <div className="flex border-b border-cyan-900/20 shrink-0 overflow-x-auto">
                {([
                  { id: "seismic" as const, label: "SEISMIC", icon: Activity },
                  { id: "cameras" as const, label: "CAMS", icon: Camera },
                  { id: "worldcams" as const, label: "WORLD", icon: Video },
                  { id: "exif" as const, label: "EXIF", icon: Image },
                  { id: "streetview" as const, label: "SV", icon: Navigation },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightPanel(tab.id)}
                    className={`flex-1 py-2 text-[9px] font-mono tracking-wider flex items-center justify-center gap-1 transition-colors whitespace-nowrap
                      ${rightPanel === tab.id ? "text-cyan-300 bg-cyan-900/20 border-b-2 border-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1 overflow-hidden">
                <div className="p-3 space-y-3">
                  {/* Seismic Monitor */}
                  {rightPanel === "seismic" && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono text-amber-500 tracking-widest flex items-center gap-1">
                          <Activity className="w-3 h-3" /> SEISMIC MONITOR
                        </div>
                        <ShareButton
                          data={(osintData?.earthquakes || []).slice(0, 8).map((eq: any) => `M${eq.magnitude} — ${eq.place} (${eq.depth}km)`).join("\n")}
                          label="Seismic Data"
                        />
                      </div>
                      {(osintData?.earthquakes || []).slice(0, 10).map((eq: any, i: number) => (
                        <motion.div
                          key={eq.id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-2 py-1.5 border-b border-zinc-800/30 cursor-pointer hover:bg-cyan-900/10 px-1 rounded transition-colors"
                          onClick={() => {
                            if (mapRef.current) {
                              mapRef.current.panTo({ lat: eq.latitude, lng: eq.longitude });
                              mapRef.current.setZoom(6);
                            }
                          }}
                        >
                          <span className={`text-xs font-mono font-bold w-10 text-center ${eq.magnitude >= 5 ? "text-red-400" : eq.magnitude >= 4 ? "text-amber-400" : "text-emerald-400"}`}>
                            M{eq.magnitude.toFixed(1)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-zinc-400 truncate">{eq.place}</p>
                            <p className="text-[9px] text-zinc-600">{eq.depth}km deep{eq.tsunami ? " • TSUNAMI" : ""}</p>
                          </div>
                          <ShareButton data={`M${eq.magnitude} — ${eq.place}\nCoords: ${eq.latitude},${eq.longitude}\nDepth: ${eq.depth}km`} label="Earthquake" />
                        </motion.div>
                      ))}

                      {/* Weather Alerts */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-[10px] font-mono text-blue-500 tracking-widest flex items-center gap-1">
                          <CloudLightning className="w-3 h-3" /> WEATHER ALERTS
                        </div>
                      </div>
                      {(osintData?.weatherAlerts || []).slice(0, 5).map((w: any, i: number) => (
                        <div key={i} className="py-1.5 border-b border-zinc-800/30">
                          <div className="flex items-center justify-between mb-0.5">
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 font-mono ${w.severity === "Extreme" || w.severity === "Severe" ? "border-red-500/40 text-red-400" : "border-yellow-500/40 text-yellow-400"}`}>
                              {w.severity}
                            </Badge>
                            <ShareButton data={`${w.event}: ${w.headline}\nAreas: ${w.areas}`} label="Weather Alert" />
                          </div>
                          <p className="text-[10px] text-zinc-400">{w.event}</p>
                          <p className="text-[9px] text-zinc-600 line-clamp-1">{w.areas}</p>
                        </div>
                      ))}

                      {/* Cyber Threats */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-[10px] font-mono text-red-500 tracking-widest flex items-center gap-1">
                          <Shield className="w-3 h-3" /> CYBER THREATS
                        </div>
                      </div>
                      {(osintData?.cves || []).slice(0, 5).map((cve: any, i: number) => (
                        <div key={i} className="py-1.5 border-b border-zinc-800/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold ${severityColor(cve.severity)}`}>{cve.id}</span>
                              {cve.score && <span className="text-[9px] font-mono text-zinc-500">CVSS:{cve.score}</span>}
                            </div>
                            <ShareButton data={`${cve.id} (${cve.severity}, CVSS:${cve.score})\n${cve.description}`} label="CVE" />
                          </div>
                          <p className="text-[9px] text-zinc-500 line-clamp-2 mt-0.5">{cve.description}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Traffic Cameras */}
                  {rightPanel === "cameras" && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono text-purple-500 tracking-widest flex items-center gap-1">
                          <Camera className="w-3 h-3" /> TRAFFIC CAMERAS — {trafficCams?.length || 0}
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-600 mb-2">Interstate DOT camera feeds across US. Click to pan map.</p>
                      {(trafficCams || []).map((cam, i) => (
                        <motion.div
                          key={cam.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-2 rounded border border-purple-900/20 bg-purple-950/10 hover:bg-purple-900/20 cursor-pointer transition-all"
                          onClick={() => {
                            if (mapRef.current) {
                              mapRef.current.panTo({ lat: cam.latitude, lng: cam.longitude });
                              mapRef.current.setZoom(12);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Camera className="w-3 h-3 text-purple-400" />
                              <span className="text-[10px] font-mono text-purple-300">{cam.state}</span>
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-purple-800/40 text-purple-400 font-mono">{cam.route}</Badge>
                            </div>
                            <ShareButton data={`${cam.name}\n${cam.route} ${cam.direction}\nCoords: ${cam.latitude},${cam.longitude}`} label="Traffic Cam" />
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">{cam.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-mono text-zinc-600">{cam.direction}</span>
                            <span className="text-[8px] font-mono text-zinc-600">{cam.source}</span>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* World Cams — Enhanced with Embedded Video Player */}
                  {rightPanel === "worldcams" && (() => {
                    const categories = ["all", "city", "landmark", "beach", "nature", "space", "port", "airport", "wildlife", "traffic"];
                    const filteredCams = (worldCams || []).filter(cam =>
                      worldCamFilter === "all" || (cam as any).category === worldCamFilter
                    );
                    const activeCam = selectedWorldCam ? filteredCams.find(c => c.id === selectedWorldCam) : null;
                    return (
                      <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-mono text-pink-500 tracking-widest flex items-center gap-1">
                            <Video className="w-3 h-3" /> WORLD CAMS — {filteredCams.length} LIVE
                          </div>
                          {selectedWorldCam && (
                            <button
                              onClick={() => setSelectedWorldCam(null)}
                              className="text-[9px] font-mono text-zinc-500 hover:text-pink-400 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> CLOSE PLAYER
                            </button>
                          )}
                        </div>

                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => { setWorldCamFilter(cat); setSelectedWorldCam(null); }}
                              className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                worldCamFilter === cat
                                  ? "bg-pink-600/30 border-pink-500/50 text-pink-300"
                                  : "border-zinc-800 text-zinc-600 hover:border-pink-800/40 hover:text-pink-400"
                              }`}
                            >
                              {cat.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        {/* Embedded Video Player */}
                        <AnimatePresence mode="wait">
                          {activeCam && (activeCam as any).embedUrl && (
                            <motion.div
                              key={activeCam.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-2 rounded-lg overflow-hidden border border-pink-500/30 bg-black"
                            >
                              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                                <iframe
                                  src={(activeCam as any).embedUrl}
                                  className="absolute inset-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={activeCam.title}
                                />
                              </div>
                              <div className="p-2 bg-pink-950/30">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[10px] font-mono text-pink-300 font-bold">{activeCam.title}</p>
                                    <p className="text-[8px] font-mono text-zinc-500">
                                      {activeCam.city}, {activeCam.country} · {(activeCam as any).description || ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[8px] font-mono text-red-400">LIVE</span>
                                    <span className="text-[8px] font-mono text-zinc-600 ml-1">{activeCam.viewers.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Camera List */}
                        {filteredCams.map((cam, i) => (
                          <motion.div
                            key={cam.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className={`p-2 rounded border cursor-pointer transition-all ${
                              selectedWorldCam === cam.id
                                ? "border-pink-500/50 bg-pink-900/30 ring-1 ring-pink-500/20"
                                : "border-pink-900/20 bg-pink-950/10 hover:bg-pink-900/20"
                            }`}
                            onClick={() => {
                              setSelectedWorldCam(cam.id === selectedWorldCam ? null : cam.id);
                              if (mapRef.current) {
                                mapRef.current.panTo({ lat: cam.latitude, lng: cam.longitude });
                                mapRef.current.setZoom(10);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${cam.status === "live" ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
                                <span className="text-[10px] font-mono text-pink-300">{cam.country}</span>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-pink-800/40 text-pink-400 font-mono">{(cam as any).category || "general"}</Badge>
                                {(cam as any).continent && (
                                  <span className="text-[7px] font-mono text-zinc-700">{(cam as any).continent}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {(cam as any).embedUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorldCam(cam.id);
                                    }}
                                    className="p-1 rounded hover:bg-pink-900/30 transition-colors"
                                    title="Watch inline"
                                  >
                                    <Video className="w-3 h-3 text-pink-400" />
                                  </button>
                                )}
                                {cam.viewUrl && cam.viewUrl !== "#" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openLink(cam.viewUrl!, cam.title || "Live Cam"); }}
                                    className="p-1 rounded hover:bg-pink-900/30 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3 text-pink-400" />
                                  </button>
                                )}
                                <ShareButton data={`${cam.title}\n${cam.city}, ${cam.country}\n${cam.viewUrl}`} label="World Cam" />
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-300">{cam.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-mono text-zinc-600">{cam.city}</span>
                              <span className="text-[8px] font-mono text-zinc-600">{cam.viewers.toLocaleString()} viewers</span>
                              {(cam as any).description && (
                                <span className="text-[7px] font-mono text-zinc-700 truncate max-w-[120px]">{(cam as any).description}</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </>
                    );
                  })()}

                  {/* EXIF Extraction */}
                  {rightPanel === "exif" && (
                    <>
                      <div className="text-[10px] font-mono text-amber-500 tracking-widest flex items-center gap-1 mb-2">
                        <Image className="w-3 h-3" /> IMAGE INTELLIGENCE (I-XRAY)
                      </div>
                      <p className="text-[9px] text-zinc-600 mb-3">Extract GPS coordinates, camera info, and timestamps from image EXIF metadata. Paste an image URL to analyze.</p>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={exifUrl}
                          onChange={(e) => setExifUrl(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="w-full px-2 py-1.5 rounded bg-black/40 border border-cyan-900/30 text-xs text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-amber-500/50 focus:outline-none"
                        />
                        <Button
                          size="sm"
                          className="w-full h-7 text-[10px] font-mono bg-amber-900/30 border border-amber-500/30 text-amber-400 hover:bg-amber-900/50"
                          onClick={() => {
                            if (exifUrl) exifMutation.mutate({ imageUrl: exifUrl });
                          }}
                          disabled={!exifUrl || exifMutation.isPending}
                        >
                          {exifMutation.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Crosshair className="w-3 h-3 mr-1" />
                          )}
                          EXTRACT METADATA
                        </Button>
                      </div>

                      {exifMutation.data && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] font-mono ${exifMutation.data.confidence > 50 ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>
                              CONFIDENCE: {exifMutation.data.confidence}%
                            </Badge>
                            <ShareButton
                              data={JSON.stringify(exifMutation.data, null, 2)}
                              label="EXIF Data"
                            />
                          </div>

                          {exifMutation.data.hasGps && (
                            <div className="p-2 rounded border border-emerald-900/30 bg-emerald-950/10">
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] font-mono text-emerald-400">GPS LOCATION FOUND</span>
                              </div>
                              <p className="text-[10px] font-mono text-zinc-300">
                                {exifMutation.data.gps.latitude?.toFixed(6)}, {exifMutation.data.gps.longitude?.toFixed(6)}
                              </p>
                              {exifMutation.data.gps.altitude != null && (
                                <p className="text-[9px] font-mono text-zinc-500">Alt: {exifMutation.data.gps.altitude.toFixed(1)}m</p>
                              )}
                            </div>
                          )}

                          {(exifMutation.data.camera.make || exifMutation.data.camera.model) && (
                            <div className="p-2 rounded border border-cyan-900/30 bg-cyan-950/10">
                              <div className="text-[10px] font-mono text-cyan-400 mb-1">CAMERA</div>
                              <p className="text-[10px] text-zinc-300">{[exifMutation.data.camera.make, exifMutation.data.camera.model].filter(Boolean).join(" ")}</p>
                              {exifMutation.data.camera.lens && <p className="text-[9px] text-zinc-500">Lens: {exifMutation.data.camera.lens}</p>}
                              <div className="flex gap-3 mt-1 text-[9px] font-mono text-zinc-500">
                                {exifMutation.data.camera.aperture && <span>f/{exifMutation.data.camera.aperture}</span>}
                                {exifMutation.data.camera.shutterSpeed && <span>{exifMutation.data.camera.shutterSpeed}</span>}
                                {exifMutation.data.camera.iso && <span>ISO {exifMutation.data.camera.iso}</span>}
                                {exifMutation.data.camera.focalLength && <span>{exifMutation.data.camera.focalLength}mm</span>}
                              </div>
                            </div>
                          )}

                          {exifMutation.data.datetime.original && (
                            <div className="p-2 rounded border border-purple-900/30 bg-purple-950/10">
                              <div className="text-[10px] font-mono text-purple-400 mb-1">TIMESTAMP</div>
                              <p className="text-[10px] text-zinc-300">{exifMutation.data.datetime.original}</p>
                              {exifMutation.data.datetime.timezone && <p className="text-[9px] text-zinc-500">TZ: {exifMutation.data.datetime.timezone}</p>}
                            </div>
                          )}

                          {(exifMutation.data.image.width || exifMutation.data.image.height) && (
                            <div className="p-2 rounded border border-zinc-800/30 bg-zinc-950/10">
                              <div className="text-[10px] font-mono text-zinc-400 mb-1">IMAGE</div>
                              <p className="text-[10px] text-zinc-300">{exifMutation.data.image.width}x{exifMutation.data.image.height}</p>
                              {exifMutation.data.image.software && <p className="text-[9px] text-zinc-500">Software: {exifMutation.data.image.software}</p>}
                            </div>
                          )}

                          {!exifMutation.data.hasGps && exifMutation.data.confidence < 20 && (
                            <div className="p-2 rounded border border-red-900/30 bg-red-950/10">
                              <p className="text-[10px] text-red-400 font-mono">NO EXIF DATA FOUND</p>
                              <p className="text-[9px] text-zinc-500 mt-1">Image may have been stripped of metadata (common on social media uploads).</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Street View Info */}
                  {rightPanel === "streetview" && (
                    <>
                      <div className="text-[10px] font-mono text-amber-500 tracking-widest flex items-center gap-1 mb-2">
                        <Navigation className="w-3 h-3" /> STREET VIEW INTELLIGENCE
                      </div>
                      <p className="text-[9px] text-zinc-600 mb-3">
                        Activate Street View mode, then click any location on the map to drop into street-level imagery.
                      </p>

                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className={`w-full h-7 text-[10px] font-mono ${streetViewActive ? "bg-amber-900/40 border-amber-500/40 text-amber-400" : "bg-black/40 border-cyan-900/30 text-cyan-400"} border hover:bg-amber-900/50`}
                          onClick={() => {
                            setStreetViewActive(!streetViewActive);
                            if (streetViewActive) setStreetViewLocation(null);
                          }}
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          {streetViewActive ? "DEACTIVATE STREET VIEW" : "ACTIVATE STREET VIEW"}
                        </Button>
                      </div>

                      {streetViewLocation && (
                        <div className="mt-3 p-2 rounded border border-amber-900/30 bg-amber-950/10">
                          <div className="text-[10px] font-mono text-amber-400 mb-1">CURRENT POSITION</div>
                          <p className="text-[10px] font-mono text-zinc-300">
                            {streetViewLocation.lat.toFixed(6)}, {streetViewLocation.lng.toFixed(6)}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        <div className="text-[10px] font-mono text-zinc-500 tracking-widest">QUICK LOCATIONS</div>
                        {[
                          { name: "Times Square, NYC", lat: 40.758, lng: -73.9855 },
                          { name: "Shibuya, Tokyo", lat: 35.6595, lng: 139.7004 },
                          { name: "Champs-Elysees, Paris", lat: 48.8698, lng: 2.3078 },
                          { name: "The Bund, Shanghai", lat: 31.2400, lng: 121.4900 },
                          { name: "Red Square, Moscow", lat: 55.7539, lng: 37.6208 },
                          { name: "Copacabana, Rio", lat: -22.9711, lng: -43.1822 },
                        ].map((loc, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setStreetViewActive(true);
                              setStreetViewLocation({ lat: loc.lat, lng: loc.lng });
                              if (mapRef.current) {
                                mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
                                mapRef.current.setZoom(15);
                              }
                            }}
                            className="w-full text-left p-2 rounded border border-zinc-800/30 hover:border-amber-900/30 hover:bg-amber-950/10 transition-all"
                          >
                            <p className="text-[10px] text-zinc-300">{loc.name}</p>
                            <p className="text-[8px] font-mono text-zinc-600">{loc.lat}, {loc.lng}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center"
          >
            <div className="text-center">
              <Radar className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" style={{ animationDuration: "2s" }} />
              <p className="text-sm font-mono text-cyan-400 tracking-widest animate-pulse">ACQUIRING SATELLITE FEED...</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-2">CONNECTING TO 9 OSINT SOURCES</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerateReportButton() {
  const { openLink } = useAppLink();
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<string[]>(["worldview", "osint_feeds", "threats"]);
  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      setIsOpen(false);
      toast.success("Intelligence briefing generated");
      // Open the markdown download URL
      if (data.downloadUrl) {
        openLink(data.downloadUrl, "Download");
      }
    },
    onError: () => toast.error("Failed to generate report"),
  });

  const allSections = [
    { id: "worldview", label: "WORLDVIEW Geospatial", icon: Globe },
    { id: "osint_feeds", label: "OSINT Feed Summary", icon: Radio },
    { id: "threats", label: "Threat Intelligence", icon: Shield },
    { id: "entities", label: "Entity Intelligence", icon: Eye },
    { id: "cases", label: "Case Files", icon: Target },
    { id: "social_trends", label: "Social Trends", icon: TrendingUp },
  ];

  const toggleSection = (id: string) => {
    setSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setIsOpen(!isOpen)}
        title="Generate Intelligence Report"
      >
        <FileText className="w-3.5 h-3.5 text-emerald-400" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-16 right-4 z-[60] w-80 bg-black/95 border border-cyan-900/40 backdrop-blur-xl rounded-lg shadow-2xl"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">GENERATE BRIEFING</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] font-mono text-zinc-500 mb-3">
                Select intelligence sections to include in the briefing document.
              </p>

              <div className="space-y-1.5 mb-4">
                {allSections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => toggleSection(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-mono transition-all ${
                      sections.includes(id)
                        ? "bg-cyan-900/30 text-cyan-300 border border-cyan-900/40"
                        : "bg-zinc-900/50 text-zinc-500 border border-zinc-800/40 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {sections.includes(id) && <span className="text-emerald-400 text-[10px]">✓</span>}
                  </button>
                ))}
              </div>

              <Button
                className="w-full bg-emerald-900/40 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/60 font-mono text-xs"
                disabled={sections.length === 0 || generateMutation.isPending}
                onClick={() => generateMutation.mutate({ title: "Intelligence Briefing", sections: sections as any })}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> COMPILING...</>
                ) : (
                  <><FileText className="w-3.5 h-3.5 mr-2" /> GENERATE ({sections.length} sections)</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
