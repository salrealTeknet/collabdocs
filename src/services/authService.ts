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
  /**
   * Retrieves the current authenticated user session
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          return null;
        }

        // Fetch matching profile from the profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          return profile as UserProfile;
        }

        // Fallback to auth metadata if profile record is still propagating
        return {
          id: session.user.id,
          email: session.user.email || '',
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'User',
          created_at: session.user.created_at,
        };
      } catch (err) {
        console.warn('Failed to retrieve current user from Supabase:', err);
      }
    }

    return localDB.getSessionUser();
  },

  /**
   * Registers a new account via Supabase Auth
   */
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<UserProfile & { needsEmailConfirmation?: boolean }> {
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
        const msg = error.message.toLowerCase();
        if (
          msg.includes('already registered') ||
          msg.includes('already exists') ||
          msg.includes('user_already_exists')
        ) {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        }
        throw new Error(error.message);
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

      // If Supabase returned an active session (email confirmation disabled in Supabase)
      if (data.session) {
        try {
          await supabase.from('profiles').upsert([profile]);
        } catch (upsertErr: any) {
          console.warn('Profile upsert note:', upsertErr?.message);
        }
        notifyListeners(profile);
        return profile;
      }

      // Attempt automatic sign-in if session was not attached
      try {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!signInErr && signInData?.session) {
          try {
            await supabase.from('profiles').upsert([profile]);
          } catch {
            // database trigger handled it
          }
          notifyListeners(profile);
          return profile;
        }
      } catch {
        // Email confirmation is required by Supabase project settings
      }

      // No active session: email verification required
      return {
        ...profile,
        needsEmailConfirmation: true,
      };
    }

    // Local mode (when Supabase environment variables are not yet provided)
    const existing = localDB.getProfileByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
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

  /**
   * Signs in a user with email and password
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error('Please enter both your email address and password.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials')) {
          throw new Error('Invalid email or password. Please verify your credentials and try again.');
        }
        if (msg.includes('email not confirmed')) {
          throw new Error('Your email address has not been confirmed yet. Please check your inbox for the confirmation link.');
        }
        throw new Error(error.message);
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

    // Local mode fallback
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

  /**
   * Signs out the current user session
   */
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

  /**
   * Listens to authentication state changes and restores persistent sessions
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    listeners.add(callback);

    // Initial check to restore existing session
    this.getCurrentUser().then(user => callback(user));

    const supabase = getSupabaseClient();
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (supabase && isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session?.user) {
          notifyListeners(null);
          return;
        }
        const user = await this.getCurrentUser();
        notifyListeners(user);
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

  /**
   * Search registered profiles for sharing
   */
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
