const api = require('../../utils/api');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDate(y, m, d) {
  return y + '-' + pad(m) + '-' + pad(d);
}

function todayStr() {
  const t = new Date();
  return formatDate(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

Page({
  data: {
    types: [{ k: 'affair', name: '事假' }, { k: 'sick', name: '病假' }],
    leave_type: 'affair',
    typeName: '事假',
    reason: '',
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    calendarExpanded: false,
    calendarYear: 0,
    calendarMonth: 0,
    calendarTitle: '',
    calendarDays: [],
    weekDays: [],
    selectedDates: [],
    dateSummary: '请点击选择请假日期，可多选'
  },
  onLoad() {
    const t = new Date();
    this.setData({
      calendarYear: t.getFullYear(),
      calendarMonth: t.getMonth() + 1
    });
    this.refreshDates();
  },
  onType(e) {
    const t = this.data.types[e.detail.value];
    this.setData({ leave_type: t.k, typeName: t.name });
  },
  onReason(e) {
    this.setData({ reason: e.detail.value });
  },
  buildWeekStrip() {
    const selectedSet = {};
    this.data.selectedDates.forEach(d => { selectedSet[d] = true; });
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const items = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const date = formatDate(y, m, day);
      let sub = weekNames[d.getDay()];
      if (i === 0) sub = '今天';
      else if (i === 1) sub = '明天';
      items.push({
        date,
        day,
        md: pad(m) + '-' + pad(day),
        sub,
        selected: !!selectedSet[date]
      });
    }
    this.setData({ weekDays: items });
  },
  buildCalendar() {
    const { calendarYear, calendarMonth, selectedDates } = this.data;
    const selectedSet = {};
    selectedDates.forEach(d => { selectedSet[d] = true; });
    const today = todayStr();

    const first = new Date(calendarYear, calendarMonth - 1, 1);
    const firstWd = first.getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const prevMonthDays = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstWd; i++) {
      cells.push({ key: 'p' + i, type: 'blank', date: '', day: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = formatDate(calendarYear, calendarMonth, d);
      const disabled = date < today;
      cells.push({
        key: date,
        type: disabled ? 'disabled' : 'day',
        date,
        day: d,
        selected: !!selectedSet[date]
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: 'n' + cells.length, type: 'blank', date: '', day: '' });
    }

    this.setData({
      calendarDays: cells,
      calendarTitle: calendarYear + '年' + calendarMonth + '月'
    });
  },
  refreshDates() {
    this.buildWeekStrip();
    if (this.data.calendarExpanded) {
      this.buildCalendar();
    }
  },
  updateSummary(selectedDates) {
    let dateSummary = '请点击选择请假日期，可多选';
    if (selectedDates.length === 1) {
      dateSummary = '已选 1 天：' + selectedDates[0];
    } else if (selectedDates.length > 1) {
      dateSummary = '已选 ' + selectedDates.length + ' 天：' + selectedDates[0] + ' 至 ' + selectedDates[selectedDates.length - 1];
    }
    this.setData({ selectedDates, dateSummary }, () => this.refreshDates());
  },
  toggleCalendar() {
    const calendarExpanded = !this.data.calendarExpanded;
    this.setData({ calendarExpanded }, () => {
      if (calendarExpanded) this.buildCalendar();
    });
  },
  toggleDate(e) {
    const { date, type } = e.currentTarget.dataset;
    if (type !== 'day' || !date) return;
    let selected = this.data.selectedDates.slice();
    const idx = selected.indexOf(date);
    if (idx === -1) {
      selected.push(date);
    } else {
      selected.splice(idx, 1);
    }
    selected.sort();
    this.updateSummary(selected);
  },
  pickToday() {
    const d = todayStr();
    this.updateSummary([d]);
  },
  clearDates() {
    this.updateSummary([]);
  },
  prevMonth() {
    let y = this.data.calendarYear;
    let m = this.data.calendarMonth - 1;
    if (m < 1) { m = 12; y--; }
    this.setData({ calendarYear: y, calendarMonth: m }, () => this.buildCalendar());
  },
  nextMonth() {
    let y = this.data.calendarYear;
    let m = this.data.calendarMonth + 1;
    if (m > 12) { m = 1; y++; }
    this.setData({ calendarYear: y, calendarMonth: m }, () => this.buildCalendar());
  },
  submit() {
    const { leave_type, reason, selectedDates } = this.data;
    if (!reason) {
      wx.showToast({ title: '请填写请假原因', icon: 'none' });
      return;
    }
    if (!selectedDates.length) {
      wx.showToast({ title: '请选择请假日期', icon: 'none' });
      return;
    }
    const sorted = selectedDates.slice().sort();
    api.post('/api/leave/apply', {
      leave_type,
      reason,
      leave_dates: sorted.join(','),
      start_time: sorted[0] + ' 08:00:00',
      end_time: sorted[sorted.length - 1] + ' 18:00:00'
    }).then(() => {
      wx.showToast({ title: '已提交' });
      setTimeout(() => wx.navigateBack(), 500);
    }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
  }
});
