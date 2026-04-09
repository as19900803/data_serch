import fs from "fs";
import path from "path";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function rocToMinguoCompact(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).trim().replace(/[^\d]/g, "");
  if (raw.length === 7) {
    return raw;
  }

  if (raw.length === 8 && raw.startsWith("19")) {
    const year = String(Number(raw.slice(0, 4)) - 1911).padStart(3, "0");
    return `${year}${raw.slice(4)}`;
  }

  throw new Error(`出生年月日格式不正確: ${value}`);
}

export function normalizeIdNo(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function timestampForFile(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ];

  return parts.join("");
}

export function resolveBrowserExecutable(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function writeTextFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

export function flattenText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
