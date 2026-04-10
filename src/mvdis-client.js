import { chromium } from "playwright";
import { APP_CONFIG } from "./config.js";
import { flattenText, resolveBrowserExecutable } from "./utils.js";
import { solveCaptcha } from "./captcha-solver.js";

function emptyResult(application, status, errorMessage = "") {
  return {
    application,
    status,
    errorMessage,
    fuelFeeRows: [],
    penaltyRows: []
  };
}

export async function createMvdisClient() {
  const executablePath = resolveBrowserExecutable(APP_CONFIG.browserPaths);

  if (!executablePath) {
    throw new Error("找不到可用瀏覽器，請安裝 Edge 或 Chrome。");
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  return {
    async close() {
      await browser.close();
    },
    async query(application) {
      const page = await browser.newPage();

      try {
        await page.goto(APP_CONFIG.targetUrl, { waitUntil: "domcontentloaded" });
        await page.fill(APP_CONFIG.selectors.idNo, application.idNo);
        await page.fill(APP_CONFIG.selectors.birthday, application.birthday);

        const captchaValue = await solveCaptcha({
          page,
          application
        });

        await page.fill(APP_CONFIG.selectors.captchaInput, captchaValue);
        await page.click(APP_CONFIG.selectors.submitButton);

        await waitForResultPage(page);

        const sections = await page.evaluate(extractFeeSectionsFromDocument);
        const pageText = flattenText(await page.textContent("body"));
        return buildResultFromSections(application, sections, pageText);
      } catch (error) {
        return emptyResult(application, "失敗", error.message);
      } finally {
        await page.close();
      }
    }
  };
}

async function waitForResultPage(page) {
  try {
    await Promise.race([
      page.waitForURL(/\/fee\/fuelFee\/personal(?:[#?].*)?$/, { timeout: 10000 }),
      page.waitForSelector(APP_CONFIG.selectors.resultForm, { timeout: 10000 }),
      page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("h2")).some((node) =>
            (node.textContent || "").includes("公路養管費")
          ),
        { timeout: 10000 }
      )
    ]);
  } catch {
    await page.waitForLoadState("networkidle").catch(() => {});
  }
}

export function buildResultFromSections(application, sections, pageText = "") {
  const result = emptyResult(application, "成功");

  const fuelSection = findSectionByTitle(sections, "公路養管費");
  const penaltySection = findSectionByTitle(sections, "公路養管費逾期罰鍰");

  if (fuelSection) {
    result.fuelFeeRows.push(...parseFuelFeeRows(fuelSection.rows));
  }

  if (penaltySection) {
    result.penaltyRows.push(...parsePenaltyRows(penaltySection.rows));
  }

  if (!result.fuelFeeRows.length && !result.penaltyRows.length && pageText.includes("驗證碼")) {
    result.status = "待確認";
    result.errorMessage = "查無可解析表格，請確認頁面是否改版，或補上 captcha solver。";
  }

  return result;
}

function findSectionByTitle(sections, title) {
  return sections.find((section) => section.title === title);
}

function parseFuelFeeRows(rows) {
  if (!rows.length) {
    return [];
  }

  const [header, ...body] = rows;
  const normalizedHeader = header.map(flattenText);
  const hasCheckboxColumn = normalizedHeader[0] === "" && normalizedHeader[1] === "車種";
  const offset = hasCheckboxColumn ? 1 : 0;

  if (
    !matchesHeader(normalizedHeader.slice(offset), [
      "車種",
      "車號",
      "期別",
      "繳納期限",
      "監理單位",
      "待繳金額",
      "備註"
    ])
  ) {
    return [];
  }

  return body
    .map((row) => row.map(flattenText))
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      車種: row[offset] ?? "",
      車號: row[offset + 1] ?? "",
      期別: row[offset + 2] ?? "",
      繳納期限: row[offset + 3] ?? "",
      監理單位: row[offset + 4] ?? "",
      待繳金額: row[offset + 5] ?? "",
      備註: row[offset + 6] ?? ""
    }));
}

function parsePenaltyRows(rows) {
  if (!rows.length) {
    return [];
  }

  const [header, ...body] = rows;
  const normalizedHeader = header.map(flattenText);

  if (
    !matchesHeader(normalizedHeader, [
      "車號",
      "單號",
      "監理單位",
      "繳納罰鍰期限",
      "罰鍰",
      "備註"
    ])
  ) {
    return [];
  }

  const normalizedBody = body
    .map((row) => row.map(flattenText))
    .filter((row) => row.some(Boolean));

  if (
    normalizedBody.length === 1 &&
    normalizedBody[0].length === 1 &&
    normalizedBody[0][0].includes("查無須繳納之罰鍰")
  ) {
    return [];
  }

  return normalizedBody.map((row) => ({
    車號: row[0] ?? "",
    單號: row[1] ?? "",
    監理單位: row[2] ?? "",
    繳納罰鍰期限: row[3] ?? "",
    罰鍰: row[4] ?? "",
    備註: row[5] ?? ""
  }));
}

function matchesHeader(actual, expected) {
  if (actual.length < expected.length) {
    return false;
  }

  return expected.every((label, index) => (actual[index] ?? "").includes(label));
}

function extractFeeSectionsFromDocument() {
  const form = document.querySelector("#fuelFeeForm") ?? document;
  const sections = [];
  const headings = Array.from(form.querySelectorAll("h2"));

  for (const heading of headings) {
    const title = normalizeDomText(heading.textContent);
    let next = heading.nextElementSibling;
    let table = null;

    while (next) {
      if (next.tagName === "H2") {
        break;
      }

      if (next.tagName === "TABLE") {
        table = next;
        break;
      }

      table = next.querySelector?.("table") ?? null;
      if (table) {
        break;
      }

      next = next.nextElementSibling;
    }

    sections.push({
      title,
      rows: table ? extractRowsFromTable(table) : []
    });
  }

  return sections;
}

function extractRowsFromTable(table) {
  return Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) => normalizeDomText(cell.textContent))
  );
}

function normalizeDomText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
