"use client";

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

interface TrendTrackStatusData {
  available: boolean;
  remainingMinutes?: number;
  endTime?: string;
  message: string;
}

const TrendTrackStatus = () => {
  const [status, setStatus] = useState<TrendTrackStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/trendtrack/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (err: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error fetching TrendTrack status:', err?.message || String(err));
      setError(err.message || 'Failed to load status');
      setLoading(false);
    }
  };

  // Fetch status on mount and every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update countdown every second when profile is in use
  useEffect(() => {
    if (!status || status.available || !status.endTime) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(status.endTime!);
      const remaining = end.getTime() - now.getTime();

      if (remaining <= 0) {
        setCountdown("Available soon...");
        fetchStatus(); // Refresh status
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-900/20 to-gray-900/50 border border-purple-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-purple-500/20 rounded w-32 mb-2 animate-pulse" />
            <div className="h-3 bg-purple-500/10 rounded w-48 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-gradient-to-br from-red-900/20 to-gray-900/50 border border-red-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <XCircle className="w-10 h-10 text-red-400" />
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">Error Loading Status</h3>
            <p className="text-red-300/70 text-xs">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!status) return null;

  return (
    <Card className={`p-4 bg-gradient-to-br ${
      status.available 
        ? 'from-green-900/20 to-gray-900/50 border-green-500/20' 
        : 'from-orange-900/20 to-gray-900/50 border-orange-500/20'
    } border rounded-xl transition-all duration-300`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          status.available 
            ? 'bg-green-500/20' 
            : 'bg-orange-500/20'
        }`}>
          {status.available ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Clock className="w-6 h-6 text-orange-400 animate-pulse" />
          )}
        </div>

        {/* Status Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <img 
              src="/tools-logos/trendtrack.png" 
              alt="TrendTrack" 
              className="w-5 h-5 object-contain"
            />
            <h3 className="text-white font-semibold text-sm">
              TrendTrack Profile
            </h3>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
              status.available 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
            }`}>
              {status.available ? 'Available' : 'In Use'}
            </span>
          </div>

          {status.available ? (
            <p className="text-green-300/70 text-xs">
              The TrendTrack profile is currently available for use
            </p>
          ) : (
            <div>
              <p className="text-orange-300/70 text-xs mb-1">
                Profile is currently in use by another session
              </p>
              {countdown && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-orange-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000"
                      style={{ 
                        width: status.remainingMinutes 
                          ? `${Math.max(0, Math.min(100, (status.remainingMinutes / 60) * 100))}%` 
                          : '50%' 
                      }}
                    />
                  </div>
                  <span className="text-orange-300 text-xs font-mono font-semibold whitespace-nowrap">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pro Only Badge */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Real-time status monitoring
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-300 border border-yellow-500/30">
            Pro Feature
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TrendTrackStatus;

