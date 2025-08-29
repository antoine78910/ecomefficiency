
import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface LocationData {
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
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
}

export const useSessionTracking = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getLocationData = useCallback(async (): Promise<LocationData> => {
    try {
      // Utiliser une API de géolocalisation IP gratuite
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
        };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la géolocalisation:', error);
    }
    return {};
  }, []);

  const getIPAddress = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'IP:', error);
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

      const sessionData: SessionData = {
        user_id: userId || null,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        session_type: sessionType,
        email,
        first_name: firstName,
        last_name: lastName,
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

      const { error } = await supabase
        .from('user_sessions')
        .insert([sessionData]);

      if (error) {
        console.error('Erreur lors de l\'enregistrement de la session:', error);
      } else {
        console.log('Session enregistrée avec succès');
      }
    } catch (error) {
      console.error('Erreur lors du suivi de session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getLocationData, getIPAddress]);

  // Écouter les changements d'authentification pour OAuth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Vérifier si c'est une nouvelle session (OAuth)
        const isOAuth = session.user.app_metadata?.provider !== 'email';
        if (isOAuth) {
          await trackSession(session.user.id, 'signin');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [trackSession]);

  return { trackSession, isLoading };
};
