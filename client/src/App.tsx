import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentPanel from "./pages/AgentPanel";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import MediaCommand from "./pages/MediaCommand";
import IntelligenceHub from "./pages/IntelligenceHub";
import ResearchLab from "./pages/ResearchLab";
import SecurityPerimeter from "./pages/SecurityPerimeter";
import VibeCoder from "./pages/VibeCoder";
import CommandLog from "./pages/CommandLog";
import WorldView from "./pages/WorldView";
import HierarchyView from "./pages/HierarchyView";
import DashboardLayout from "./components/DashboardLayout";
import HumintProfiler from "./pages/HumintProfiler";
import AgentComms from "./pages/AgentComms";
import AppEcosystem from "./pages/AppEcosystem";
import SigintNetwork from "./pages/SigintNetwork";
import LiveFeed from "./pages/LiveFeed";
import OneSearch from "./pages/OneSearch";
import EntityGraph from "./pages/EntityGraph";
import CaseWorkspace from "./pages/CaseWorkspace";
import SourceConnectors from "./pages/SourceConnectors";
import MetricsDashboard from "./pages/MetricsDashboard";
import TimelineView from "./pages/TimelineView";
import NLQuery from "./pages/NLQuery";
import AIContent from "./pages/AIContent";
import GamesArcade from "./pages/GamesArcade";
import SocialPlatform from "./pages/SocialPlatform";
import GitHubOSINT from "./pages/GitHubOSINT";
import OsintTools from "./pages/OsintTools";
import SurvivorLibrary from "./pages/SurvivorLibrary";
import EvidenceFeed from "./pages/EvidenceFeed";
import PlaybookRunner from "./pages/PlaybookRunner";
import AgentInteraction from "./pages/AgentInteraction";
import ConnectorStatus from "./pages/ConnectorStatus";
import ManualPage from "./pages/ManualPage";
import AppMapPage from "./pages/AppMapPage";
import SecurityModelPage from "./pages/SecurityModelPage";
import MacrosPage from "./pages/MacrosPage";
import AuditChainPage from "./pages/AuditChainPage";
import PdfLibrary from "./pages/PdfLibrary";
import YoloCameraPage from "./pages/YoloCameraPage";
import SystemPromptsPage from "./pages/SystemPromptsPage";
import { InAppViewerProvider } from "./components/InAppViewer";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/agent/:agentId"} component={AgentPanel} />
        <Route path={"/knowledge"} component={KnowledgeGraph} />
        <Route path={"/media"} component={MediaCommand} />
        <Route path={"/intelligence"} component={IntelligenceHub} />
        <Route path={"/research"} component={ResearchLab} />
        <Route path={"/security"} component={SecurityPerimeter} />
        <Route path={"/vibe-coder"} component={VibeCoder} />
        <Route path={"/command-log"} component={CommandLog} />
        <Route path={"/worldview"} component={WorldView} />
        <Route path={"/hierarchy"} component={HierarchyView} />
        <Route path={"/humint"} component={HumintProfiler} />
        <Route path={"/comms"} component={AgentComms} />
        <Route path={"/ecosystem"} component={AppEcosystem} />
        <Route path={"/sigint"} component={SigintNetwork} />
        <Route path={"/feed"} component={LiveFeed} />
        <Route path={"/search"} component={OneSearch} />
        <Route path={"/entities"} component={EntityGraph} />
        <Route path={"/cases"} component={CaseWorkspace} />
        <Route path={"/connectors"} component={SourceConnectors} />
        <Route path={"/metrics"} component={MetricsDashboard} />
        <Route path={"/timeline"} component={TimelineView} />
        <Route path={"/nlquery"} component={NLQuery} />
        <Route path={"/stories"} component={AIContent} />
        <Route path={"/games"} component={GamesArcade} />
        <Route path={"/social"} component={SocialPlatform} />
        <Route path={"/github"} component={GitHubOSINT} />
        <Route path={"/osint-tools"} component={OsintTools} />
        <Route path={"/survivor-library"} component={SurvivorLibrary} />
        <Route path={"/evidence"} component={EvidenceFeed} />
        <Route path={"/playbooks"} component={PlaybookRunner} />
        <Route path={"/agent-chat"} component={AgentInteraction} />
        <Route path={"/connector-status"} component={ConnectorStatus} />
        <Route path={"/manual"} component={ManualPage} />
        <Route path={"/app-map"} component={AppMapPage} />
        <Route path={"/security-model"} component={SecurityModelPage} />
        <Route path={"/macros"} component={MacrosPage} />
        <Route path={"/audit-chain"} component={AuditChainPage} />
        <Route path={"/pdf-library"} component={PdfLibrary} />
        <Route path={"/yolo-camera"} component={YoloCameraPage} />
        <Route path={"/system-prompts"} component={SystemPromptsPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            toastOptions={{
              style: {
                background: 'oklch(0.12 0.025 215 / 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid oklch(0.40 0.06 200 / 0.2)',
                color: 'oklch(0.88 0.01 220)',
                boxShadow: '0 8px 32px oklch(0.05 0.02 220 / 0.4)',
              },
            }}
          />
          <InAppViewerProvider>
            <Router />
          </InAppViewerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
