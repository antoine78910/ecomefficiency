
import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { getDeviceDisplayName } from "@/lib/parseUserAgent";

interface LocationData {
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

interface SessionData {
  ip_address: string;
  user_agent: string;
  session_type: 'signup' | 'signin';
  user_id: string | null;
  email?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  device_name?: string;
  device_fingerprint?: string;
  fingerprint_version?: string;
}

const DEVICE_FINGERPRINT_VERSION = 'v1';

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.TextEncoder) return '';
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildDeviceFingerprint(userAgent: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const nav = window.navigator;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const screenW = window.screen?.width || 0;
    const screenH = window.screen?.height || 0;
    const pixelRatio = window.devicePixelRatio || 1;
    const raw = [
      DEVICE_FINGERPRINT_VERSION,
      nav.platform || '',
      nav.language || '',
      (nav.languages || []).join(','),
      userAgent || '',
      tz,
      `${screenW}x${screenH}`,
      String(pixelRatio),
      String(nav.hardwareConcurrency || ''),
      String((nav as any).deviceMemory || ''),
      String(nav.maxTouchPoints || 0),
    ].join('|');
    const hash = await sha256Hex(raw);
    return hash ? `${DEVICE_FINGERPRINT_VERSION}_${hash.slice(0, 32)}` : '';
  } catch {
    return '';
  }
}

export const useSessionTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const getLocationData = useCallback(async (): Promise<LocationData> => {
    try {
      // Utiliser notre API serveur pour une meilleure géolocalisation
      const response = await fetch('/api/geolocation');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          isp: data.isp,
        };
      }
    } catch (error: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error while fetching geolocation:', error?.message || String(error));
    }
    return {};
  }, []);

  const getIPAddress = useCallback(async (): Promise<string> => {
    try {
      // Utiliser notre API /api/ip pour récupérer l'IP
      const response = await fetch('/api/ip');
      if (response.ok) {
        const data = await response.json();
        return data.ip || 'unknown';
      }
    } catch (error: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error while fetching IP address:', error?.message || String(error));
    }
    return 'unknown';
  }, []);

  const trackSession = useCallback(async (
    userId: string | null,
    sessionType: 'signup' | 'signin',
    emailParam?: string | null,
    firstNameParam?: string | null,
    lastNameParam?: string | null,
  ) => {
    setIsLoading(true);
    try {
      // Resolve email and first_name if not provided
      let email: string | undefined = emailParam || undefined;
      let firstName: string | undefined = firstNameParam || undefined;
      let lastName: string | undefined = lastNameParam || undefined;
      if (!email || !firstName) {
        try {
          const { data } = await supabase.auth.getUser();
          const user = data.user ?? null;
          email = email || user?.email || undefined;
          const meta = (user?.user_metadata as any) || {};
          firstName = firstName || (meta.first_name as string) || undefined;
          lastName = lastName || (meta.last_name as string) || undefined;
        } catch {}
      }

      const [locationData, ipAddress] = await Promise.all([
        getLocationData(),
        getIPAddress()
      ]);

      // Détecter automatiquement le nom du device depuis le User Agent
      const userAgent = navigator.userAgent;
      const deviceName = getDeviceDisplayName(userAgent);
      const deviceFingerprint = await buildDeviceFingerprint(userAgent);

      const sessionData: SessionData = {
        user_id: userId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_type: sessionType,
        email,
        first_name: firstName,
        last_name: lastName,
        device_name: deviceName,
        device_fingerprint: deviceFingerprint || undefined,
        fingerprint_version: DEVICE_FINGERPRINT_VERSION,
        ...locationData,
      };

      // Also upsert to profiles for quick lookup
      try {
        const profileUpdate: any = {
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
        };
        if (sessionType === 'signup') {
          profileUpdate.signup_ip = ipAddress;
        } else if (sessionType === 'signin') {
          // shift last_signin_ip to prior_signin_ip, then set new last_signin_ip
          // This requires a select to read current profile
          const { data: found } = await supabase
            .from('profiles')
            .select('last_signin_ip')
            .eq('id', userId || '')
            .single();
          if (found?.last_signin_ip) profileUpdate.prior_signin_ip = found.last_signin_ip;
          profileUpdate.last_signin_ip = ipAddress;
          profileUpdate.last_signin_at = new Date().toISOString();
        }
        await supabase.from('profiles').upsert({ id: userId || '', ...profileUpdate });
      } catch {}

      // Avant de créer une nouvelle session, marquer toutes les anciennes sessions de cet utilisateur comme inactives
      if (userId) {
        try {
          await supabase
            .from('user_sessions')
            .update({ 
              is_active: false,
              ended_at: new Date().toISOString()
            } as any)
            .eq('user_id', userId)
            .eq('is_active', true);
          
          console.log('Marked old sessions as inactive for user:', userId);
        } catch (updateError: any) {
          // Safe logging to prevent DataCloneError
          console.error('Error marking old sessions as inactive:', updateError?.message || String(updateError));
        }
      }

      // Créer la nouvelle session.
      // Fallback: if DB schema does not have fingerprint columns yet, retry without them.
      let data: any = null;
      let error: any = null;
      let insertAttempt = await supabase
        .from('user_sessions')
        .insert([sessionData as any])
        .select('id')
        .single();
      data = insertAttempt.data;
      error = insertAttempt.error;

      if (error?.message && /device_fingerprint|fingerprint_version|column/i.test(String(error.message))) {
        const fallbackData: any = { ...sessionData };
        delete fallbackData.device_fingerprint;
        delete fallbackData.fingerprint_version;
        insertAttempt = await supabase
          .from('user_sessions')
          .insert([fallbackData])
          .select('id')
          .single();
        data = insertAttempt.data;
        error = insertAttempt.error;
      }

      if (error) {
        // Safe logging to prevent DataCloneError
        console.error('Error while saving session:', error.message || String(error));
      } else {
        console.log('Session saved successfully', data);
        if (data?.id) {
          setCurrentSessionId(data.id);
          // Stocker l'ID de session dans sessionStorage pour le tracking d'activité
          sessionStorage.setItem('current_session_id', data.id);
        }
      }
    } catch (error: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error while tracking session:', error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  }, [getLocationData, getIPAddress]);

  // Listen to auth changes for OAuth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this is an OAuth session
        const isOAuth = session.user.app_metadata?.provider !== 'email';
        if (isOAuth) {
          await trackSession(session.user.id, 'signin');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [trackSession]);

  return { trackSession, isLoading, currentSessionId };
};
