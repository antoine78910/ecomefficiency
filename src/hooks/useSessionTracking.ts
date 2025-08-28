
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
  user_id: string;
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

  const trackSession = useCallback(async (userId: string, sessionType: 'signup' | 'signin') => {
    setIsLoading(true);
    try {
      const [locationData, ipAddress] = await Promise.all([
        getLocationData(),
        getIPAddress()
      ]);

      const sessionData: SessionData = {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        session_type: sessionType,
        ...locationData,
      };

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
