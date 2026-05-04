import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardHome from '../components/dashboard/DashboardHome';
import Profile from '../components/dashboard/Profile';
import StudySpace from '../components/dashboard/StudySpace';
import ChatPage from '../components/dashboard/chat/ChatPage';
import KnowledgeSpacesOverview from '../components/dashboard/KnowledgeSpacesOverview';
import PrepHub from '../components/dashboard/PrepHub';
import PomodoroPage from '../pages/PomodoroPage';
import { useAuth } from '../context/AuthContext';
import { SpaceProvider } from '../context/SpaceContext';
import { DocumentProvider } from '../context/DocumentContext';

const DashboardPage = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SpaceProvider>
      <DocumentProvider>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="spaces" element={<KnowledgeSpacesOverview />} />
            <Route path="study" element={<StudySpace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="prep-hub" element={<PrepHub />} />
            <Route path="pomodoro" element={<PomodoroPage />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </DocumentProvider>
    </SpaceProvider>
  );
};

export default DashboardPage;

