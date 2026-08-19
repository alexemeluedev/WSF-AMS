export const exportToCSV = (data, headers, filename = "export.csv") => {
  if (!data || !data.length) return;

  // 1. Build CSV Rows starting with headers array layout string
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const escapeValue = ("" + (row[header] || "")).replace(/"/g, '\\"'); // Escape internal double quotes
      return `"${escapeValue}"`; // Wrap elements safely in string strings
    });
    csvRows.push(values.join(","));
  }

  // 2. Build explicit Blob file and trigger anchor click download simulation
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
