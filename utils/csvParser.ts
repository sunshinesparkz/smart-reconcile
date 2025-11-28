// Parse CSV handling quoted fields with commas
export const parseCSV = <T>(csvText: string): T[] => {
  const lines = csvText.split('\n');
  const headers = lines[0].trim().split(',').map(h => h.trim());
  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: any = {};
    let currentField = '';
    let inQuotes = false;
    let fieldIndex = 0;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        const header = headers[fieldIndex];
        if (header) {
             // clean up quotes and commas for numeric fields during raw assignment if needed
             // but here we keep the string 'raw'
             row[header] = currentField.replace(/^"|"$/g, '').trim(); 
        }
        currentField = '';
        fieldIndex++;
      } else {
        currentField += char;
      }
    }
    // Last field
    const header = headers[fieldIndex];
    if (header) {
        row[header] = currentField.replace(/^"|"$/g, '').trim();
    }

    result.push(row as T);
  }
  return result;
};

// Helper to convert "1,234.56" to 1234.56
export const parseNumber = (str: string): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, ''));
};