import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/ui/components/AppShell";
import { TimerPage } from "@/ui/screens/TimerPage";
import { ProgressPage } from "@/ui/screens/ProgressPage";
import { EventsPage } from "@/ui/screens/EventsPage";
import { SettingsPage } from "@/ui/screens/SettingsPage";
import { NotifyPage } from "@/ui/screens/NotifyPage";
import { ImportPage } from "@/ui/screens/ImportPage";
import { JobSheetPage } from "@/ui/screens/JobSheetPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <TimerPage /> },
      { path: "progress", element: <ProgressPage /> },
      { path: "events", element: <EventsPage /> },
      {
        path: "settings",
        children: [
          { index: true, element: <SettingsPage /> },
          { path: "notifications", element: <NotifyPage /> },
        ],
      },
    ],
  },
  { path: "/import", element: <ImportPage /> },
  { path: "/job/:id", element: <JobSheetPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
