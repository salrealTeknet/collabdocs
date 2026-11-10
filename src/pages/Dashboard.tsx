/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Upload,
  Search,
  FileText,
  Users,
  Clock,
  LayoutGrid,
  List as ListIcon,
  FolderLock,
  RefreshCw,
  FolderHeart,
  Crown,
  Eye,
  FileEdit,
  Trash2,
  Share2,
  Edit2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { DocumentCard } from '../components/documents/DocumentCard';
import { CreateDocumentModal } from '../components/documents/CreateDocumentModal';
import { RenameDocumentModal } from '../components/documents/RenameDocumentModal';
import { ImportDocumentModal } from '../components/documents/ImportDocumentModal';
import { ShareModal } from '../components/documents/ShareModal';
import { Modal } from '../components/common/Modal';
import { SqlMigrationModal } from '../components/common/SqlMigrationModal';
import { documentService } from '../services/documentService';
import { DocumentWithMeta, DocumentRecord, UserProfile } from '../types';

interface DashboardProps {
  currentUser: UserProfile;
  onUserChanged: (user: UserProfile | null) => void;
  onOpenDocument: (documentId: string) => void;
}

type TabType = 'all' | 'owned' | 'shared' | 'recent';
type ViewMode = 'grid' | 'table';

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onUserChanged,
  onOpenDocument,
}) => {
  const [ownedDocs, setOwnedDocs] = useState<DocumentWithMeta[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & display
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [renameTargetDoc, setRenameTargetDoc] = useState<DocumentWithMeta | null>(null);
  const [shareTargetDoc, setShareTargetDoc] = useState<DocumentWithMeta | null>(null);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentWithMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { owned, shared } = await documentService.getDocuments();
      setOwnedDocs(owned);
      setSharedDocs(shared);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, currentUser.id]);

  // Handle document created
  const handleDocumentCreated = (newDoc: DocumentRecord) => {
    onOpenDocument(newDoc.id);
  };

  // Handle document renamed
  const handleDocumentRenamed = (documentId: string, newTitle: string) => {
    setOwnedDocs(prev =>
      prev.map(d => (d.id === documentId ? { ...d, title: newTitle } : d))
    );
    setSharedDocs(prev =>
      prev.map(d => (d.id === documentId ? { ...d, title: newTitle } : d))
    );
  };

  // Confirm delete
  const executeDelete = async () => {
    if (!deleteTargetDoc) return;
    try {
      setIsDeleting(true);
      await documentService.deleteDocument(deleteTargetDoc.id);
      setDeleteTargetDoc(null);
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Combined documents based on tab and search
  const filteredOwned = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ownedDocs.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        (d.owner?.full_name || '').toLowerCase().includes(q)
    );
  }, [ownedDocs, searchQuery]);

  const filteredShared = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sharedDocs.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        (d.owner?.full_name || '').toLowerCase().includes(q)
    );
  }, [sharedDocs, searchQuery]);

  const recentDocs = useMemo(() => {
    const all = [...ownedDocs, ...sharedDocs];
    return all
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
  }, [ownedDocs, sharedDocs]);

  return (
    <div className="min-h-screen bg-neutral-50/80 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onUserChanged={onUserChanged}
        onRefreshDocs={fetchDocuments}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 hidden md:flex flex-col gap-6">
          {/* Quick Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Document</span>
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              className="w-full py-2 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-500" />
              <span>Import .md / .txt</span>
            </button>
          </div>

          {/* Navigation sections */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>All Documents</span>
              </div>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                {ownedDocs.length + sharedDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('owned')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'owned'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderHeart className="w-4 h-4 text-amber-600" />
                <span>My Documents</span>
              </div>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                {ownedDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shared')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'shared'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Shared With Me</span>
              </div>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                {sharedDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('recent')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span>Recent Documents</span>
              </div>
            </button>
          </nav>

          {/* Storage & User info badge */}
          <div className="mt-auto bg-white p-3.5 rounded-xl border border-neutral-200 text-xs">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Workspace Profile</span>
            </div>
            <p className="text-neutral-500 text-[11px] mt-1 truncate">
              {currentUser.full_name}
            </p>
            <p className="text-neutral-400 text-[10px] truncate">{currentUser.email}</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Welcome & Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Welcome back, {currentUser.full_name.split(' ')[0]}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Organize, collaborate, and edit rich-text documents
              </p>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="py-1.5 px-3 text-xs font-medium text-white bg-blue-600 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="py-1.5 px-3 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>
          </div>

          {/* Search, Filter, View Controls */}
          <div className="bg-white rounded-xl border border-neutral-200 p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search documents by title or author..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* Filter Pills & View Toggles */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              {/* Tab Pills for mobile or quick select */}
              <div className="flex sm:hidden items-center gap-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-1 text-[11px] rounded ${
                    activeTab === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('owned')}
                  className={`px-2 py-1 text-[11px] rounded ${
                    activeTab === 'owned' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                  }`}
                >
                  Mine
                </button>
                <button
                  onClick={() => setActiveTab('shared')}
                  className={`px-2 py-1 text-[11px] rounded ${
                    activeTab === 'shared' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                  }`}
                >
                  Shared
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-neutral-200 rounded-lg p-0.5 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-neutral-100 text-neutral-900 font-medium'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    viewMode === 'table'
                      ? 'bg-neutral-100 text-neutral-900 font-medium'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  title="Table View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchDocuments}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Refresh documents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="mb-6 space-y-2">
              <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchDocuments}
                  className="underline font-medium hover:text-rose-900 cursor-pointer"
                >
                  Retry
                </button>
              </div>

              {(error.toLowerCase().includes('schema cache') ||
                error.toLowerCase().includes('public.documents') ||
                error.toLowerCase().includes('relation')) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-amber-950">
                        Supabase Database Setup Required
                      </span>
                      <span className="text-[11px] text-amber-800">
                        The table &apos;public.documents&apos; does not exist yet. Run the SQL migration in your Supabase project to initialize tables and Row Level Security.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shrink-0 transition-colors shadow-xs cursor-pointer"
                  >
                    View SQL Fix
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {isLoading && ownedDocs.length === 0 && sharedDocs.length === 0 ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">Loading your document workspace...</p>
            </div>
          ) : null}

          {/* Tab Views */}
          {(!isLoading || ownedDocs.length > 0 || sharedDocs.length > 0) && (
            <div className="space-y-8">
              {/* RECENT TAB */}
              {activeTab === 'recent' && (
                <div>
                  <h2 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span>Recently Updated Documents</span>
                  </h2>
                  {recentDocs.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
                      No recent document activity found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentDocs.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onOpen={onOpenDocument}
                          onRename={setRenameTargetDoc}
                          onDelete={setDeleteTargetDoc}
                          onShare={setShareTargetDoc}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OWNED DOCUMENTS SECTION */}
              {(activeTab === 'all' || activeTab === 'owned') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <FolderHeart className="w-4 h-4 text-amber-600" />
                      <span>My Documents</span>
                      <span className="text-xs text-neutral-400 font-normal">
                        ({filteredOwned.length})
                      </span>
                    </h2>
                    {activeTab === 'all' && (
                      <button
                        onClick={() => setActiveTab('owned')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View all &rarr;
                      </button>
                    )}
                  </div>

                  {filteredOwned.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-dashed border-neutral-300 text-center">
                      <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-800">No owned documents</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {searchQuery
                          ? 'No documents matched your search filter.'
                          : 'Create a new document or import markdown to get started.'}
                      </p>
                      {!searchQuery && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <button
                            onClick={() => setIsCreateOpen(true)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            Create Document
                          </button>
                          <button
                            onClick={() => setIsImportOpen(true)}
                            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                          >
                            Import File
                          </button>
                        </div>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredOwned.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onOpen={onOpenDocument}
                          onRename={setRenameTargetDoc}
                          onDelete={setDeleteTargetDoc}
                          onShare={setShareTargetDoc}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                            <th className="py-2.5 px-4">Title</th>
                            <th className="py-2.5 px-4">Owner</th>
                            <th className="py-2.5 px-4">Last Updated</th>
                            <th className="py-2.5 px-4">Role</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {filteredOwned.map(doc => (
                            <tr
                              key={doc.id}
                              onClick={() => onOpenDocument(doc.id)}
                              className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-4 font-medium text-neutral-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate max-w-xs">{doc.title}</span>
                              </td>
                              <td className="py-2.5 px-4 text-neutral-600">
                                {doc.owner?.full_name || 'You'}
                              </td>
                              <td className="py-2.5 px-4 text-neutral-400">
                                {new Date(doc.updated_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Crown className="w-2.5 h-2.5" />
                                  Owner
                                </span>
                              </td>
                              <td
                                className="py-2.5 px-4 text-right space-x-1"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setRenameTargetDoc(doc)}
                                  className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setShareTargetDoc(doc)}
                                  className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                                  title="Share"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTargetDoc(doc)}
                                  className="p-1 rounded text-neutral-400 hover:text-rose-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SHARED DOCUMENTS SECTION */}
              {(activeTab === 'all' || activeTab === 'shared') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Shared With Me</span>
                      <span className="text-xs text-neutral-400 font-normal">
                        ({filteredShared.length})
                      </span>
                    </h2>
                    {activeTab === 'all' && (
                      <button
                        onClick={() => setActiveTab('shared')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View all &rarr;
                      </button>
                    )}
                  </div>

                  {filteredShared.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-dashed border-neutral-300 text-center">
                      <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-800">
                        No documents shared with you
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        When teammates share a document with {currentUser.email}, it will appear here.
                      </p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredShared.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onOpen={onOpenDocument}
                          onRename={setRenameTargetDoc}
                          onDelete={setDeleteTargetDoc}
                          onShare={setShareTargetDoc}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Table View for Shared */
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                            <th className="py-2.5 px-4">Title</th>
                            <th className="py-2.5 px-4">Owner</th>
                            <th className="py-2.5 px-4">Last Updated</th>
                            <th className="py-2.5 px-4">Your Permission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {filteredShared.map(doc => (
                            <tr
                              key={doc.id}
                              onClick={() => onOpenDocument(doc.id)}
                              className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-4 font-medium text-neutral-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate max-w-xs">{doc.title}</span>
                              </td>
                              <td className="py-2.5 px-4 text-neutral-600">
                                {doc.owner?.full_name || doc.owner?.email || 'Collaborator'}
                              </td>
                              <td className="py-2.5 px-4 text-neutral-400">
                                {new Date(doc.updated_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-4">
                                {doc.permission === 'editor' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    <FileEdit className="w-2.5 h-2.5" />
                                    Editor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                                    <Eye className="w-2.5 h-2.5" />
                                    Viewer
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateDocumentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleDocumentCreated}
      />

      <ImportDocumentModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleDocumentCreated}
      />

      <RenameDocumentModal
        isOpen={Boolean(renameTargetDoc)}
        document={renameTargetDoc}
        onClose={() => setRenameTargetDoc(null)}
        onRenamed={handleDocumentRenamed}
      />

      <ShareModal
        isOpen={Boolean(shareTargetDoc)}
        document={shareTargetDoc}
        currentUser={currentUser}
        onClose={() => setShareTargetDoc(null)}
        onSharesUpdated={fetchDocuments}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTargetDoc)}
        onClose={() => setDeleteTargetDoc(null)}
        title="Delete Document"
        description="This action cannot be undone"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600">
            Are you sure you want to delete{' '}
            <strong className="text-neutral-900 font-semibold">
              &quot;{deleteTargetDoc?.title}&quot;
            </strong>
            ? All content and collaborator sharing records will be permanently removed.
          </p>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTargetDoc(null)}
              className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={executeDelete}
              className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      <SqlMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
};
