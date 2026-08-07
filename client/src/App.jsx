import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import QuizList from './pages/student/QuizList';
import QuizDetail from './pages/student/QuizDetail';
import AttemptPage from './pages/student/AttemptPage';
import ResultPage from './pages/student/ResultPage';
import StudentDashboard from './pages/student/StudentDashboard';
import AttemptHistory from './pages/student/AttemptHistory';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuizzes from './pages/admin/AdminQuizzes';
import QuizEditor from './pages/admin/QuizEditor';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminAttempts from './pages/admin/AdminAttempts';
import AdminStudentDetail from './pages/admin/AdminStudentDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full animate-spin" style={{border: '4px solid rgba(30,30,30,0.9)', borderTop: '4px solid var(--yellow)'}} />
        <p className="mt-4 font-display font-bold text-lg">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const HomeRedirect = () => (
    <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/quizzes') : '/login'} replace />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={user ? <HomeRedirect /> : <Login />} />
          <Route path="/register" element={user ? <HomeRedirect /> : <Register />} />
          <Route path="/forgot-password" element={user ? <HomeRedirect /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <HomeRedirect /> : <ResetPassword />} />

          <Route
            path="/quizzes"
            element={
              <ProtectedRoute role="student">
                <QuizList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:id"
            element={
              <ProtectedRoute role="student">
                <QuizDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attempt/:attemptId"
            element={
              <ProtectedRoute role="student">
                <AttemptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:attemptId"
            element={
              <ProtectedRoute role="student">
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute role="student">
                <AttemptHistory />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <ProtectedRoute role="admin">
                <AdminQuizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/new"
            element={
              <ProtectedRoute role="admin">
                <QuizEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/:id/edit"
            element={
              <ProtectedRoute role="admin">
                <QuizEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute role="admin">
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attempts"
            element={
              <ProtectedRoute role="admin">
                <AdminAttempts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute role="admin">
                <AdminStudentDetail />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </main>
    </div>
  );
}
