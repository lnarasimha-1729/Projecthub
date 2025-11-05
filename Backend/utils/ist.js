// utils/ist.js
function getISTDateString(date = new Date()) {
  // produce YYYY-MM-DD for Asia/Kolkata without depending on server timezone
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value.padStart(2, '0');
  const day = parts.find(p => p.type === 'day').value.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default getISTDateString;
