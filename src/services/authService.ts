/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from '../lib/localDatabase';
import { UserProfile } from '../types';

export interface AuthStateChangeCallback {
  (user: UserProfile | null): void;
}

const listeners: Set<AuthStateChangeCallback> = new Set();

function notifyListeners(user: UserProfile | null) {
  listeners.forEach(cb => {
    try {
      cb(user);
    } catch (err) {
      console.error('Error in auth state listener:', err);
    }
  });
}

export const authService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          return null;
        }
        // Fetch matching profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          return profile as UserProfile;
        }

        return {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          created_at: session.user.created_at,
        };
      } catch (err) {
        console.warn('Failed to get current user from Supabase, using local fallback:', err);
      }
    }

    return localDB.getSessionUser();
  },

  async signUp(email: string, password: string, fullName: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        throw new Error(`Supabase Registration Error: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Registration completed, but no user record was returned from Supabase.');
      }

      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        full_name: cleanName,
        created_at: data.user.created_at || new Date().toISOString(),
      };

      // If Supabase returned an authenticated session (email confirmation off):
      if (data.session) {
        try {
          await supabase.from('profiles').upsert([profile]);
        } catch (upsertErr: any) {
          console.warn('Profile upsert note (trigger may have already handled it):', upsertErr.message);
        }
      } else {
        // Try automatic sign in to establish session if email confirmation is not enforced
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!signInErr && signInData?.session) {
            await supabase.from('profiles').upsert([profile]);
          }
        } catch {
          // If sign in fails, email confirmation is active in Supabase project
        }
      }

      notifyListeners(profile);
      return profile;
    }

    // Local mode (when Supabase credentials are not provided)
    const existing = localDB.getProfileByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in.');
    }

    const newProfile: UserProfile = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      full_name: cleanName,
      created_at: new Date().toISOString(),
    };

    localDB.saveCredentials(cleanEmail, password);
    localDB.createOrUpdateProfile(newProfile);
    localDB.setSessionUser(newProfile);
    notifyListeners(newProfile);
    return newProfile;
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error('Email and password are required.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw new Error(`Supabase Login Error: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Sign in succeeded, but no user information was returned.');
      }

      // Fetch profile from Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userProfile: UserProfile = profile || {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        created_at: data.user.created_at,
      };

      notifyListeners(userProfile);
      return userProfile;
    }

    // Local mode check
    const profile = localDB.getProfileByEmail(cleanEmail);
    if (!profile) {
      throw new Error('No account found with this email. Please create an account first.');
    }

    const isMatch = localDB.verifyPassword(cleanEmail, password);
    if (!isMatch) {
      throw new Error('Incorrect password. Please try again.');
    }

    localDB.setSessionUser(profile);
    notifyListeners(profile);
    return profile;
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    localDB.setSessionUser(null);
    notifyListeners(null);
  },

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    listeners.add(callback);
    // Initial emission
    this.getCurrentUser().then(user => callback(user));

    const supabase = getSupabaseClient();
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase && isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          callback(null);
          return;
        }
        const user = await this.getCurrentUser();
        callback(user);
      });
      authSubscription = subscription;
    }

    return () => {
      listeners.delete(callback);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  },

  async searchProfiles(query: string): Promise<UserProfile[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(10);

        if (!error && data) {
          return data as UserProfile[];
        }
      } catch (err) {
        console.warn('Error querying profiles in Supabase:', err);
      }
    }

    // Local mode search
    return localDB.getProfiles().filter(p =>
      p.email.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q)
    );
  },
};
