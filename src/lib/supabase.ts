/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Central Supabase configuration via standard Vite environment variables.
// These variables are loaded automatically on any device/browser without manual input.
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      !url.includes('your-project-ref') &&
      !url.includes('your-project-id') &&
      url.length > 10
    );
  } catch {
    return false;
  }
}

function isValidAnonKey(key: string): boolean {
  return Boolean(
    key &&
    key.length > 20 &&
    !key.includes('your-anon-public-key') &&
    !key.includes('...')
  );
}

const isConfigured = isValidSupabaseUrl(ENV_SUPABASE_URL) && isValidAnonKey(ENV_SUPABASE_ANON_KEY);

// Single client instance initialized once at startup with persistent sessions enabled
let supabaseInstance: SupabaseClient | null = null;

if (isConfigured) {
  try {
    supabaseInstance = createClient(ENV_SUPABASE_URL, ENV_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabaseInstance = null;
  }
}

/**
 * Returns the active Supabase client singleton, or null if unconfigured
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabaseInstance;
}

/**
 * Checks whether Supabase is centrally configured with valid environment variables
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(isConfigured && supabaseInstance);
}

/**
 * Returns developer-facing status of environment variables
 */
export function getSupabaseEnvStatus(): {
  configured: boolean;
  url: string;
  hasAnonKey: boolean;
} {
  return {
    configured: isSupabaseConfigured(),
    url: ENV_SUPABASE_URL,
    hasAnonKey: isValidAnonKey(ENV_SUPABASE_ANON_KEY),
  };
}
