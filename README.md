# 監理站汽燃費查詢工具

這個專案已先把整體流程架好：

1. 從 Excel 讀入申請資料
2. 用 Playwright 開啟監理服務網查詢頁面
3. 自動填入身分證字號與出生年月日
4. 預留 `src/captcha-solver.js` 作為驗證碼求解接點
5. 解析查詢結果
6. 匯出成 Excel

## 安裝

```powershell
npm install
```

## 建立輸入範本

```powershell
npm run template
```

會建立：

`input/applications.xlsx`

欄位如下：

- `身分證字號`
- `出生年月日`

生日格式請使用民國 `YYYMMDD`，例如：`0790803`

## 執行查詢

```powershell
npm run check
```

或指定輸入檔：

```powershell
node src/check-fee.js --input input/applications.xlsx
```

## 驗證碼模組

請在 `src/captcha-solver.js` 實作：

```js
export async function solveCaptcha({ page, application }) {
  return "你的驗證碼結果";
}
```

目前預設會直接丟出錯誤，避免誤以為已完成驗證碼流程。

## 輸出內容

結果會輸出到 `output/`，包含三張工作表：

- `公路養管費`
- `逾期罰鍰`
- `查詢摘要`

## 注意

監理站頁面若改版，表格欄位或按鈕選擇器可能需要調整，主要集中在：

- `src/config.js`
- `src/mvdis-client.js`
