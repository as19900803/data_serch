import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { ensureDir } from "./utils.js";
import { FUEL_FEE_HEADERS, INPUT_HEADERS, PENALTY_HEADERS } from "./schema.js";

export function createTemplateWorkbook(outputPath) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([INPUT_HEADERS, ["E123715714", "0790803"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, "申請資料");
  ensureDir(path.dirname(outputPath));
  XLSX.writeFile(workbook, outputPath);
}

export function readApplications(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`找不到輸入檔案: ${inputPath}`);
  }

  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function writeResultsWorkbook(outputPath, results) {
  const workbook = XLSX.utils.book_new();
  const fuelSheet = XLSX.utils.json_to_sheet(results.fuelFeeRows, { header: FUEL_FEE_HEADERS });
  const penaltySheet = XLSX.utils.json_to_sheet(results.penaltyRows, { header: PENALTY_HEADERS });
  const summarySheet = XLSX.utils.json_to_sheet(results.summaryRows);

  XLSX.utils.book_append_sheet(workbook, fuelSheet, "公路養管費");
  XLSX.utils.book_append_sheet(workbook, penaltySheet, "逾期罰鍰");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "查詢摘要");

  ensureDir(path.dirname(outputPath));
  XLSX.writeFile(workbook, outputPath);
}
