import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useProfile } from "./lib/storage";
import { Dashboard } from "./pages/Dashboard";
import { Diet } from "./pages/Diet";
import { History } from "./pages/History";
import { Landing } from "./pages/Landing";
import { ExerciseDetail, Library } from "./pages/Library";
import { Onboarding } from "./pages/Onboarding";
import { ProfilePage } from "./pages/Profile";
import { ProgressPage } from "./pages/Progress";
import { TrainerPage } from "./pages/Trainer";
import { Workouts } from "./pages/Workouts";
import type { ReactNode } from "react";

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useProfile();
  if (!profile) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/app"
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="library" element={<Library />} />
          <Route path="library/:id" element={<ExerciseDetail />} />
          <Route path="diet" element={<Diet />} />
          <Route path="history" element={<History />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route
          path="/train/:exerciseId"
          element={
            <RequireProfile>
              <TrainerPage />
            </RequireProfile>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
