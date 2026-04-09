export const APP_CONFIG = {
  targetUrl: "https://www.mvdis.gov.tw/m3-emv-fee/fee/fuelFee",
  defaultInputFile: "input/applications.xlsx",
  defaultOutputDir: "output",
  browserPaths: [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  ],
  selectors: {
    idNo: "#idNo",
    birthday: "#birthday",
    captchaInput: 'input[name="validateStr"]',
    submitButton: 'button[type="submit"], input[type="submit"], button:has-text("查詢")',
    pageTables: "table"
  }
};
