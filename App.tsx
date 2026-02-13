
import React, { useEffect, useState } from 'react';
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
import InvoiceListTest from './pages/InvoiceListTest.tsx';
import InvoiceListSimple from './pages/InvoiceListSimple.tsx';
import LoginScreen from './components/LoginScreen.tsx';

const MainContent = () => {
  const { currentView } = useApp();

  // Automation removed in favor of n8n server-side workflow

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

import { ToastProvider } from './contexts/ToastContext';

const AppContent = () => {
  const { user, isLoading } = useApp();
  // Automation removed in favor of n8n server-side workflow
  // Custom Auth: Passwords resets are handled via OTP in LoginScreen now.

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing Core Systems...</div>;

  if (!user) return <LoginScreen />;

  return (
    <Layout>
      <MainContent />
    </Layout>
  );
};

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
