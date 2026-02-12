
export interface ParsedProduct {
    name: string;
    price: number;
    unit?: string;
    category?: string;
    description?: string;
    sku?: string;
}

export interface CSVParseResult {
    products: ParsedProduct[];
    headers: string[];
    errors: string[];
    totalRows: number;
}

export const parseProductCSV = (text: string): CSVParseResult => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
        return { products: [], headers: [], errors: ["File appears to be empty or missing headers."], totalRows: 0 };
    }

    // Remove BOM and clean headers
    const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const products: ParsedProduct[] = [];
    const errors: string[] = [];
    let totalRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (!rawLine) continue;

        totalRows++;
        const row: string[] = [];
        let inQuote = false;
        let currentCell = '';

        // CSV Parsing Logic (handling quoted commas)
        for (let char of lines[i]) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(currentCell.replace(/^"|"$/g, '').trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        row.push(currentCell.replace(/^"|"$/g, '').trim());

        if (row.length === 0) continue;

        const entry: any = {};
        headers.forEach((h, idx) => {
            const val = row[idx] || '';

            if (h.includes('name') || h.includes('title') || h.includes('product')) entry.name = val;
            else if (h.includes('price') || h.includes('cost') || h.includes('rate')) entry.price = val;
            else if (h.includes('unit')) entry.unit = val;
            else if (h.includes('category') || h.includes('type')) entry.category = val;
            else if (h.includes('desc')) entry.description = val;
            else if (h.includes('code') || h.includes('sku')) entry.sku = val;
        });

        // Validation
        const name = entry.name;
        // Strip currency symbols and parse
        const rawPrice = entry.price ? String(entry.price).replace(/[^0-9.-]+/g, '') : '0';
        const price = parseFloat(rawPrice);

        if (name && !isNaN(price)) {
            products.push({
                name,
                price,
                unit: entry.unit,
                category: entry.category,
                description: entry.description,
                sku: entry.sku
            });
        } else {
            if (!name) errors.push(`Row ${i + 1}: Missing Product Name`);
            if (isNaN(price)) errors.push(`Row ${i + 1}: Invalid Price '${entry.price}'`);
        }
    }

    return { products, headers, errors, totalRows };
};
