/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or custom configured credentials
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const STORED_URL_KEY = 'collabdocs_supabase_url';
const STORED_KEY_KEY = 'collabdocs_supabase_anon_key';
const STORED_MODE_KEY = 'collabdocs_db_mode';

export function getStoredSupabaseConfig(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  forceLocal: boolean;
} {
  if (typeof window === 'undefined') {
    return { url: '', anonKey: '', isConfigured: false, forceLocal: true };
  }

  const storedUrl = (localStorage.getItem(STORED_URL_KEY) || ENV_SUPABASE_URL).trim();
  const storedKey = (localStorage.getItem(STORED_KEY_KEY) || ENV_SUPABASE_ANON_KEY).trim();
  const forceLocal = localStorage.getItem(STORED_MODE_KEY) === 'local';

  const isConfigured = Boolean(
    storedUrl &&
    storedKey &&
    storedUrl.startsWith('https://') &&
    !storedUrl.includes('your-project-ref') &&
    !storedUrl.includes('your-project-id') &&
    !forceLocal
  );

  return {
    url: storedUrl,
    anonKey: storedKey,
    isConfigured,
    forceLocal,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string, forceLocal = false) {
  if (typeof window !== 'undefined') {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (cleanUrl) localStorage.setItem(STORED_URL_KEY, cleanUrl);
    if (cleanKey) localStorage.setItem(STORED_KEY_KEY, cleanKey);
    localStorage.setItem(STORED_MODE_KEY, forceLocal ? 'local' : 'supabase');

    // Invalidate client singleton immediately
    supabaseClientInstance = null;
    lastClientUrl = '';
    lastClientKey = '';

    window.dispatchEvent(new Event('collabdocs_supabase_config_changed'));
  }
}

export function clearCustomSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORED_URL_KEY);
    localStorage.removeItem(STORED_KEY_KEY);
    localStorage.removeItem(STORED_MODE_KEY);

    supabaseClientInstance = null;
    lastClientUrl = '';
    lastClientKey = '';

    window.dispatchEvent(new Event('collabdocs_supabase_config_changed'));
  }
}

// Client singleton tracking
let supabaseClientInstance: SupabaseClient | null = null;
let lastClientUrl = '';
let lastClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (
    !supabaseClientInstance ||
    lastClientUrl !== config.url ||
    lastClientKey !== config.anonKey
  ) {
    try {
      supabaseClientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      lastClientUrl = config.url;
      lastClientKey = config.anonKey;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

export const isSupabaseConfigured = (): boolean => {
  return getStoredSupabaseConfig().isConfigured;
};

/**
 * Validates connectivity against a Supabase project URL and anon public key
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; error?: string }> {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey) {
    return { success: false, error: 'Both Supabase URL and Anon Key are required.' };
  }

  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.protocol.startsWith('https')) {
      return { success: false, error: 'Supabase URL must start with https://' };
    }
  } catch {
    return { success: false, error: 'Invalid URL format.' };
  }

  try {
    const testClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false },
    });
    const { error } = await testClient.auth.getSession();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not establish connection to Supabase endpoint.',
    };
  }
}
