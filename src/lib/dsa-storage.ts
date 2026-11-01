"use client";

export type DsaProblemStatus = "unsolved" | "attempted" | "solved";

const STATUS_STORAGE_KEY = "copilot_dsa_statuses_v1";
const CODE_STORAGE_KEY = "copilot_dsa_code_v1";
const PREF_LANG_KEY = "copilot_dsa_preferred_lang_v1";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getDsaStatuses(): Record<number, "solved" | "attempted"> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function setDsaStatus(problemNumber: number, status: "solved" | "attempted"): void {
  if (!isBrowser()) return;
  try {
    const statuses = getDsaStatuses();
    // Do not downgrade a solved problem to attempted
    if (statuses[problemNumber] === "solved" && status === "attempted") {
      return;
    }
    statuses[problemNumber] = status;
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
    window.dispatchEvent(new CustomEvent("copilot-dsa-status-updated", { detail: { problemNumber, status } }));
  } catch {
    // safe fallback
  }
}

export function getStoredDsaCode(problemNumber: number, language: string): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CODE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[`${problemNumber}_${language}`] || null;
  } catch {
    return null;
  }
}

export function setStoredDsaCode(problemNumber: number, language: string, code: string): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(CODE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[`${problemNumber}_${language}`] = code;
    window.localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // safe fallback
  }
}

export function getPreferredDsaLanguage(): "cpp" | "java" | "python" | "typescript" {
  if (!isBrowser()) return "python";
  try {
    const lang = window.localStorage.getItem(PREF_LANG_KEY);
    if (lang === "cpp" || lang === "java" || lang === "python" || lang === "typescript") {
      return lang;
    }
    return "python";
  } catch {
    return "python";
  }
}

export function setPreferredDsaLanguage(lang: "cpp" | "java" | "python" | "typescript"): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREF_LANG_KEY, lang);
  } catch {
    // safe fallback
  }
}

