const api = require('../../utils/api');

Page({
  data: {
    pageTitle: '宿舍楼查寝',
    buildingName: '',
    floors: [],
    currentFloor: 1,
    rooms: [],
    batchMode: false,
    selectedCount: 0,
    allSelected: false
  },
  onShow() {
    this.loadLayout(this.data.currentFloor);
  },
  loadLayout(floor) {
    const params = {};
    if (floor) params.floor = floor;
    api.get('/api/dorm/layout', params).then(d => {
      const floors = (d.floors || []).map(Number);
      const currentFloor = Number(d.current_floor || (floors[0] || 1));
      const building = d.building || {};
      const buildingName = building.name || '';
      const rooms = (d.rooms || []).map(r => Object.assign({}, r, { selected: false }));
      this.setData({
        pageTitle: buildingName ? ('宿舍楼查寝（' + buildingName + '）') : '宿舍楼查寝',
        buildingName,
        floors,
        currentFloor,
        rooms,
        selectedCount: 0,
        allSelected: false
      });
    }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
  },
  switchFloor(e) {
    const floor = Number(e.currentTarget.dataset.floor);
    if (floor === this.data.currentFloor) return;
    this.setData({ currentFloor: floor, batchMode: false });
    this.loadLayout(floor);
  },
  toggleBatchMode() {
    const batchMode = !this.data.batchMode;
    const rooms = this.data.rooms.map(r => Object.assign({}, r, { selected: false }));
    this.setData({
      batchMode,
      rooms,
      selectedCount: 0,
      allSelected: false
    });
  },
  onRoomTap(e) {
    if (this.data.batchMode) {
      this.toggleRoom(e.currentTarget.dataset.index);
      return;
    }
    this.openSingle(e.currentTarget.dataset.id, e.currentTarget.dataset.status);
  },
  toggleRoom(index) {
    const rooms = this.data.rooms.slice();
    const item = rooms[index];
    if (!item) return;
    item.selected = !item.selected;
    const selectedCount = rooms.filter(r => r.selected).length;
    this.setData({
      rooms,
      selectedCount,
      allSelected: selectedCount > 0 && selectedCount === rooms.length
    });
  },
  toggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const rooms = this.data.rooms.map(r => Object.assign({}, r, { selected: allSelected }));
    this.setData({
      rooms,
      allSelected,
      selectedCount: allSelected ? rooms.length : 0
    });
  },
  batchMark(e) {
    const result = e.currentTarget.dataset.result;
    const roomIds = this.data.rooms.filter(r => r.selected).map(r => r.room.id);
    if (!roomIds.length) {
      wx.showToast({ title: '请先选择房间', icon: 'none' });
      return;
    }
    const labels = { normal: '正常', abnormal: '异常', leave: '请假' };
    wx.showModal({
      title: '批量标记',
      content: '将 ' + roomIds.length + ' 间宿舍标记为「' + (labels[result] || result) + '」？',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '提交中', mask: true });
        const remark = result === 'abnormal' ? '异常情况' : '';
        api.post('/api/dorm/batchCheck', {
          room_ids: roomIds.join(','),
          result,
          remark
        }).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已批量标记' });
          this.setData({ batchMode: false });
          this.loadLayout(this.data.currentFloor);
        }).catch(m => {
          wx.hideLoading();
          wx.showToast({ title: String(m), icon: 'none' });
        });
      }
    });
  },
  openSingle(id, status) {
    const itemList = status === 'leave'
      ? ['确认有请假', '标记正常', '标记异常']
      : ['标记正常', '标记异常', '标记请假'];
    wx.showActionSheet({
      itemList,
      success: res => {
        let result = 'normal';
        if (status === 'leave') {
          result = ['leave', 'normal', 'abnormal'][res.tapIndex];
        } else {
          result = ['normal', 'abnormal', 'leave'][res.tapIndex];
        }
        const remark = result === 'abnormal' ? '异常情况' : '';
        api.post('/api/dorm/check', { room_id: id, result, remark }).then(() => {
          wx.showToast({ title: '已记录' });
          this.loadLayout(this.data.currentFloor);
        }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
      }
    });
  }
});
