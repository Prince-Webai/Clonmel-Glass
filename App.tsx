
import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import InvoiceList from './pages/InvoiceList.tsx';
import InvoiceBuilder from './pages/InvoiceBuilder.tsx';
import InvoiceCalendar from './pages/InvoiceCalendar.tsx';
import CustomerCRM from './pages/CustomerCRM.tsx';
import Admin from './pages/Admin.tsx';
import Quotes from './pages/Quotes.tsx';
import Settings from './pages/Settings.tsx';

const LoginScreen = () => {
  const { login } = useApp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetSent, setResetSent] = React.useState(false);
  const [resetPassword, setResetPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');

  // Demo passwords for the system
  const validCredentials: Record<string, string> = {
    'admin@clonmel.com': 'admin123',
    'john@clonmel.com': 'user123'
  };

  const handleLogin = () => {
    setLoginError('');

    // Check if email exists
    if (!validCredentials[email]) {
      setLoginError('Email not found');
      return;
    }

    // Check password
    if (validCredentials[email] !== password) {
      setLoginError('Incorrect password');
      return;
    }

    // Login successful
    login(email);
  };

  const handleForgotPassword = () => {
    if (!resetEmail) {
      alert('Please enter your email address');
      return;
    }

    if (!validCredentials[resetEmail]) {
      alert('Email not found in our system');
      return;
    }

    // Get the password for this email
    const userPassword = validCredentials[resetEmail];
    setResetPassword(userPassword);

    // Simulate sending reset email
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setShowForgotPassword(false);
      setResetEmail('');
      setResetPassword('');
    }, 5000); // Extended to 5 seconds so user can read the password
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
            CG
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Clonmel Glass</h1>
          <p className="text-slate-500">Quotes & Invoices System</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder="Enter your password"
            />
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
          >
            Sign In
          </button>

          <button
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Forgot Password?
          </button>
        </div>


      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Reset Password</h2>
            <p className="text-sm text-slate-500 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetSent ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-6 rounded-lg text-center">
                  <div className="text-4xl mb-2">✓</div>
                  <p className="font-bold">Password Reset Email Sent!</p>
                  <p className="text-sm mt-1">Check your inbox for reset instructions.</p>
                </div>

                {/* Demo: Show the password directly */}
                <div className="bg-brand-50 border-2 border-brand-200 px-4 py-6 rounded-lg">
                  <p className="text-xs font-black text-brand-600 uppercase tracking-widest mb-2 text-center">
                    📧 Simulated Email Content
                  </p>
                  <div className="bg-white border border-brand-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-600 mb-2">Your password is:</p>
                    <p className="text-2xl font-black text-brand-600 tracking-wider select-all">
                      {resetPassword}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                      Copy this password to log in
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all font-semibold shadow-lg shadow-brand-500/20"
                  >
                    Send Reset Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MainContent = () => {
  const { currentView } = useApp();

  switch (currentView) {
    case 'LOGIN': return <LoginScreen />;
    case 'DASHBOARD': return <Dashboard />;
    case 'CALENDAR': return <InvoiceCalendar />;
    case 'INVOICES': return <InvoiceList />;
    case 'QUOTES': return <Quotes />;
    case 'CREATE_INVOICE': return <InvoiceBuilder />;
    case 'CUSTOMERS': return <CustomerCRM />;
    case 'PRODUCTS': return <Admin />;
    case 'USERS': return <Admin />; // Admin page handles tabs
    case 'SETTINGS': return <Settings />;
    default: return <Dashboard />;
  }
};

const App = () => {
  return (
    <AppProvider>
      <Layout>
        <MainContent />
      </Layout>
    </AppProvider>
  );
};

export default App;
