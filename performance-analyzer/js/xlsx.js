/* Praxis — dependency-free .xlsx writer.
   Builds a minimal, spec-valid OOXML workbook (Content_Types, rels, workbook.xml,
   one sheetN.xml per sheet) and zips it with the STORE (uncompressed) method so
   the whole thing works with nothing but the browser's built-in APIs — no
   SheetJS or other library, consistent with the rest of this project. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function textToBytes(str) {
  return new TextEncoder().encode(str);
}

function pushU16(arr, v) { arr.push(v & 0xFF, (v >>> 8) & 0xFF); }
function pushU32(arr, v) {
  arr.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF);
}
function pushBytes(arr, bytes) { for (let i = 0; i < bytes.length; i++) arr.push(bytes[i]); }

function xmlEscape(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function colLetter(index) {
  let n = index + 1, s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/* Builds a ZIP archive (store method, no compression) from [{name, data:Uint8Array}] */
function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((now.getSeconds() >> 1) & 0x1F);
  const dosDate = (((now.getFullYear() - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0xF) << 5) | (now.getDate() & 0x1F);

  files.forEach(file => {
    const nameBytes = textToBytes(file.name);
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    const local = [];
    pushU32(local, 0x04034b50);
    pushU16(local, 20);
    pushU16(local, 0);
    pushU16(local, 0);
    pushU16(local, dosTime);
    pushU16(local, dosDate);
    pushU32(local, crc);
    pushU32(local, size);
    pushU32(local, size);
    pushU16(local, nameBytes.length);
    pushU16(local, 0);
    pushBytes(local, nameBytes);
    const localHeader = Uint8Array.from(local);

    const localEntry = new Uint8Array(localHeader.length + data.length);
    localEntry.set(localHeader, 0);
    localEntry.set(data, localHeader.length);
    localParts.push(localEntry);

    const central = [];
    pushU32(central, 0x02014b50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, dosTime);
    pushU16(central, dosDate);
    pushU32(central, crc);
    pushU32(central, size);
    pushU32(central, size);
    pushU16(central, nameBytes.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, offset);
    pushBytes(central, nameBytes);
    centralParts.push(Uint8Array.from(central));

    offset += localEntry.length;
  });

  const centralStart = offset;
  let centralSize = 0;
  centralParts.forEach(p => { centralSize += p.length; });

  const end = [];
  pushU32(end, 0x06054b50);
  pushU16(end, 0);
  pushU16(end, 0);
  pushU16(end, files.length);
  pushU16(end, files.length);
  pushU32(end, centralSize);
  pushU32(end, centralStart);
  pushU16(end, 0);
  const endRecord = Uint8Array.from(end);

  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function sheetXml(rows) {
  const rowsXml = rows.map((row, ri) => {
    const cells = row.map((val, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`;
      if (val === null || val === undefined || val === "") return "";
      if (typeof val === "number" && Number.isFinite(val)) {
        return `<c r="${ref}"><v>${val}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
    }).join("");
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`;
}

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
}

function workbookXml(sheetNames) {
  const entries = sheetNames.map((name, i) =>
    `<sheet name="${xmlEscape(sanitizeSheetName(name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${entries}</sheets></workbook>`;
}

function workbookRelsXml(sheetCount) {
  const sheetRels = Array.from({ length: sheetCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheetRels +
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
}

function contentTypesXml(sheetCount) {
  const overrides = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    overrides +
    `</Types>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
    `<borders count="1"><border/></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
}

/**
 * sheets: [{ name: "Sheet Name", rows: [[cellValues...], ...] }]
 * Triggers a browser download of a real .xlsx file.
 */
function downloadWorkbook(filename, sheets) {
  const files = [
    { name: "[Content_Types].xml", data: textToBytes(contentTypesXml(sheets.length)) },
    { name: "_rels/.rels", data: textToBytes(rootRelsXml()) },
    { name: "xl/workbook.xml", data: textToBytes(workbookXml(sheets.map(s => s.name))) },
    { name: "xl/_rels/workbook.xml.rels", data: textToBytes(workbookRelsXml(sheets.length)) },
    { name: "xl/styles.xml", data: textToBytes(stylesXml()) }
  ];
  sheets.forEach((sheet, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: textToBytes(sheetXml(sheet.rows)) });
  });

  const blob = buildZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
