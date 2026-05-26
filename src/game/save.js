export const SAVE_VERSION = 1;
export const RUN_SAVE_KEY = "riichi-rogue:run:v1";
export const STATS_SAVE_KEY = "riichi-rogue:stats:v1";
export const MAX_RECENT_RUNS = 20;

const savableStatuses = new Set(["startReward", "playing", "shop", "lost", "won"]);
const terminalStatuses = new Set(["lost", "won"]);

export function loadRunSave(storage = getDefaultStorage()) {
  if (!storage) return null;
  try {
    return validateRunSave(JSON.parse(storage.getItem(RUN_SAVE_KEY)));
  } catch {
    return null;
  }
}

export function saveRunState(state, storage = getDefaultStorage()) {
  if (!storage || !shouldSaveRunState(state)) return false;
  const payload = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: sanitizeStateForSave(state),
  };
  storage.setItem(RUN_SAVE_KEY, JSON.stringify(payload));
  return true;
}

export function clearRunSave(storage = getDefaultStorage()) {
  storage?.removeItem(RUN_SAVE_KEY);
}

export function canResumeRun(saved) {
  return Boolean(validateRunSave(saved));
}

export function restoreSavedState(saved) {
  return validateRunSave(saved)?.state ?? null;
}

export function sanitizeStateForSave(state) {
  return JSON.parse(JSON.stringify(state));
}

export function shouldSaveRunState(state) {
  return state?.mode === "main" && savableStatuses.has(state.status);
}

export function loadStats(storage = getDefaultStorage()) {
  if (!storage) return emptyStats();
  try {
    return normalizeStats(JSON.parse(storage.getItem(STATS_SAVE_KEY)));
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats, storage = getDefaultStorage()) {
  if (!storage) return false;
  storage.setItem(STATS_SAVE_KEY, JSON.stringify(normalizeStats(stats)));
  return true;
}

export function recordCompletedRun(state, storage = getDefaultStorage()) {
  if (!terminalStatuses.has(state?.status) || state.run?.recordedAt) return state;
  const completedAt = new Date().toISOString();
  const completedState = {
    ...state,
    run: {
      ...(state.run ?? {}),
      completedAt,
      recordedAt: completedAt,
      result: state.status,
    },
  };
  saveStats(addRunToStats(loadStats(storage), completedState), storage);
  saveRunState(completedState, storage);
  return completedState;
}

export function addRunToStats(stats, state) {
  const normalized = normalizeStats(stats);
  const runSummary = createRunSummary(state);
  const bestScore = Math.max(normalized.bestScore, runSummary.bestScore);
  const bestRound = Math.max(normalized.bestRound, runSummary.roundReached);
  return {
    ...normalized,
    totalRuns: normalized.totalRuns + 1,
    wins: normalized.wins + (state.status === "won" ? 1 : 0),
    losses: normalized.losses + (state.status === "lost" ? 1 : 0),
    bestScore,
    bestRound,
    recentRuns: [runSummary, ...normalized.recentRuns].slice(0, MAX_RECENT_RUNS),
  };
}

export function createRunSummary(state) {
  const reports = state.run?.roundReports ?? [];
  const bestScore = Math.max(0, ...reports.map((report) => report.totalScore ?? 0));
  return {
    id: state.run?.id ?? null,
    seed: state.run?.seed ?? null,
    result: state.status,
    completedAt: state.run?.completedAt ?? new Date().toISOString(),
    roundReached: Math.max(0, (state.roundIndex ?? 0) + 1),
    bestScore,
    relics: (state.relics ?? []).map((item) => item.id),
    augments: (state.augments ?? []).map((item) => item.id),
  };
}

function validateRunSave(saved) {
  if (!saved || saved.version !== SAVE_VERSION || !saved.state) return null;
  if (!shouldSaveRunState(saved.state)) return null;
  if (!Array.isArray(saved.state.hand) || !Array.isArray(saved.state.deck)) return null;
  return saved;
}

function normalizeStats(stats) {
  if (!stats || stats.version !== SAVE_VERSION) return emptyStats();
  return {
    version: SAVE_VERSION,
    totalRuns: Number(stats.totalRuns) || 0,
    wins: Number(stats.wins) || 0,
    losses: Number(stats.losses) || 0,
    bestScore: Number(stats.bestScore) || 0,
    bestRound: Number(stats.bestRound) || 0,
    recentRuns: Array.isArray(stats.recentRuns) ? stats.recentRuns.slice(0, MAX_RECENT_RUNS) : [],
  };
}

function emptyStats() {
  return {
    version: SAVE_VERSION,
    totalRuns: 0,
    wins: 0,
    losses: 0,
    bestScore: 0,
    bestRound: 0,
    recentRuns: [],
  };
}

function getDefaultStorage() {
  return globalThis.localStorage ?? null;
}
