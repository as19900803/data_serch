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
        await Promise.all([
          page.waitForLoadState("networkidle"),
          page.locator(APP_CONFIG.selectors.submitButton).first().click()
        ]);

        const tables = await page.locator(APP_CONFIG.selectors.pageTables).evaluateAll((nodes) =>
          nodes.map((node) =>
            Array.from(node.querySelectorAll("tr")).map((row) =>
              Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent || "")
            )
          )
        );

        const pageText = flattenText(await page.textContent("body"));
        return buildResultFromTables(application, tables, pageText);
      } catch (error) {
        return emptyResult(application, "失敗", error.message);
      } finally {
        await page.close();
      }
    }
  };
}

function buildResultFromTables(application, tables, pageText) {
  const result = emptyResult(application, "成功");

  for (const table of tables) {
    const normalized = table
      .map((row) => row.map((cell) => flattenText(cell)))
      .filter((row) => row.some(Boolean));

    const header = normalized[0] ?? [];
    const body = normalized.slice(1);

    if (matchesHeader(header, ["車種", "車號", "期別", "繳納期限", "監理單位", "待繳金額", "備註"])) {
      result.fuelFeeRows.push(
        ...body.map((row) => ({
          車種: row[0] ?? "",
          車號: row[1] ?? "",
          期別: row[2] ?? "",
          繳納期限: row[3] ?? "",
          監理單位: row[4] ?? "",
          待繳金額: row[5] ?? "",
          備註: row[6] ?? ""
        }))
      );
    }

    if (matchesHeader(header, ["車號", "單號", "監理單位", "繳納罰鍰期限", "罰鍰", "備註"])) {
      result.penaltyRows.push(
        ...body.map((row) => ({
          車號: row[0] ?? "",
          單號: row[1] ?? "",
          監理單位: row[2] ?? "",
          繳納罰鍰期限: row[3] ?? "",
          罰鍰: row[4] ?? "",
          備註: row[5] ?? ""
        }))
      );
    }
  }

  if (!result.fuelFeeRows.length && !result.penaltyRows.length && pageText.includes("驗證碼")) {
    result.status = "待確認";
    result.errorMessage = "查無可解析表格，請確認頁面是否改版，或補上 captcha solver。";
  }

  return result;
}

function matchesHeader(actual, expected) {
  if (actual.length < expected.length) {
    return false;
  }

  return expected.every((label, index) => (actual[index] ?? "").includes(label));
}
