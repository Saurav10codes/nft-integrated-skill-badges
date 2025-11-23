import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './home/Login';
import Dashboard from './dashboard/Dashboard';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('stellar_user');
      const savedAddress = localStorage.getItem('stellar_wallet');
      setIsAuthenticated(!!savedUser && !!savedAddress);
    };

    checkAuth();
  }, []);

  // While checking authentication, show nothing or a loader
  if (isAuthenticated === null) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('stellar_user');
      const savedAddress = localStorage.getItem('stellar_wallet');
      setIsAuthenticated(!!savedUser && !!savedAddress);
    };

    checkAuth();
  }, []);

  // While checking authentication, show nothing or a loader
  if (isAuthenticated === null) {
    return null;
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not authenticated, show the public page
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route - redirects to dashboard if logged in */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/test/:testId" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch all unknown routes - redirect to dashboard if authenticated, otherwise to login */}
        <Route 
          path="*" 
          element={
            <RedirectToValidRoute />
          } 
        />
      </Routes>
    </Router>
  );
}

// Component to handle invalid routes
const RedirectToValidRoute = () => {
  const savedUser = localStorage.getItem('stellar_user');
  const savedAddress = localStorage.getItem('stellar_wallet');
  const isAuthenticated = !!savedUser && !!savedAddress;

  // Redirect to dashboard if authenticated, otherwise to login
  return <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />;
};

export default App;
