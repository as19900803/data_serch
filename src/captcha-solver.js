import { createWorker } from 'tesseract.js';

export async function solveCaptcha({ page, application }) {
  console.log("正在解析圖形驗證碼...");
  
  // 1. 抓取驗證碼圖片的元素 (請把 #captcha-img 換成監理站實際的圖片選取器)
  const captchaElement = await page.waitForSelector('#pickimg1');
  
  // 2. 將圖片截圖並轉成 Base64
  const imageBuffer = await captchaElement.screenshot();
  
  // 3. 使用 Tesseract 辨識
  const worker = await createWorker('eng'); // 如果是數字+英文，載入英文模型
  const { data: { text } } = await worker.recognize(imageBuffer);
  await worker.terminate();

  // 4. 清理辨識出來的文字 (去除空白與換行)
  const resultText = text.replace(/[^a-zA-Z0-9]/g, '');
  console.log(`AI 辨識結果：${resultText}`);
  
  return resultText;
}







