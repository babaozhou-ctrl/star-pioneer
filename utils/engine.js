// 游戏引擎 - 100体力 + 时间恢复

function GameEngine() {
  this.maxStamina = 100;
  this.reset();
}

GameEngine.prototype.reset = function() {
  this.stamina = 100;
  this.energy = 0;
  this.sanity = 50;
  this.signal = 0;
  this.day = 1;
  this.flags = {};
  this.ending = '';
  this.currentPlanet = '';
  this.unlockedLore = [];
  this.lastSaveTime = Date.now();
};

GameEngine.prototype.hasFlag = function(f) {
  return this.flags[f] === true;
};

GameEngine.prototype.setFlag = function(f) {
  if (!f) return;
  this.flags[f] = true;
  if (f.indexOf('lore_') === 0) {
    if (this.unlockedLore.indexOf(f) < 0) this.unlockedLore.push(f);
  }
};

GameEngine.prototype.applyFx = function(fx) {
  if (!fx) return;
  if (fx.nrg) this.energy += fx.nrg;
  if (fx.san) this.sanity = Math.max(0, Math.min(100, this.sanity + fx.san));
  if (fx.sig) this.signal += fx.sig;
  if (fx.sta) this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina + fx.sta));
};

GameEngine.prototype.recoverStamina = function() {
  var now = Date.now();
  var elapsed = now - this.lastSaveTime;
  var recovered = Math.floor(elapsed / (5 * 60 * 1000));
  if (recovered > 0) {
    this.stamina = Math.min(this.maxStamina, this.stamina + recovered);
    this.lastSaveTime = now - (elapsed % (5 * 60 * 1000));
  }
};

GameEngine.prototype.getTimeToFull = function() {
  if (this.stamina >= this.maxStamina) return 0;
  return (this.maxStamina - this.stamina) * 5;
};

GameEngine.prototype.isPlanetCompleted = function(id) {
  return this.flags['completed_' + id] === true;
};

GameEngine.prototype.resolveEnding = function() {
  if (this.hasFlag('hidden_ending') || (this.hasFlag('native_trust') && this.hasFlag('core_share'))) {
    this.ending = '星际共鸣（隐藏结局）';
  } else if (this.hasFlag('destroyed_native') && this.energy >= 10) {
    this.ending = '掠夺者';
  } else if (this.hasFlag('spared_native') || this.hasFlag('core_share')) {
    this.ending = '桥梁';
  } else {
    this.ending = '过客';
  }
};

GameEngine.prototype.getLogText = function() {
  var l = '第' + this.day + '天 | 能源:' + this.energy + ' 理智:' + this.sanity + '\n\n';
  var items = [
    [this.hasFlag('found_pioneer'), 'P-0917先遗骸'],
    [this.hasFlag('has_diary'), 'P-0917日志'],
    [this.hasFlag('met_native'), '原住民'],
    [this.hasFlag('spared_native'), '建立联系'],
    [this.hasFlag('learned_symbols'), '学会符号'],
    [this.hasFlag('native_trust'), '获得信任'],
    [this.hasFlag('found_core'), '能源核心'],
    [this.hasFlag('core_share'), '共享核心'],
    [this.hasFlag('destroyed_native'), '驱散原住民']
  ].filter(function(f) { return f[0]; }).map(function(f) { return f[1]; });
  l += items.length ? items.join('\n') : '暂无发现';
  return l;
};

GameEngine.prototype.getDiscoveries = function() {
  return [
    [this.hasFlag('found_pioneer'), '先锋遗骸'],
    [this.hasFlag('has_diary'), '阅读日志'],
    [this.hasFlag('met_native'), '遇到原住民'],
    [this.hasFlag('spared_native'), '建立联系'],
    [this.hasFlag('learned_symbols'), '学会符号'],
    [this.hasFlag('native_trust'), '获得信任'],
    [this.hasFlag('found_core'), '发现核心'],
    [this.hasFlag('core_share'), '共享核心'],
    [this.hasFlag('destroyed_native'), '驱散原住民']
  ].filter(function(f) { return f[0]; }).map(function(f) { return f[1]; });
};

GameEngine.prototype.save = function() {
  this.lastSaveTime = Date.now();
  try {
    wx.setStorageSync('sp_save', {
      stamina: this.stamina, energy: this.energy, sanity: this.sanity,
      signal: this.signal, day: this.day, flags: this.flags,
      ending: this.ending, currentPlanet: this.currentPlanet,
      unlockedLore: this.unlockedLore, lastSaveTime: this.lastSaveTime
    });
  } catch(e) {}
};

GameEngine.prototype.load = function() {
  try {
    var d = wx.getStorageSync('sp_save');
    if (d) {
      this.stamina = d.stamina !== undefined ? d.stamina : 100;
      this.energy = d.energy || 0;
      this.sanity = d.sanity || 50;
      this.signal = d.signal || 0;
      this.day = d.day || 1;
      this.flags = d.flags || {};
      this.ending = d.ending || '';
      this.currentPlanet = d.currentPlanet || '';
      this.unlockedLore = d.unlockedLore || [];
      this.lastSaveTime = d.lastSaveTime || Date.now();
      this.recoverStamina();
      return true;
    }
  } catch(e) {}
  return false;
};

module.exports = GameEngine;