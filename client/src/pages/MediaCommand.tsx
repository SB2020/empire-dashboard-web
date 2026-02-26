import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Music, Image, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

export default function MediaCommand() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"image" | "audio">("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [audioPrompt, setAudioPrompt] = useState("");

  const mediaAssets = trpc.media.list.useQuery({ assetType: tab === "image" ? "image" : "audio" }, { enabled: !!user });
  const generateImage = trpc.media.generateImage.useMutation({ onSuccess: () => { mediaAssets.refetch(); setImagePrompt(""); } });
  const generateAudio = trpc.media.generateAudioPrompt.useMutation({ onSuccess: () => { setAudioPrompt(""); } });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-magenta">
            <Wand2 className="h-5 w-5 text-neon-magenta" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wider text-neon-magenta uppercase">Media Command</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">DIRECTOR VIRGIL // AESTHETIC DOMINANCE PROTOCOL</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-3">
        {[
          { key: "image" as const, icon: Image, label: "Visual Dominance" },
          { key: "audio" as const, icon: Music, label: "Sonic Warfare" },
        ].map((t) => (
          <motion.button
            key={t.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all duration-400 ${
              tab === t.key ? "glass-elevated glow-magenta text-neon-magenta" : "glass-panel text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {tab === "image" && (
        <motion.div variants={fadeUp} className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); if (!imagePrompt.trim() || generateImage.isPending) return; generateImage.mutate({ prompt: imagePrompt.trim() }); }} className="glass-elevated edge-light p-5 glow-magenta">
            <h3 className="font-heading text-sm font-bold text-neon-magenta uppercase mb-4 tracking-wider">Imagen Generation Protocol</h3>
            <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe the visual asset to generate..." rows={3} className="w-full glass-panel border-neon-magenta/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-magenta/30 resize-none mb-4 transition-all duration-300" style={{ boxShadow: 'none' }} />
            <Button type="submit" disabled={!imagePrompt.trim() || generateImage.isPending} className="glass-elevated text-neon-magenta hover:bg-neon-magenta/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
              {generateImage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Asset
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaAssets.data?.map((asset: any, i: number) => (
              <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.02, y: -2 }} className="glass-panel overflow-hidden">
                {asset.url ? (
                  <img src={asset.url} alt={asset.prompt} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center glass-elevated">
                    {asset.status === "generating" ? <Loader2 className="h-8 w-8 animate-spin text-neon-magenta" /> : <Image className="h-8 w-8 text-muted-foreground/20" />}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[10px] font-mono text-muted-foreground/70 line-clamp-2">{asset.prompt}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${asset.status === "completed" ? "bg-neon-green" : asset.status === "failed" ? "bg-neon-red" : "bg-neon-amber status-pulse"}`} />
                    <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider">{asset.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {(!mediaAssets.data || mediaAssets.data.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center mb-4 glow-magenta">
                <Image className="h-8 w-8 opacity-30" />
              </div>
              <p className="text-sm font-mono chrome-text tracking-wider">NO VISUAL ASSETS GENERATED</p>
              <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 tracking-wide">Describe an image to deploy the Imagen protocol</p>
            </div>
          )}
        </motion.div>
      )}

      {tab === "audio" && (
        <motion.div variants={fadeUp} className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); if (!audioPrompt.trim() || generateAudio.isPending) return; generateAudio.mutate({ description: audioPrompt.trim() }); }} className="glass-elevated edge-light p-5 glow-magenta">
            <h3 className="font-heading text-sm font-bold text-neon-magenta uppercase mb-4 tracking-wider">Suno AI Sonic Warfare Protocol</h3>
            <textarea value={audioPrompt} onChange={(e) => setAudioPrompt(e.target.value)} placeholder="Describe the audio track to generate (genre, mood, purpose)..." rows={3} className="w-full glass-panel border-neon-magenta/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-magenta/30 resize-none mb-4 transition-all duration-300" style={{ boxShadow: 'none' }} />
            <Button type="submit" disabled={!audioPrompt.trim() || generateAudio.isPending} className="glass-elevated text-neon-magenta hover:bg-neon-magenta/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
              {generateAudio.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Music className="h-4 w-4 mr-2" />}
              Generate Suno Prompt
            </Button>
          </form>

          {generateAudio.data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-elevated edge-light p-5 glow-magenta">
              <h3 className="font-heading text-sm font-bold text-neon-magenta uppercase mb-3 tracking-wider">Generated Suno Prompt</h3>
              <div className="prose prose-invert prose-sm max-w-none text-sm"><Streamdown>{generateAudio.data.prompt}</Streamdown></div>
            </motion.div>
          )}

          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center mb-4 glow-magenta">
              <Music className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-sm font-mono chrome-text tracking-wider">SONIC WARFARE DIVISION</p>
            <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 max-w-md text-center tracking-wide">Describe your audio vision and Virgil will generate a detailed Suno AI prompt</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
