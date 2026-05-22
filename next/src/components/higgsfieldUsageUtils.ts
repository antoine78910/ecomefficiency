export type HiggsfieldUsageEvent = {
  id?: number;
  email: string | null;
  delta: number;
  used_today: number | null;
  at: string;
  created_at?: string;
  user_agent?: string | null;
  source?: string | null;
  // Extended fields from network-level tracking
  hf_user_id?: string | null;
  model?: string | null;
  hf_cost_raw?: number | null;
  use_unlim?: boolean | null;
  abuse_flags?: string | null;
  comparison_source?: string | null;
  comparison_delta?: number | null;
};

export type HiggsfieldEventFilterMode = "all" | "chargeable" | "unlimited";

export function isChargeableHiggsfieldEvent(row: HiggsfieldUsageEvent): boolean {
  return (Number(row.delta) || 0) > 0;
}

export function isUnlimitedHiggsfieldEvent(row: HiggsfieldUsageEvent): boolean {
  return String(row.source || "").trim().toLowerCase() === "unlimited_generate";
}

function eventTimestamp(row: HiggsfieldUsageEvent): number {
  return new Date(row.created_at || row.at || 0).getTime();
}

export function filterHiggsfieldEvents(
  rows: HiggsfieldUsageEvent[],
  opts: { mode: HiggsfieldEventFilterMode; emailQuery: string }
): HiggsfieldUsageEvent[] {
  const emailQuery = opts.emailQuery.trim().toLowerCase();

  return rows
    .filter((row) => {
      if (opts.mode === "chargeable" && !isChargeableHiggsfieldEvent(row)) return false;
      if (opts.mode === "unlimited" && !isUnlimitedHiggsfieldEvent(row)) return false;
      if (emailQuery && !(row.email || "").toLowerCase().includes(emailQuery)) return false;
      return true;
    })
    .sort((a, b) => eventTimestamp(b) - eventTimestamp(a));
}

export function summarizeHiggsfieldUsageRows(rows: HiggsfieldUsageEvent[]) {
  const chargeableRows = rows.filter(isChargeableHiggsfieldEvent);
  const totalCredits = chargeableRows.reduce((sum, row) => sum + (Number(row.delta) || 0), 0);

  let unlimitedClicks = 0;
  let unlimitedCredits = 0;
  let standardClicks = 0;
  let standardCredits = 0;
  const byEmailMap = new Map<string, number>();

  for (const row of rows) {
    const delta = Number(row.delta) || 0;
    const source = String(row.source || "").toLowerCase();
    if (source === "unlimited_generate") {
      unlimitedClicks += 1;
      unlimitedCredits += delta;
    } else if (source === "standard_generate") {
      standardClicks += 1;
      standardCredits += delta;
    }
  }

  for (const row of chargeableRows) {
    const key = (row.email || "").trim() || "(sans email)";
    byEmailMap.set(key, (byEmailMap.get(key) || 0) + (Number(row.delta) || 0));
  }

  const byEmail = Array.from(byEmailMap.entries())
    .map(([email, credits]) => ({ email, credits }))
    .sort((a, b) => b.credits - a.credits);

  return {
    chargeableRows,
    totalCredits,
    byEmail,
    unlimitedClicks,
    unlimitedCredits,
    standardClicks,
    standardCredits,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified generation history (network-first)
// ─────────────────────────────────────────────────────────────────────────────

export type UnifiedGenerationRow = {
  id?: number;
  email: string | null;
  delta: number;
  at: string;
  feature: string;
  action: "Spent" | "Tracked";
  tracking: "network" | "overlay" | "wallet_inferred";
  model: string | null;
  source: string | null;
};

const OVERLAY_CHARGE_SOURCES = new Set([
  "standard_generate",
  "unlimited_generate",
  "intercepted_generate",
]);

const NOISE_OVERLAY_SOURCES = new Set([
  "document_capture",
  "document_submit",
  "form_submit",
  "enter_key",
  "network_leak",
  "direct_click",
  "direct_pointerdown",
  "direct_touchstart",
]);

function eventTime(row: HiggsfieldUsageEvent): number {
  return new Date(row.created_at || row.at || 0).getTime();
}

function featureLabel(row: HiggsfieldUsageEvent, tracking: UnifiedGenerationRow["tracking"]): string {
  if (row.model) return row.model;
  const src = String(row.source || "").trim();
  if (tracking === "network") return "Réseau /jobs API";
  if (src === "unlimited_generate") return "Unlimited Generate";
  if (src === "standard_generate") return "Standard Generate";
  if (src === "wallet_inferred") return "Wallet HF (débit détecté)";
  return src || "Generate";
}

function overlayMatchesNetwork(
  overlay: HiggsfieldUsageEvent,
  network: HiggsfieldUsageEvent
): boolean {
  const dt = Math.abs(eventTime(overlay) - eventTime(network));
  if (dt > 45000) return false;
  const oEmail = (overlay.email || "").toLowerCase();
  const nEmail = (network.email || "").toLowerCase();
  if (oEmail && nEmail && oEmail !== nEmail) return false;
  const oDelta = Number(overlay.delta) || 0;
  const nDelta = Number(network.delta) || 0;
  return Math.abs(oDelta - nDelta) <= 2;
}

export function buildUnifiedGenerationHistory(
  rows: HiggsfieldUsageEvent[]
): UnifiedGenerationRow[] {
  const networkRows = rows.filter(
    (r) => r.source === "network_jobs_api" && (Number(r.delta) || 0) > 0
  );
  const overlayRows = rows.filter(
    (r) =>
      r.source &&
      OVERLAY_CHARGE_SOURCES.has(r.source) &&
      (Number(r.delta) || 0) > 0
  );

  const matchedOverlayIds = new Set<number>();
  const unified: UnifiedGenerationRow[] = [];

  for (const net of networkRows) {
    for (const ov of overlayRows) {
      if (ov.id != null && overlayMatchesNetwork(ov, net)) {
        matchedOverlayIds.add(ov.id);
      }
    }
    unified.push({
      id: net.id,
      email: net.email,
      delta: Number(net.delta) || 0,
      at: net.created_at || net.at || "",
      feature: featureLabel(net, "network"),
      action: "Spent",
      tracking: "network",
      model: net.model || null,
      source: net.source || null,
    });
  }

  for (const ov of overlayRows) {
    if (ov.id != null && matchedOverlayIds.has(ov.id)) continue;
    unified.push({
      id: ov.id,
      email: ov.email,
      delta: Number(ov.delta) || 0,
      at: ov.created_at || ov.at || "",
      feature: featureLabel(ov, "overlay"),
      action: "Spent",
      tracking: "overlay",
      model: ov.model || null,
      source: ov.source || null,
    });
  }

  // Wallet balance drops without a nearby network row → inferred generation
  const walletSnaps = rows
    .filter((r) => r.source === "wallet_snapshot")
    .sort((a, b) => eventTime(b) - eventTime(a));

  for (let i = 0; i < walletSnaps.length - 1; i++) {
    const newer = walletSnaps[i];
    const older = walletSnaps[i + 1];
    const keyNew = (newer.email || "").toLowerCase() || "__anon__";
    const keyOld = (older.email || "").toLowerCase() || "__anon__";
    if (keyNew !== keyOld) continue;
    const balNew = Number(newer.used_today);
    const balOld = Number(older.used_today);
    if (!Number.isFinite(balNew) || !Number.isFinite(balOld)) continue;
    const drop = balOld - balNew;
    if (drop < 0.5) continue;
    const tNew = eventTime(newer);
    const hasNetwork = networkRows.some(
      (n) =>
        Math.abs(eventTime(n) - tNew) < 90000 &&
        ((n.email || "").toLowerCase() || "__anon__") === keyNew
    );
    if (hasNetwork) continue;
    unified.push({
      email: newer.email,
      delta: Math.round(drop * 100) / 100,
      at: newer.created_at || newer.at || "",
      feature: "Wallet HF (débit détecté)",
      action: "Spent",
      tracking: "wallet_inferred",
      model: null,
      source: "wallet_inferred",
    });
  }

  return unified.sort((a, b) => eventTime(b) - eventTime(a));
}

export type LatestWalletBalance = {
  email: string | null;
  display: number | null;
  raw: number | null;
  total: number | null;
  workspaceId: string | null;
  at: string;
};

export function getLatestWalletBalances(
  rows: HiggsfieldUsageEvent[]
): LatestWalletBalance[] {
  const snaps = rows
    .filter((r) => r.source === "wallet_snapshot")
    .sort((a, b) => eventTime(b) - eventTime(a));
  const byKey = new Map<string, LatestWalletBalance>();
  for (const s of snaps) {
    const key = (s.email || "").toLowerCase() || "__latest__";
    if (byKey.has(key)) continue;
    byKey.set(key, {
      email: s.email,
      display:
        s.used_today != null && !Number.isNaN(Number(s.used_today))
          ? Number(s.used_today)
          : null,
      raw:
        s.hf_cost_raw != null && !Number.isNaN(Number(s.hf_cost_raw))
          ? Number(s.hf_cost_raw)
          : null,
      total:
        s.comparison_delta != null && !Number.isNaN(Number(s.comparison_delta))
          ? Number(s.comparison_delta)
          : null,
      workspaceId: s.comparison_source || null,
      at: s.created_at || s.at || "",
    });
  }
  return Array.from(byKey.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly / discrepancy detection (Signaux)
// ─────────────────────────────────────────────────────────────────────────────

export type HiggsfieldAnomaly = {
  type:
    | "not_tracked_by_overlay"
    | "cost_mismatch"
    | "unlim_but_charged"
    | "abuse_detected"
    | "rapid_fire"
    | "wallet_drop_untracked"
    | "noise_overlay_spam";
  severity: 'high' | 'medium' | 'low';
  email: string | null;
  hfUserId: string | null;
  model: string | null;
  at: string;
  networkDelta: number | null; // real HF cost (credit_cost from network)
  ecomDelta: number | null;    // what overlay tracked
  diff: number | null;         // ecomDelta - networkDelta (negative = undercharged)
  abuseFlags: string[];
  comparisonSource: string | null;
  description: string;
  suggestedFix: string;
};

function anomalyDescription(type: HiggsfieldAnomaly['type'], row: HiggsfieldUsageEvent): string {
  const model = row.model || 'unknown model';
  switch (type) {
    case 'not_tracked_by_overlay':
      return `Génération ${model} détectée par le réseau mais pas par l'overlay — le bouton Generate a été cliqué sans passer par notre système.`;
    case 'cost_mismatch': {
      const net = typeof row.delta === 'number' ? row.delta : '?';
      const ecom = typeof row.comparison_delta === 'number' ? (row.delta + row.comparison_delta) : '?';
      return `Coût overlay (${ecom} cr) ≠ coût réseau réel (${net} cr) pour ${model}. Écart : ${typeof row.comparison_delta === 'number' ? -row.comparison_delta : '?'} cr.`;
    }
    case 'unlim_but_charged':
      return `Génération ${model} faite en mode Unlimited alors que Higgsfield a retourné un coût > 0 (${row.hf_cost_raw != null ? row.hf_cost_raw / 100 : '?'} cr). Crédits consommés mais non décomptés.`;
    case 'abuse_detected':
      return `Comportement suspect détecté avant génération ${model} : ${row.abuse_flags || 'flags inconnus'}.`;
    case 'rapid_fire':
      return `Rapid-fire détecté : plusieurs générations en < 60s pour ${model}.`;
    case 'wallet_drop_untracked':
      return `Le wallet HF a baissé de ${row.delta} cr sans événement réseau /jobs ni overlay fiable — génération probable non trackée.`;
    case 'noise_overlay_spam':
      return `Événements overlay bruités (${row.source}) : clics multiples / listeners en double, à ignorer dans l'historique.`;
  }
}

function anomalySuggestedFix(type: HiggsfieldAnomaly['type']): string {
  switch (type) {
    case 'not_tracked_by_overlay':
      return 'Vérifier que l\'overlay est bien positionné sur ce bouton. Étendre findStandardGenerateButton() ou interceptGenerateClickBlocker() pour cette page/model.';
    case 'cost_mismatch':
      return 'Mettre à jour GENERATION_COSTS_BY_QUALITY ou améliorer readCostFromButton() pour lire le coût réel depuis le bouton HF avant de cliquer.';
    case 'unlim_but_charged':
      return 'Dans installUnlimitedButtonOverlay(), ne pas skip le décompte quand isUnlimitedMode() est true — lire le coût réseau après la réponse et décompter quand même.';
    case 'abuse_detected':
      return 'Bloquer automatiquement cet utilisateur (data-ee-block-generations=1) et examiner son historique. Ajouter une vérification captcha si le pattern persiste.';
    case 'rapid_fire':
      return 'Ajouter un cooldown de 5–10s entre les générations dans runPaidGenerationPrecheck().';
    case 'wallet_drop_untracked':
      return 'Vérifier que higgsfield_http_logger.js intercepte bien POST /jobs/* et que higgsfield_safety.js envoie network_jobs_api à l\'API.';
    case 'noise_overlay_spam':
      return 'Les débits document_capture / network_leak sont des faux positifs — l\'historique unifié les ignore déjà.';
  }
}

export function detectHiggsfieldAnomalies(rows: HiggsfieldUsageEvent[]): HiggsfieldAnomaly[] {
  const anomalies: HiggsfieldAnomaly[] = [];
  const networkRows = rows.filter(
    (r) => r.source === "network_jobs_api" || r.source === "abuse_detected"
  );

  // Wallet drop without network tracking
  const unified = buildUnifiedGenerationHistory(rows);
  for (const u of unified) {
    if (u.tracking !== "wallet_inferred") continue;
    anomalies.push({
      type: "wallet_drop_untracked",
      severity: "high",
      email: u.email,
      hfUserId: null,
      model: null,
      at: u.at,
      networkDelta: u.delta,
      ecomDelta: null,
      diff: null,
      abuseFlags: [],
      comparisonSource: "wallet_snapshot",
      description: anomalyDescription("wallet_drop_untracked", {
        email: u.email,
        delta: u.delta,
        at: u.at,
        source: "wallet_inferred",
      } as HiggsfieldUsageEvent),
      suggestedFix: anomalySuggestedFix("wallet_drop_untracked"),
    });
  }

  // Noise overlay spam (document_capture clusters)
  const noiseCounts = new Map<string, number>();
  for (const r of rows) {
    const src = String(r.source || "");
    if (!NOISE_OVERLAY_SOURCES.has(src)) continue;
    const key = `${(r.email || "").toLowerCase()}|${src}`;
    noiseCounts.set(key, (noiseCounts.get(key) || 0) + 1);
  }
  for (const [key, count] of noiseCounts) {
    if (count < 5) continue;
    const [emailPart, src] = key.split("|");
    anomalies.push({
      type: "noise_overlay_spam",
      severity: "medium",
      email: emailPart || null,
      hfUserId: null,
      model: null,
      at: new Date().toISOString(),
      networkDelta: null,
      ecomDelta: null,
      diff: null,
      abuseFlags: [],
      comparisonSource: src,
      description: anomalyDescription("noise_overlay_spam", {
        source: src,
        delta: count,
      } as HiggsfieldUsageEvent),
      suggestedFix: anomalySuggestedFix("noise_overlay_spam"),
    });
  }

  for (const row of networkRows) {
    const flags = (row.abuse_flags || '').split(',').filter(Boolean);
    const compSrc = row.comparison_source || '';
    const at = row.created_at || row.at || '';

    // Not tracked by overlay
    if (compSrc === 'not_tracked_by_overlay' || compSrc === 'no_ecom_event_found') {
      anomalies.push({
        type: 'not_tracked_by_overlay',
        severity: 'high',
        email: row.email,
        hfUserId: row.hf_user_id || null,
        model: row.model || null,
        at,
        networkDelta: row.delta,
        ecomDelta: null,
        diff: null,
        abuseFlags: flags,
        comparisonSource: compSrc,
        description: anomalyDescription('not_tracked_by_overlay', row),
        suggestedFix: anomalySuggestedFix('not_tracked_by_overlay'),
      });
    }

    // Cost mismatch between overlay estimate and real HF cost
    if (typeof row.comparison_delta === 'number' && Math.abs(row.comparison_delta) > 0.5 && compSrc && compSrc !== 'not_tracked_by_overlay' && compSrc !== 'no_ecom_event_found') {
      const ecomDelta = row.delta + row.comparison_delta; // ecom tracked ecomDelta, network tracked row.delta
      anomalies.push({
        type: 'cost_mismatch',
        severity: Math.abs(row.comparison_delta) >= 5 ? 'high' : 'medium',
        email: row.email,
        hfUserId: row.hf_user_id || null,
        model: row.model || null,
        at,
        networkDelta: row.delta,
        ecomDelta,
        diff: row.comparison_delta,
        abuseFlags: flags,
        comparisonSource: compSrc,
        description: anomalyDescription('cost_mismatch', row),
        suggestedFix: anomalySuggestedFix('cost_mismatch'),
      });
    }

    // Unlimited mode but HF charged credits
    if (flags.includes('unlim_but_hf_charged')) {
      anomalies.push({
        type: 'unlim_but_charged',
        severity: 'high',
        email: row.email,
        hfUserId: row.hf_user_id || null,
        model: row.model || null,
        at,
        networkDelta: row.delta,
        ecomDelta: 0,
        diff: -row.delta,
        abuseFlags: flags,
        comparisonSource: compSrc,
        description: anomalyDescription('unlim_but_charged', row),
        suggestedFix: anomalySuggestedFix('unlim_but_charged'),
      });
    }

    // Abuse flags (automation, rapid fire, etc.)
    const abuseCritical = flags.filter(f => f !== 'unlim_but_hf_charged');
    if (abuseCritical.length > 0 || row.source === 'abuse_detected') {
      const isRapid = abuseCritical.some(f => f.includes('rapid_fire'));
      anomalies.push({
        type: isRapid ? 'rapid_fire' : 'abuse_detected',
        severity: 'high',
        email: row.email,
        hfUserId: row.hf_user_id || null,
        model: row.model || null,
        at,
        networkDelta: row.delta,
        ecomDelta: null,
        diff: null,
        abuseFlags: abuseCritical,
        comparisonSource: compSrc,
        description: anomalyDescription(isRapid ? 'rapid_fire' : 'abuse_detected', row),
        suggestedFix: anomalySuggestedFix(isRapid ? 'rapid_fire' : 'abuse_detected'),
      });
    }
  }

  // Sort by severity then date
  const order = { high: 0, medium: 1, low: 2 };
  return anomalies.sort((a, b) => {
    const so = order[a.severity] - order[b.severity];
    if (so !== 0) return so;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
}
