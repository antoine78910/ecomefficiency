
import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
    } catch (error) {
      console.error('Error while fetching geolocation:', error);
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
    } catch (error) {
      console.error('Error while fetching IP address:', error);
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

      // Récupérer le nom du device depuis localStorage
      const deviceName = typeof window !== 'undefined' 
        ? localStorage.getItem('device_name') || undefined 
        : undefined;

      const sessionData: SessionData = {
        user_id: userId || null,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        session_type: sessionType,
        email,
        first_name: firstName,
        last_name: lastName,
        device_name: deviceName,
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
        } catch (updateError) {
          console.error('Error marking old sessions as inactive:', updateError);
        }
      }

      // Créer la nouvelle session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([sessionData as any])
        .select('id')
        .single();

      if (error) {
        console.error('Error while saving session:', error);
      } else {
        console.log('Session saved successfully', data);
        if (data?.id) {
          setCurrentSessionId(data.id);
          // Stocker l'ID de session dans sessionStorage pour le tracking d'activité
          sessionStorage.setItem('current_session_id', data.id);
        }
      }
    } catch (error) {
      console.error('Error while tracking session:', error);
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
