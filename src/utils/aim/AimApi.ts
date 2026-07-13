import fetch, { Response } from "node-fetch";
import { randomInt } from "crypto";
import { Environment } from "../constants";
import { Logger } from "../logger";

/**
 * Client for the open-oscar-server management API
 */

export interface AimSession {
  screen_name: string;
}

export class AimApiError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`AIM management API error ${status}: ${body}`);
  }
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "CF-Access-Client-Id": Environment.aimCfAccessClientId,
    "CF-Access-Client-Secret": Environment.aimCfAccessClientSecret,
  };
}

async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = `${Environment.aimMgmtUrl}${path}`;
  const response = await fetch(url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    Logger.warn(`AimApi ${method} ${path} -> ${response.status}: ${text}`);
    throw new AimApiError(response.status, text);
  }
  return response;
}

export const AimApi = {
  async createUser(screenName: string, password: string): Promise<void> {
    await request("POST", "/user", {
      screen_name: screenName,
      password,
    });
  },

  /** 404 = already gone (e.g. deleted out-of-band) = success. */
  async deleteUser(screenName: string): Promise<void> {
    try {
      await request("DELETE", "/user", { screen_name: screenName });
    } catch (e) {
      if (e instanceof AimApiError && e.status === 404) return;
      throw e;
    }
  },

  async setPassword(screenName: string, password: string): Promise<void> {
    await request("PUT", "/user/password", {
      screen_name: screenName,
      password,
    });
  },

  // enum: deleted|expired|suspended|suspended_age; null = not suspended
  async setSuspendedStatus(screenName: string, suspended: boolean) {
    await request("PATCH", `/user/${encodeURIComponent(screenName)}/account`, {
      suspended_status: suspended ? "suspended" : null,
    });
  },

  async getSessions(): Promise<AimSession[]> {
    const res = await request("GET", "/session");
    const body = (await res.json()) as { sessions: AimSession[] };
    return body.sessions;
  },

  async isOnline(screenName: string): Promise<boolean> {
    try {
      await request("GET", `/session/${encodeURIComponent(screenName)}`);
      return true;
    } catch (e) {
      if (e instanceof AimApiError && e.status === 404) return false;
      throw e;
    }
  },

  /** Kick any live sessions for a screen name */
  async kickSessions(screenName: string): Promise<void> {
    try {
      await request("DELETE", `/session/${encodeURIComponent(screenName)}`);
    } catch (e) {
      if (e instanceof AimApiError && e.status === 404) return;
      throw e;
    }
  },
};

/**
 * Map a Discord username to an AIM screen name.
 * Discord: 2-32 chars, a-z 0-9 . _   AIM: <=16 chars, starts with a letter.
 */
export function sanitizeScreenName(displayName: string): string {
  let name = displayName
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^[0-9]/.test(name)) name = `x${name}`;
  return name.slice(0, 16).trim();
}

/** 6-16 printable ASCII chars, no spaces (AIM 5.x client limits). */
export function isValidAimPassword(password: string): boolean {
  return /^[!-~]{6,16}$/.test(password);
}

const RESERVED_PREFIXES = ["admin", "aol", "system", "mod", "seabot"];

export function isReservedScreenName(name: string): boolean {
  const canonical = name.toLowerCase().replace(/\s/g, "");
  return RESERVED_PREFIXES.some((p) => canonical.startsWith(p));
}

/** 12 chars, unambiguous alphanumerics — typable on a 2003 client. */
export function generateAimPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}
