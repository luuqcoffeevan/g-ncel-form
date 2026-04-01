/**
 * Google Apps Script (Web App) fix for LUUQ form slots.
 *
 * 1) Replace your current Apps Script code with this file.
 * 2) Set SPREADSHEET_ID and SHEET_NAME.
 * 3) Deploy as Web App (Execute as: Me, Access: Anyone).
 */

const SPREADSHEET_ID = "PUT_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Sayfa1";

const REQUIRED_HEADERS = [
  "TARİH",
  "AD SOYAD",
  "MESAJ",
  "HİZMET",
  "ÜRÜN KALİTESİ",
  "TEMİZLİK",
  "LAVABO TEMİZLİĞİ",
  "ORTAM",
  "DEĞERLENDİRME NOTU",
  "USER AGENT",
  "PAGE",
];

function doGet() {
  return textResponse("ok");
}

function doPost(e) {
  try {
    const raw = (e && e.parameter) || {};
    const params = normalizeParams(raw);
    const record = buildRecord(params);

    if (!record["MESAJ"]) {
      throw new Error("MESAJ_REQUIRED");
    }

    const sheet = getTargetSheet_();
    const headers = ensureHeaders_(sheet, REQUIRED_HEADERS);
    const row = headers.map((header) => record[header] || "");
    sheet.appendRow(row);

    return textResponse("ok");
  } catch (error) {
    return textResponse(`error:${error && error.message ? error.message : "UNKNOWN"}`);
  }
}

function textResponse(message) {
  return ContentService.createTextOutput(message).setMimeType(ContentService.MimeType.TEXT);
}

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(`SHEET_NOT_FOUND:${SHEET_NAME}`);
  }
  return sheet;
}

function ensureHeaders_(sheet, requiredHeaders) {
  const currentLastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0];
  const headers = current.map((v) => String(v || "").trim());
  const normalizedIndex = {};

  headers.forEach((header, idx) => {
    if (!header) return;
    normalizedIndex[normalizeHeader_(header)] = idx;
  });

  requiredHeaders.forEach((required) => {
    const key = normalizeHeader_(required);
    if (normalizedIndex[key] !== undefined) return;
    headers.push(required);
    normalizedIndex[key] = headers.length - 1;
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function buildRecord(params) {
  const now = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "Europe/Istanbul",
    "dd.MM.yyyy HH:mm:ss"
  );

  return {
    "TARİH": now,
    "AD SOYAD": pick_(params, ["ad_soyad", "adsoyad", "ad", "name"]),
    "MESAJ": pick_(params, ["mesaj", "message"]),
    "HİZMET": pick_(params, ["puan_hizmet", "hizmet", "service"]),
    "ÜRÜN KALİTESİ": pick_(params, [
      "puan_urun_kalitesi",
      "puan_ürün_kalitesi",
      "urun_kalitesi",
      "urun_kalite",
      "product_quality",
    ]),
    "TEMİZLİK": pick_(params, ["puan_temizlik", "temizlik", "cleanliness"]),
    "LAVABO TEMİZLİĞİ": pick_(params, [
      "puan_lavabo_temizligi",
      "puan_lavabo",
      "lavabo_temizligi",
      "ek_lavabo_temizligi",
      "lavabo",
      "wc_temizlik",
    ]),
    "ORTAM": pick_(params, ["puan_ortam", "ortam", "ambience"]),
    "DEĞERLENDİRME NOTU": pick_(params, ["anket_yorum", "degerlendirme_notu", "not"]),
    "USER AGENT": pick_(params, ["user_agent", "ua"]),
    "PAGE": pick_(params, ["page", "url"]),
  };
}

function normalizeParams(raw) {
  const out = {};
  Object.keys(raw).forEach((key) => {
    const norm = normalizeHeader_(key).toLowerCase();
    out[norm] = String(raw[key] || "").trim();
  });
  return out;
}

function pick_(params, aliases) {
  for (var i = 0; i < aliases.length; i += 1) {
    const key = normalizeHeader_(aliases[i]).toLowerCase();
    const value = params[key];
    if (value) return value;
  }
  return "";
}

function normalizeHeader_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
