"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Calendar, CreditCard, ClipboardCopy } from "lucide-react";
import { useEffect, useState } from "react";

const App = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/20">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Subscription Card */}
          <Card className="lg:col-span-2 bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    Abonnement Premium
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Gérez votre abonnement et accédez à tous les outils
                  </CardDescription>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/20">
                  Premium
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Plan actuel</p>
                  <p className="text-lg font-semibold text-white">Premium Monthly</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Prochaine facturation</p>
                  <p className="text-lg font-semibold text-white">15 Février 2024</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Prix</p>
                  <p className="text-lg font-semibold text-white">€39.99/mois</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Statut</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Actif</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 pt-4">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Gérer le paiement
                </Button>
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                  <Calendar className="w-4 h-4 mr-2" />
                  Modifier le plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Discord Access Card */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Accès Discord
              </CardTitle>
              <CardDescription className="text-gray-400">
                Rejoignez la communauté exclusive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Accès aux canaux premium</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Support prioritaire</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Ressources exclusives</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                onClick={() => window.open('https://discord.gg/your-server', '_blank')}
              >
                Ecom Agent Access
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Votre rôle sera automatiquement attribué
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Tools Connect Section (updates via Discord/Discohook to /api/credentials) */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Connexion aux outils</h2>
          <CredentialsPanel />
        </div>
      </div>
    </div>
  );
};

export default App;

type ToolCredentials = {
  updatedAt?: string;
  adspower_email?: string;
  adspower_password?: string;
  note?: string;
};

function CredentialsPanel() {
  const [creds, setCreds] = useState<ToolCredentials | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchCreds = async () => {
      try {
        const res = await fetch('/api/credentials');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (active) {
          setCreds(data);
          setError(null);
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCreds();
    const id = setInterval(fetchCreds, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const copy = (value?: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Identifiants AdsPower</CardTitle>
        <CardDescription className="text-gray-400">
          Cette section se met à jour automatiquement depuis votre bot Discord (Discohook → POST /api/credentials).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : creds && (creds.adspower_email || creds.adspower_password) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <span className="text-white break-all">{creds.adspower_email}</span>
                <Button size="sm" variant="outline" className="border-gray-600" onClick={() => copy(creds.adspower_email)}>
                  <ClipboardCopy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Mot de passe</p>
              <div className="flex items-center gap-2">
                <span className="text-white break-all">{creds.adspower_password}</span>
                <Button size="sm" variant="outline" className="border-gray-600" onClick={() => copy(creds.adspower_password)}>
                  <ClipboardCopy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {creds.note && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Note</p>
                <p className="text-white whitespace-pre-wrap">{creds.note}</p>
              </div>
            )}
            <p className="text-xs text-gray-500 md:col-span-2">Dernière mise à jour: {creds?.updatedAt ? new Date(creds.updatedAt).toLocaleString() : '—'}</p>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            En attente d’identifiants… Configurez Discohook pour envoyer un POST JSON vers <code className="text-gray-300">/api/credentials</code>.
          </div>
        )}
      </CardContent>
    </Card>
  );
}