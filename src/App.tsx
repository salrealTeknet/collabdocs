/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { UserProfile } from './types';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Sync state with URL hash for browser refresh & navigation survival
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/document/')) {
        const id = hash.replace('#/document/', '').trim();
        if (id) {
          setActiveDocumentId(id);
          return;
        }
      }
      setActiveDocumentId(null);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(user => {
      setCurrentUser(user);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDocument = (id: string) => {
    setActiveDocumentId(id);
    window.location.hash = `#/document/${id}`;
  };

  const handleBackToDashboard = () => {
    setActiveDocumentId(null);
    window.location.hash = '#/';
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-neutral-600">Initializing CollabDocs...</p>
      </div>
    );
  }

  // Not logged in -> Show Login or Register
  if (!currentUser) {
    if (authView === 'register') {
      return (
        <Register
          onRegisterSuccess={user => setCurrentUser(user)}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={user => setCurrentUser(user)}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  // Logged in and viewing document
  if (activeDocumentId) {
    return (
      <DocumentEditorPage
        documentId={activeDocumentId}
        currentUser={currentUser}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Default: Dashboard
  return (
    <Dashboard
      currentUser={currentUser}
      onUserChanged={setCurrentUser}
      onOpenDocument={handleOpenDocument}
    />
  );
}
