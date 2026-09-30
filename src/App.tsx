import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { useNotifyScheduler } from "@/ui/hooks/useNotifyScheduler";
import "@/ui/tokens.css";

function SchedulerBridge() {
  useNotifyScheduler();
  return null;
}

export function App() {
  return (
    <>
      <SchedulerBridge />
      <RouterProvider router={router} />
    </>
  );
}
