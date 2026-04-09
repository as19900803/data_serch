import path from "path";
import { APP_CONFIG } from "./config.js";
import { createTemplateWorkbook } from "./excel.js";

const outputPath = path.resolve(APP_CONFIG.defaultInputFile);
createTemplateWorkbook(outputPath);
console.log(`已建立範本: ${outputPath}`);
