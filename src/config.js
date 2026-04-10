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
    submitButton: "#submit_btn",
    resultForm: "#fuelFeeForm",
    fuelHeading: "h2"
  }
};
