import { Suspense, lazy } from "react";
import { Navigate, Outlet, createHashRouter, RouterProvider, Link } from "react-router-dom";
import { Nav } from "./components/Nav";
import { HowToRead } from "./components/HowToRead";
import { Loading } from "./components/States";
import { Logo } from "./components/Logo";
import { PROJECT_TITLE } from "./config/team";

const MissionControl = lazy(() => import("./pages/mission-control/MissionControl"));
const BeeLab = lazy(() => import("./pages/bee-lab/BeeLab"));
const AblationLab = lazy(() => import("./pages/ablation/AblationLab"));
const ResultsArena = lazy(() => import("./pages/results/ResultsArena"));

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

function NotBuilt({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl p-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">This page has not been built yet.</p>
      <Link className="btn mt-4" to="/mission-control">
        Open Mission Control
      </Link>
    </div>
  );
}

function LandingPlaceholder() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center p-12 text-center">
      <Logo size="lg" />
      <h1 className="mt-6 text-2xl font-semibold leading-snug">{PROJECT_TITLE}</h1>
      <div className="mt-6 flex gap-3">
        <Link className="btn" to="/tour">
          Start the tour
        </Link>
        <Link className="btn btn-on" to="/mission-control">
          Open the lab
        </Link>
      </div>
    </div>
  );
}

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <LandingPlaceholder /> },
      { path: "/mission-control", element: <MissionControl /> },
      { path: "/bee-lab", element: <BeeLab /> },
      { path: "/ablation", element: <AblationLab /> },
      { path: "/results", element: <ResultsArena /> },
      { path: "/tour", element: <NotBuilt title="Guided Tour" /> },
      { path: "/protocol", element: <NotBuilt title="Protocol and Reproducibility" /> },
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
