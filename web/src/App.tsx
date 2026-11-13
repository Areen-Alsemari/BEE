import { Suspense, lazy } from "react";
import { Navigate, Outlet, createHashRouter, RouterProvider } from "react-router-dom";
import { Nav } from "./components/Nav";
import { HowToRead } from "./components/HowToRead";
import { Loading } from "./components/States";

const MissionControl = lazy(() => import("./pages/mission-control/MissionControl"));
const BeeLab = lazy(() => import("./pages/bee-lab/BeeLab"));
const AblationLab = lazy(() => import("./pages/ablation/AblationLab"));
const ResultsArena = lazy(() => import("./pages/results/ResultsArena"));
const Protocol = lazy(() => import("./pages/protocol/Protocol"));
const Landing = lazy(() => import("./pages/landing/Landing"));

function Shell() {
  return (
    <div className="flex h-full flex-col">
      <Nav />
      <main className="min-h-0 flex-1">
        <Suspense fallback={<Loading what="page" />}>
          <Outlet />
        </Suspense>
      </main>
      <HowToRead />
    </div>
  );
}

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/mission-control", element: <MissionControl /> },
      { path: "/bee-lab", element: <BeeLab /> },
      { path: "/ablation", element: <AblationLab /> },
      { path: "/results", element: <ResultsArena /> },
      { path: "/protocol", element: <Protocol /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
