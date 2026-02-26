import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Network, Plus, Loader2, FileText, Lightbulb, BookOpen, Users, Sparkles, Trash2, X } from "lucide-react";
import { useState, useMemo } from "react";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

const nodeTypeConfig: Record<string, { icon: any; color: string; label: string; glow: string }> = {
  note: { icon: FileText, color: "text-neon-cyan", label: "Note", glow: "glow-teal" },
  paper: { icon: BookOpen, color: "text-neon-blue", label: "Paper", glow: "glow-blue" },
  concept: { icon: Lightbulb, color: "text-neon-amber", label: "Concept", glow: "glow-amber" },
  entity: { icon: Users, color: "text-neon-green", label: "Entity", glow: "glow-green" },
  insight: { icon: Sparkles, color: "text-neon-magenta", label: "Insight", glow: "glow-magenta" },
};

export default function KnowledgeGraph() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedForSynthesis, setSelectedForSynthesis] = useState<number[]>([]);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nodeType, setNodeType] = useState<string>("note");
  const [tags, setTags] = useState("");

  const nodes = trpc.knowledge.list.useQuery(undefined, { enabled: !!user });
  const createNode = trpc.knowledge.create.useMutation({ onSuccess: () => { nodes.refetch(); setShowCreate(false); setTitle(""); setContent(""); setTags(""); } });
  const deleteNode = trpc.knowledge.delete.useMutation({ onSuccess: () => { nodes.refetch(); setSelectedNode(null); } });
  const synthesize = trpc.knowledge.synthesize.useMutation({ onSuccess: (data) => { setSynthesisResult(data.synthesis); } });

  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !nodes.data) return null;
    return nodes.data.find((n: any) => n.id === selectedNode);
  }, [selectedNode, nodes.data]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createNode.mutate({ title: title.trim(), content: content.trim(), nodeType: nodeType as any, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
  };

  const toggleSynthesisNode = (id: number) => {
    setSelectedForSynthesis((prev) => prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-teal">
              <Network className="h-5 w-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-wider chrome-text-teal uppercase">Knowledge Graph</h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">OBSIDIAN MEMORY PROTOCOL // ZETTELKASTEN NETWORK</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedForSynthesis.length >= 2 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Button onClick={() => synthesize.mutate({ nodeIds: selectedForSynthesis })} disabled={synthesize.isPending} className="glass-elevated text-neon-magenta hover:bg-neon-magenta/10 font-mono text-xs uppercase tracking-wider rounded-xl">
                {synthesize.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Synthesize ({selectedForSynthesis.length})
              </Button>
            </motion.div>
          )}
          <Button onClick={() => setShowCreate(true)} className="glass-elevated text-neon-cyan hover:bg-teal-glow/10 font-mono text-xs uppercase tracking-wider rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            New Node
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {synthesisResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-elevated edge-light p-5 glow-magenta">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neon-magenta" />
                <h3 className="font-heading text-sm font-bold text-neon-magenta uppercase tracking-wider">Oppenheimer Synthesis</h3>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setSynthesisResult(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></motion.button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-sm"><Streamdown>{synthesisResult}</Streamdown></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleCreate} className="glass-elevated edge-light p-5 space-y-4 glow-teal">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-neon-cyan uppercase tracking-wider">New Knowledge Node</h3>
              <motion.button whileHover={{ scale: 1.1 }} type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></motion.button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Node title..." className="w-full glass-panel border-teal-glow/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/30 transition-all duration-300" style={{ boxShadow: 'none' }} />
            <div className="flex gap-2 flex-wrap">
              {Object.entries(nodeTypeConfig).map(([key, config]) => {
                const TypeIcon = config.icon;
                return (
                  <motion.button key={key} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setNodeType(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all duration-300 ${nodeType === key ? `${config.color} glass-elevated` : "text-muted-foreground glass-panel"}`} style={{ boxShadow: 'none' }}>
                    <TypeIcon className="h-3 w-3" />
                    {config.label}
                  </motion.button>
                );
              })}
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Markdown content..." rows={6} className="w-full glass-panel border-teal-glow/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/30 resize-none transition-all duration-300" style={{ boxShadow: 'none' }} />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated)..." className="w-full glass-panel border-teal-glow/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/30 transition-all duration-300" style={{ boxShadow: 'none' }} />
            <Button type="submit" disabled={createNode.isPending || !title.trim() || !content.trim()} className="glass-elevated text-neon-cyan hover:bg-teal-glow/10 font-mono text-xs uppercase tracking-wider rounded-xl">
              {createNode.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Node
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${selectedNodeData ? "lg:col-span-2" : "lg:col-span-3"} space-y-2`}>
          {nodes.data && nodes.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nodes.data.map((node: any, i: number) => {
                const config = nodeTypeConfig[node.nodeType] || nodeTypeConfig.note;
                const NodeIcon = config.icon;
                const isSelected = selectedForSynthesis.includes(node.id);
                return (
                  <motion.div key={node.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.02, y: -2 }} onClick={() => setSelectedNode(node.id)} className={`glass-panel p-4 cursor-pointer transition-all duration-400 ${selectedNode === node.id ? "edge-light " + config.glow : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <NodeIcon className={`h-4 w-4 ${config.color}`} />
                        <h4 className="text-sm font-mono font-medium text-foreground/90 truncate">{node.title}</h4>
                      </div>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); toggleSynthesisNode(node.id); }} className={`p-1.5 rounded-lg text-[9px] font-mono transition-all duration-300 ${isSelected ? "text-neon-magenta glass-elevated" : "text-muted-foreground/40 hover:text-neon-magenta"}`}>
                        <Sparkles className="h-3 w-3" />
                      </motion.button>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground/60 line-clamp-2 mt-1">{node.content.substring(0, 120)}</p>
                    <div className="flex gap-1.5 mt-2">
                      {(node.tags as string[] || []).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[8px] font-mono px-1.5 py-0.5 rounded-md glass-panel text-muted-foreground/50" style={{ boxShadow: 'none' }}>#{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center mb-4 glow-teal">
                <Network className="h-8 w-8 opacity-30" />
              </div>
              <p className="text-sm font-mono chrome-text tracking-wider">KNOWLEDGE GRAPH EMPTY</p>
              <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 tracking-wide">Create nodes to build your Zettelkasten network</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedNodeData && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass-elevated edge-light p-5 h-fit sticky top-4 glow-teal">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-bold text-neon-cyan uppercase tracking-wider">Node Detail</h3>
                <div className="flex gap-1">
                  <motion.button whileHover={{ scale: 1.1 }} onClick={() => deleteNode.mutate({ id: selectedNodeData.id })} className="p-1.5 rounded-lg hover:bg-neon-red/10 text-muted-foreground hover:text-neon-red transition-all duration-300"><Trash2 className="h-3.5 w-3.5" /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} onClick={() => setSelectedNode(null)} className="p-1.5 rounded-lg hover:bg-teal-glow/10 text-muted-foreground"><X className="h-3.5 w-3.5" /></motion.button>
                </div>
              </div>
              <h4 className="text-sm font-mono font-medium text-foreground/90 mb-3">{selectedNodeData.title}</h4>
              <div className="prose prose-invert prose-sm max-w-none text-xs"><Streamdown>{selectedNodeData.content}</Streamdown></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
