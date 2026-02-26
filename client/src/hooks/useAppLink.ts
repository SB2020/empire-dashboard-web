import { useCallback } from "react";
import { useInAppViewer } from "@/components/InAppViewer";

/**
 * Hook that provides a handler to open URLs inside the in-app viewer.
 * Usage:
 *   const { openLink, AppLink } = useAppLink();
 *   <button onClick={() => openLink("https://...", "Title")}>View</button>
 */
export function useAppLink() {
  const { openInApp } = useInAppViewer();

  const openLink = useCallback(
    (url: string, title?: string) => {
      openInApp(url, title);
    },
    [openInApp]
  );

  return { openLink };
}
