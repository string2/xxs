function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function toDate(ts) {
  if (ts === null || ts === undefined || ts === '') return null;
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatDateTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return formatDate(ts) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function formatLeaveRange(item) {
  const start = formatDate(item.start_time);
  const end = formatDate(item.end_time);
  if (!start) return '-';
  const days = item.days ? Number(item.days) : 0;
  if (!end || start === end) {
    return days > 0 ? start + '（' + days + '天）' : start;
  }
  return start + ' 至 ' + end + (days > 0 ? '（' + days + '天）' : '');
}

module.exports = {
  formatDate,
  formatDateTime,
  formatLeaveRange
};
