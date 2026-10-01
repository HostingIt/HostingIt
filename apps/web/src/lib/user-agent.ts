/** Tiny, dependency-free user-agent summary for activity logs. */

export type DeviceKind = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export interface UserAgentInfo {
  browser: string | null;
  os: string | null;
  device: DeviceKind;
  /** e.g. "Chrome on macOS", "curl", "Unknown device" */
  label: string;
}

const CLIENTS: Array<[RegExp, string]> = [
  [/GitHub-Hookshot/i, "GitHub webhook"],
  [/^curl\//i, "curl"],
  [/^Wget\//i, "Wget"],
  [/python-requests|aiohttp|httpx/i, "Python client"],
  [/PostmanRuntime/i, "Postman"],
  [/Go-http-client/i, "Go client"],
  [/okhttp/i, "OkHttp"],
  [/node-fetch|undici|axios/i, "Node client"],
  [/bot|crawler|spider|slurp/i, "Bot"],
];

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/CriOS\//, "Chrome"],
  [/Brave\//, "Brave"],
  [/Chrome\/|Chromium\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows NT/, "Windows"],
  [/iPhone|iPod/, "iOS"],
  [/iPad/, "iPadOS"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

function firstMatch(ua: string, rules: Array<[RegExp, string]>): string | null {
  for (const [re, name] of rules) {
    if (re.test(ua)) return name;
  }
  return null;
}

export function describeUserAgent(raw: string | null | undefined): UserAgentInfo {
  const ua = raw?.trim() ?? "";
  if (!ua) {
    return { browser: null, os: null, device: "unknown", label: "Unknown device" };
  }

  const client = firstMatch(ua, CLIENTS);
  if (client) {
    return { browser: client, os: null, device: "bot", label: client };
  }

  const browser = firstMatch(ua, BROWSERS);
  const os = firstMatch(ua, SYSTEMS);

  let device: DeviceKind = "desktop";
  if (/iPad|Tablet/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    device = "tablet";
  } else if (/Mobi|iPhone|iPod/.test(ua)) {
    device = "mobile";
  } else if (!browser && !os) {
    device = "unknown";
  }

  const label =
    browser && os
      ? `${browser} on ${os}`
      : browser ?? os ?? "Unknown device";

  return { browser, os, device, label };
}
