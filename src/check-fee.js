import path from "path";
import { APP_CONFIG } from "./config.js";
import { readApplications, writeResultsWorkbook } from "./excel.js";
import { createMvdisClient } from "./mvdis-client.js";
import { normalizeIdNo, rocToMinguoCompact, timestampForFile } from "./utils.js";

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--input" && next) {
      args.input = next;
      i += 1;
    }
  }

  return args;
}

function normalizeApplications(rows) {
  return rows.map((row, index) => {
    const idNo = normalizeIdNo(row["身分證字號"]);
    const birthday = rocToMinguoCompact(row["出生年月日"]);

    if (!idNo || !birthday) {
      throw new Error(`第 ${index + 2} 列資料不完整，請確認身分證字號與出生年月日。`);
    }

    return { idNo, birthday };
  });
}

function mergeOutputRows(results) {
  const queriedAt = new Date().toLocaleString("zh-TW", { hour12: false });
  const fuelFeeRows = [];
  const penaltyRows = [];
  const summaryRows = [];

  for (const item of results) {
    summaryRows.push({
      身分證字號: item.application.idNo,
      出生年月日: item.application.birthday,
      查詢時間: queriedAt,
      查詢狀態: item.status,
      錯誤訊息: item.errorMessage
    });

    if (item.fuelFeeRows.length === 0) {
      fuelFeeRows.push({
        身分證字號: item.application.idNo,
        出生年月日: item.application.birthday,
        查詢時間: queriedAt,
        查詢狀態: item.status,
        車種: "",
        車號: "",
        期別: "",
        繳納期限: "",
        監理單位: "",
        待繳金額: "",
        備註: item.errorMessage
      });
    } else {
      for (const row of item.fuelFeeRows) {
        fuelFeeRows.push({
          身分證字號: item.application.idNo,
          出生年月日: item.application.birthday,
          查詢時間: queriedAt,
          查詢狀態: item.status,
          ...row
        });
      }
    }

    if (item.penaltyRows.length === 0) {
      penaltyRows.push({
        身分證字號: item.application.idNo,
        出生年月日: item.application.birthday,
        查詢時間: queriedAt,
        查詢狀態: item.status,
        車號: "",
        單號: "",
        監理單位: "",
        繳納罰鍰期限: "",
        罰鍰: "",
        備註: item.errorMessage
      });
    } else {
      for (const row of item.penaltyRows) {
        penaltyRows.push({
          身分證字號: item.application.idNo,
          出生年月日: item.application.birthday,
          查詢時間: queriedAt,
          查詢狀態: item.status,
          ...row
        });
      }
    }
  }

  return { fuelFeeRows, penaltyRows, summaryRows };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input ?? APP_CONFIG.defaultInputFile);
  const rows = readApplications(inputPath);
  const applications = normalizeApplications(rows);
  const client = await createMvdisClient();

  try {
    const results = [];
    for (const application of applications) {
      results.push(await client.query(application));
    }

    const outputPath = path.resolve(
      APP_CONFIG.defaultOutputDir,
      `mvdis-results-${timestampForFile()}.xlsx`
    );
    writeResultsWorkbook(outputPath, mergeOutputRows(results));
    console.log(`已輸出結果: ${outputPath}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
