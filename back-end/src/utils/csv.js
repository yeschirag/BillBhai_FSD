// Minimal CSV parsing for the product bulk-import endpoint. Deliberately
// dependency-free: supports quoted fields, escaped quotes (""), commas and
// newlines inside quotes, CRLF, and a trailing newline.

/**
 * Parse CSV text into an array of rows (arrays of string cells).
 * The first row is the caller's concern — this returns every physical row.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    // Skip fully empty lines (e.g. blank line before EOF).
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushCell();
    } else if (char === '\n' || char === '\r') {
      pushCell();
      pushRow();
      if (char === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      cell += char;
    }
    i += 1;
  }
  if (cell !== '' || row.length) {
    pushCell();
    pushRow();
  }
  return rows;
}

module.exports = { parseCsv };
