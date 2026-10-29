import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { Cases } from '@/pages/Cases';
import { Play } from '@/pages/Play';
import { Badges } from '@/pages/Badges';
import { Sandbox } from '@/pages/Sandbox';
import { FieldGuide } from '@/pages/FieldGuide';
import { ProgressPage } from '@/pages/ProgressPage';
import { SignIn } from '@/pages/SignIn';
import { Leaderboard } from '@/pages/Leaderboard';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="cases" element={<Cases />} />
        <Route path="case/:id" element={<Play />} />
        <Route path="badges" element={<Badges />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="field-guide" element={<FieldGuide />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
