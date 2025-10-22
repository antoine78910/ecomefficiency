import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Fetch active sessions from the external API
    const response = await fetch('http://193.70.34.101:20006/api/sessions/active', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch TrendTrack status" },
        { status: response.status }
      );
    }

    const sessions = await response.json();
    
    // Get the last session (dernière ligne)
    const lastSession = Array.isArray(sessions) && sessions.length > 0 
      ? sessions[sessions.length - 1] 
      : null;

    if (!lastSession) {
      // No active session, TrendTrack is available
      return NextResponse.json({
        available: true,
        message: "TrendTrack profile is available"
      });
    }

    // Check if session is still active
    const now = new Date();
    const endTime = new Date(lastSession.endTime || lastSession.end_time);
    
    if (endTime <= now) {
      // Session expired, TrendTrack is available
      return NextResponse.json({
        available: true,
        message: "TrendTrack profile is available"
      });
    }

    // Session is active, calculate remaining time
    const remainingMs = endTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));

    return NextResponse.json({
      available: false,
      remainingMinutes,
      endTime: endTime.toISOString(),
      message: `TrendTrack profile is in use`
    });

  } catch (error: any) {
    console.error('[TrendTrack Status] Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error.message 
      },
      { status: 500 }
    );
  }
}

