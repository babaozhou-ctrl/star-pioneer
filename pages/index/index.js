var GameEngine = require('../../utils/engine');
var GD = require('../../utils/gamedata');

// 远程图片URL管理
var IMG = {
  bg: {
    // 星球独立背景
    rust: 'https://www.coze.cn/s/g2hnL3wCChY/',
    crystal: 'https://www.coze.cn/s/lPT8ayYQ9So/',
    silent: 'https://www.coze.cn/s/ha_4jXMGIkQ/',
    // 旧通用背景（备用）
    landing: 'https://www.coze.cn/s/jaTWRPMUJ8g/',
    ruins: 'https://www.coze.cn/s/d6g04nKsxf0/',
    cave: 'https://www.coze.cn/s/akLS5cb1huc/',
    core: 'https://www.coze.cn/s/meA23_6jxiU/',
    settlement: 'https://www.coze.cn/s/j709foaNZYg/'
  },
  char: {
    pioneer: 'https://www.coze.cn/s/pTtKwO2U3Nk/',
    native: 'https://www.coze.cn/s/qpbUBjOiOcE/',
    ai: 'https://www.coze.cn/s/lFBnmgo0D-o/'
  },
  planet: {
    rust: 'https://www.coze.cn/s/-JnbiM2H6k8/',
    crystal: 'https://www.coze.cn/s/_9s7whGM320/',
    silent: 'https://www.coze.cn/s/-KmMrnKNdsY/'
  }
};

Page({
  data: {
    screen: 'title',
    showHud: false,
    stamina: 100, maxStamina: 100,
    energy: 0, sanity: 50, signal: 0,
    timeToFull: 0,
    currentPlanet: '',
    currentBg: '',
    charLeft: '', charRight: '',
    leftActive: false, rightActive: false,
    speakerName: '', speakerClass: 'ns',
    dialogText: '', sciInfo: null,
    choices: [],
    mapLocations: [],
    planetList: [],
    planetInfo: null,
    loreList: [],
    loreDetail: null,
    starDots: [],
    dustDots: [],
    exploreDots: [],
    explorePlanet: { name: '', imgUrl: '' },
    ending: '', endingText: '', isHidden: false, discoveries: [],
    transitioning: false, transitionText: ''
  },

  engine: null,
  queue: [],
  callback: null,
  staminaTimer: null,

  onLoad: function() {
    this.engine = new GameEngine();
    // 星图背景星点
    var dots = [];
    for (var i = 0; i < 60; i++) {
      dots.push({ top: (i * 37) % 100, left: (i * 53) % 100, delay: (i % 8) * 0.3 });
    }
    // 星球详情页星尘粒子（预计算，避免wxml中使用%运算符）
    var dustDots = [];
    for (var i = 0; i < 20; i++) {
      dustDots.push({
        top: (i * 41) % 90 + 5,
        left: (i * 59) % 90 + 5,
        delay: i * 0.4
      });
    }
    // 探索页星尘粒子
    var exploreDots = [];
    for (var i = 0; i < 20; i++) {
      exploreDots.push({
        top: (i * 47) % 90 + 5,
        left: (i * 61) % 90 + 5,
        delay: i * 0.35
      });
    }
    this.setData({ starDots: dots, dustDots: dustDots, exploreDots: exploreDots });
  },

  onShow: function() {
    this.engine.recoverStamina();
    if (this.staminaTimer) clearInterval(this.staminaTimer);
    var that = this;
    this.staminaTimer = setInterval(function() {
      that.engine.recoverStamina();
      if (that.data.showHud) that.updateHud();
    }, 60000);
  },

  onHide: function() {
    if (this.staminaTimer) clearInterval(this.staminaTimer);
    this.engine.save();
  },

  onUnload: function() {
    if (this.staminaTimer) clearInterval(this.staminaTimer);
  },

  updateHud: function() {
    var e = this.engine;
    var ttf = e.getTimeToFull();
    var ttfText = '';
    if (ttf > 0) {
      var h = Math.floor(ttf / 60);
      var m = ttf % 60;
      ttfText = h > 0 ? (h + 'h' + m + 'm') : (m + 'min');
    }
    this.setData({
      stamina: e.stamina, maxStamina: e.maxStamina,
      energy: e.energy, sanity: e.sanity, signal: e.signal,
      timeToFull: ttfText
    });
  },

  startGame: function() {
    this.engine.reset();
    this.setData({ showHud: true });
    this.updateHud();
    var that = this;
    this.runScript([
      { type: 'trn', text: '先锋计划 · 第七次远征', dur: 2500 },
      { type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你醒来了。\n\n飞船的低频嗡鸣是你唯一的同伴。窗外是无尽的黑暗——不是地球夜空那种温柔的暗，是连光都不愿经过的虚无。\n\n通讯频道静默了四百三十七天。' },
      { type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你是先锋舰队第七远征组的成员。三个月前，舰队与母港失联。\n\n没有人知道你们为什么失联。没有人会来找你。\n\n你只剩下一艘伤痕累累的飞船，和三颗坐标指向的未知星球。' },
      { type: 'dlg', speaker: '舰载AI', sClass: 'na', text: '导航系统检测到三颗行星位于可达范围。\n\n舰体状态：可维持。\n补给状态：不可补充。\n\n建议：执行探索任务，收集资源，寻找归途线索。\n\n这是你唯一的选择。' },
      { type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你望向舷窗外的星图。三颗星球，三个未知。\n\n或许答案就在其中。或许只是更深的沉默。\n\n但你没有退路——你只能向前。' }
    ], function() { that.setData({ charLeft: '', charRight: '' }); that.showGalaxy(); });
  },

  // ===== 星图 =====
  showGalaxy: function() {
    var positions = {
      rust: { posTop: '28%', posLeft: '8%' },
      crystal: { posTop: '60%', posLeft: '36%' },
      silent: { posTop: '25%', posLeft: '64%' }
    };
    var planets = [];
    for (var id in GD.PLANETS) {
      var p = GD.PLANETS[id];
      var status = 'available';
      if (this.engine.isPlanetCompleted(id)) status = 'completed';
      var pos = positions[id] || { posTop: '50%', posLeft: '50%' };
      planets.push({
        id: p.id, name: p.name, subtitle: p.subtitle,
        icon: p.icon, desc: p.desc, status: status,
        imgUrl: IMG.planet[id] || IMG.planet.rust,
        posTop: pos.posTop, posLeft: pos.posLeft
      });
    }
    var loreList = [];
    var allLore = this.engine.unlockedLore || [];
    for (var i = 0; i < allLore.length; i++) {
      var key = allLore[i];
      if (GD.LORE[key]) loreList.push({ key: key, title: GD.LORE[key].title, planet: GD.LORE[key].planet });
    }
    this.setData({ screen: 'galaxy', planetList: planets, loreList: loreList, showHud: true, currentBg: '' });
    this.updateHud();
  },

  onPlanetTap: function(e) {
    var id = e.currentTarget.dataset.id;
    var status = e.currentTarget.dataset.status;
    if (status === 'locked') return;
    this.setData({ currentPlanet: id });
    this.engine.currentPlanet = id;
    this.showPlanetDetail(id);
  },

  // ===== 星球详情（沉浸式） =====
  showPlanetDetail: function(id) {
    var p = GD.PLANETS[id];
    var isCompleted = this.engine.isPlanetCompleted(id);
    var achievements = [];
    if (isCompleted) {
      achievements.push('完成探索');
    }
    var locCount = 0;
    var visitedCount = 0;
    for (var locId in GD.LOCATIONS) {
      if (GD.LOCATIONS[locId].planet === id) {
        locCount++;
        if (this.engine.hasFlag('visited_' + locId)) visitedCount++;
      }
    }
    var progress = locCount > 0 ? Math.round(visitedCount / locCount * 100) : 0;
    var dangerMap = { rust: '中等', crystal: '较高', silent: '极高' };
    var options = [];
    if (!isCompleted) {
      options.push({ text: '前往探索', action: 'explore' });
    } else {
      options.push({ text: '再次探索', action: 'explore' });
    }
    options.push({ text: '查看遗响', action: 'lore' });
    options.push({ text: '返回星图', action: 'back' });

    this.setData({
      screen: 'planetdetail',
      planetInfo: {
        id: id,
        name: p.name,
        subtitle: p.subtitle,
        imgUrl: IMG.planet[id] || IMG.planet.rust,
        progress: progress,
        danger: dangerMap[id] || '未知',
        achievements: achievements,
        options: options
      }
    });
  },

  onPlanetOption: function(e) {
    var idx = e.currentTarget.dataset.index;
    var opt = this.data.planetInfo.options[idx];
    var id = this.data.currentPlanet;
    if (opt.action === 'explore') {
      if (this.engine.isPlanetCompleted(id)) {
        this.engine.setFlag('completed_' + id);
      }
      this.enterPlanet(id);
    } else if (opt.action === 'lore') {
      this.setData({ screen: 'lore' });
    } else if (opt.action === 'back') {
      this.showGalaxy();
    }
  },

  onClosePlanetDetail: function() {
    this.showGalaxy();
  },

  showPlanetInfo: function(id) {
    var p = GD.PLANETS[id];
    this.setData({ screen: 'planetinfo', currentBg: IMG.bg[p.bg] || IMG.bg.landing });
  },

  onReExplore: function() {
    this.enterPlanet(this.data.currentPlanet);
  },

  enterPlanet: function(id) {
    this.setData({ currentBg: IMG.bg[id] || IMG.bg.rust, charRight: IMG.char.ai });
    this.updateHud();
    var p = GD.PLANETS[id];
    this.runScript([
      { type: 'bg', key: id },
      { type: 'dlg', speaker: '舰载AI', sClass: 'na', text: p.intro, sci: p.introSci },
      { type: 'dlg', speaker: '舰载AI', sClass: 'na', text: '地表扫描完成，以下是可探索区域。\n不同行动消耗不同体力，体力耗尽需返回飞船休息。' },
      { type: 'map' }
    ]);
  },

  onBackGalaxy: function() {
    this.engine.save();
    this.showGalaxy();
  },

  // ===== 深空遗响 =====
  onLoreTap: function() {
    this.setData({ screen: 'lore' });
  },

  onLoreItemTap: function(e) {
    var key = e.currentTarget.dataset.key;
    var lore = GD.LORE[key];
    if (lore) this.setData({ loreDetail: lore });
  },

  onLoreClose: function() {
    this.setData({ loreDetail: null });
  },

  // ===== 脚本引擎 =====
  runScript: function(script, cb) {
    this.queue = script.slice();
    this.callback = cb || null;
    this.nextStep();
  },

  nextStep: function() {
    if (this.queue.length === 0) {
      if (this.callback) this.callback();
      return;
    }
    var step = this.queue.shift();
    switch (step.type) {
      case 'bg':
        var bgKeyMap = {
          // 星球级
          rust: 'rust', crystal: 'crystal', silent: 'silent',
          // 锈蚀星地点 → 星球背景
          ruins: 'rust', cave: 'rust', settlement: 'rust', core: 'rust', ship: 'rust',
          // 晶渊星地点 → 星球背景
          ice_surface: 'crystal', crystal_hall: 'crystal', memory_pool: 'crystal', resonance_core: 'crystal', crystal_ship: 'crystal',
          // 寂语星地点 → 星球背景
          echo_valley: 'silent', silent_city: 'silent', freq_temple: 'silent', deep_silence: 'silent', silent_ship: 'silent'
        };
        var bgKey = bgKeyMap[step.key] || 'rust';
        this.setData({ currentBg: IMG.bg[bgKey] });
        this.nextStep();
        break;
      case 'fx':
        this.engine.applyFx(step.data);
        this.updateHud();
        this.nextStep();
        break;
      case 'flag':
        this.engine.setFlag(step.key);
        this.nextStep();
        break;
      case 'trn':
        this.doTransition(step.text, step.dur || 1500);
        break;
      case 'dlg':
        this.showDialog(step.speaker, step.sClass, step.text, step.sci);
        break;
      case 'ch':
        this.showChoices(step.opts);
        break;
      case 'map':
        this.showMap();
        break;
      case 'end':
        this.showEnding();
        break;
      case 'rest':
        this.doRest();
        break;
      case 'galaxy':
        this.engine.save();
        this.showGalaxy();
        break;
      default:
        this.nextStep();
    }
  },

  enqueue: function(script) {
    this.queue = script.concat(this.queue);
    this.nextStep();
  },

  doTransition: function(text, dur) {
    var that = this;
    this.setData({ transitioning: true, transitionText: text });
    setTimeout(function() {
      that.setData({ transitioning: false });
      that.nextStep();
    }, dur);
  },

  showDialog: function(speaker, sClass, text, sci) {
    var charKeyMap = {
      '你': 'pioneer',
      '原住民': 'native',
      '舰载AI': 'ai'
    };
    var charKey = charKeyMap[speaker] || '';
    var charLeft = IMG.char.pioneer;
    var charRight = this.data.charRight || IMG.char.ai;
    var leftActive = false;
    var rightActive = false;
    if (charKey === 'pioneer') {
      leftActive = true;
      rightActive = false;
    } else if (charKey === 'native') {
      leftActive = false;
      rightActive = true;
      charRight = IMG.char.native;
    } else if (charKey === 'ai') {
      leftActive = false;
      rightActive = true;
      charRight = IMG.char.ai;
    }
    this.setData({
      screen: 'dialog',
      speakerName: speaker || '',
      speakerClass: sClass || 'ns',
      dialogText: text || '',
      sciInfo: sci || null,
      charLeft: charLeft,
      charRight: charRight,
      leftActive: leftActive,
      rightActive: rightActive
    });
  },

  onDialogTap: function() {
    this.nextStep();
  },

  showChoices: function(opts) {
    this.setData({ screen: 'choices', choices: opts });
  },

  onChoice: function(e) {
    var idx = e.currentTarget.dataset.index;
    var opt = this.data.choices[idx];
    // 体力不足时拦截（cost > 0 且体力不够）
    if (opt.cost && opt.cost > 0 && this.engine.stamina < opt.cost) {
      this.runScript([
        { type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你的身体在抗议。体力已经不足以支撑这个行动了。\n\n你需要休息。' },
        { type: 'rest' }
      ]);
      return;
    }
    if (opt.cost) this.engine.stamina = Math.max(0, this.engine.stamina - opt.cost);
    if (opt.fx) this.engine.applyFx(opt.fx);
    if (opt.flag) this.engine.setFlag(opt.flag);
    if (opt.also) this.engine.setFlag(opt.also);
    this.updateHud();
    // 体力耗尽，强制休息
    if (this.engine.stamina <= 0) {
      this.enqueue([{ type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你耗尽了最后一丝力气。\n\n视野模糊，双腿发软。你必须回到飞船休息。' }, { type: 'rest' }]);
      return;
    }
    if (this.engine.sanity <= 0) {
      this.engine.ending = '理智崩溃';
      this.showEnding();
      return;
    }
    if (opt.then) {
      this.enqueue(opt.then);
    } else {
      this.nextStep();
    }
  },

  // ===== 探索地图（沉浸式） =====
  showMap: function() {
    var pid = this.engine.currentPlanet;
    var planetData = GD.PLANETS[pid];
    var locs = [];
    for (var id in GD.LOCATIONS) {
      var l = GD.LOCATIONS[id];
      if (l.planet !== pid) continue;
      var locked = l.lock && !this.engine.hasFlag(l.lock);
      locs.push({ id: id, icon: l.icon, name: l.name, desc: l.desc, locked: locked });
    }
    this.setData({
      screen: 'map',
      mapLocations: locs,
      showHud: true,
      explorePlanet: {
        name: planetData.name,
        imgUrl: IMG.planet[pid] || IMG.planet.rust
      }
    });
    this.updateHud();
  },

  onLocTap: function(e) {
    var id = e.currentTarget.dataset.id;
    var loc = GD.LOCATIONS[id];
    var acts = GD.ACTIONS[id] || [];
    if (loc.lock && !this.engine.hasFlag(loc.lock)) return;
    var visited = this.engine.hasFlag('visited_' + id);
    this.engine.setFlag('visited_' + id);
    var travelText = loc.travel;
    // 二次到访：描述探索后的变化
    if (visited) {
      var revisitTexts = {
        ruins: '你再次来到废墟。那些符号的光似乎比上次暗淡了些——也许是因为你带走了一些东西。\n\n空气中仍然弥漫着酸味，但已经不那么刺鼻了。像是什么东西在慢慢适应你的存在。',
        cave: '岩洞依然潮湿，但你的脚步声不再引起回响。\n\n那些被你触碰过的晶体表面留下了淡淡的指纹。在黑暗中，那些痕迹微微发光——像你的体温留在了这里。',
        settlement: '聚落区的原住民似乎对你的到来不再那么警觉了。\n\n它们的纹路在你靠近时闪了闪——不确定是欢迎还是警告。',
        core: '核心区的能量波动依然规律。但比上次更弱了一些。\n\n也许是你在上次探查中动了什么。也许它只是在衰老。',
        ship: '你又一次回到飞船。舱内的空气循环系统发出规律的嗡鸣。\n\n这是这颗星球上唯一完全属于你的空间。',
        ice_surface: '冰面上有你上次留下的脚印，已经结了新霜。\n\n但冰层下的光还在，耐心地等待。',
        crystal_hall: '晶壁回廊里，你上次触摸过的那块晶体还在微微发光。\n\n像是在等你的手指再次贴上它。',
        memory_pool: '晶体湖依然平静。但你上次搅动过的涟漪似乎还没完全消散。\n\n也许在这颗星球上，时间也流淌得慢一些。',
        resonance_core: '核心的脉动依然规律。你感觉它认得你了。\n\n像一颗心脏，不需要语言，只凭节律。',
        crystal_ship: '你回到飞船。窗外的冰原在微光中泛着淡蓝色。\n\n一切如旧。但你已经不是上次的你了。',
        echo_valley: '回声谷依然在回响。但这次，那些声音里似乎多了什么。\n\n也许是你的声音。也许是你留下的什么。',
        silent_city: '寂静城的建筑在你面前沉默伫立。\n\n上次你在这里做了什么，它们都记得。只是不会告诉你。',
        freq_temple: '圣殿的声学结构依然完好。\n\n但你上次留下的振动还在壁面上游走，像一条看不见的蛇。',
        deep_silence: '深渊还是那么深。那么安静。\n\n也许比上次更深了。因为你知道了那下面有什么。',
        silent_ship: '你回到飞船。舱门关上的瞬间，安静得让人发慌。\n\n但至少这里的安静是你自己的。'
      };
      travelText = revisitTexts[id] || '你再次来到这里。\n\n和上次相比，有些东西变了。也许是你变了。';
    }
    var script = [
      { type: 'bg', key: id },
      { type: 'dlg', speaker: '旁白', sClass: 'ns', text: travelText, sci: loc.sci }
    ];
    var that = this;
    var availableActs = acts.filter(function(a) { return !a.req || that.engine.hasFlag(a.req); });
    var choices = availableActs.map(function(a) {
      // 已执行过的行动，标注"再来一次"
      var actText = a.text;
      if (visited && that.engine.hasFlag('did_' + a.id)) {
        actText = a.text + '（再来一次）';
      }
      return { text: actText, cost: a.cost, then: that.buildActScript(id, a.id) };
    });
    choices.push({ text: '返回地图', cost: 0, then: [{ type: 'map' }] });
    script.push({ type: 'ch', opts: choices });
    this.runScript(script);
  },

  buildActScript: function(locId, actId) {
    var ev = GD.getEvent(actId, this.engine.flags);
    if (!ev) return [{ type: 'map' }];
    if (ev.isRest) return [{ type: 'rest' }];
    if (ev.isLeave) return [{ type: 'trn', text: '你启动引擎，离开轨道……', dur: 1500 }, { type: 'fx', data: { sta: 0 } }, { type: 'galaxy' }];
    if (ev.isLog) return this.buildLogScript();
    var s = [];
    // 递归展开 thenShow 链
    this._flattenEvent(ev, s);
    // 标记此行动已执行
    s.push({ type: 'flag', key: 'did_' + actId });
    return s;
  },

  _flattenEvent: function(ev, s) {
    if (!ev) return;
    // 显示当前对话
    if (ev.text || ev.tx) {
      s.push({ type: 'dlg', speaker: ev.sp || '旁白', sClass: ev.sc || 'ns', text: ev.text || ev.tx, sci: ev.sci || null });
    }
    if (ev.diary) {
      s.push({ type: 'dlg', speaker: 'P-0917 日志', sClass: 'ns', text: ev.diary });
    }
    // 应用效果
    if (ev.fx) {
      s.push({ type: 'fx', data: ev.fx });
    }
    if (ev.flag) {
      s.push({ type: 'flag', key: ev.flag });
    }
    if (ev.also) {
      s.push({ type: 'flag', key: ev.also });
    }
    // 有选项：展示选择，每个选择后续走各自叙事
    if (ev.choices) {
      var that = this;
      s.push({ type: 'ch', opts: ev.choices.map(function(c) {
        var then = [];
        if (c.fx) then.push({ type: 'fx', data: c.fx });
        if (c.flag) then.push({ type: 'flag', key: c.flag });
        if (c.also) then.push({ type: 'flag', key: c.also });
        if (c.nar) then.push({ type: 'dlg', speaker: '旁白', sClass: 'ns', text: c.nar });
        if (c.flag === 'hidden_ending') {
          then.push({ type: 'end' });
        } else {
          then.push({ type: 'map' });
        }
        return { text: c.text, cost: 0, fx: c.fx, flag: c.flag, also: c.also, then: then };
      }) });
      return; // 选项后不再自动继续
    }
    // 有 thenShow：递归展开下一层
    if (ev.thenShow) {
      this._flattenEvent(ev.thenShow, s);
      return;
    }
    // 既没有 choices 也没有 thenShow：叙事结束，返回地图
    if (ev.nar) {
      s.push({ type: 'dlg', speaker: '旁白', sClass: 'ns', text: ev.nar });
    }
    s.push({ type: 'map' });
  },

  buildLogScript: function() {
    return [
      { type: 'dlg', speaker: '航行日志', sClass: 'ns', text: this.engine.getLogText() },
      { type: 'map' }
    ];
  },

  doRest: function() {
    this.engine.stamina = Math.min(this.engine.maxStamina, this.engine.stamina + 30);
    this.engine.day++;
    this.engine.lastSaveTime = Date.now();
    this.updateHud();
    this.runScript([
      { type: 'dlg', speaker: '旁白', sClass: 'ns', text: '你回到飞船休整。体力恢复30点。\n窗外，星球的地表在暮色中泛着微光。' },
      { type: 'map' }
    ]);
  },

  showEnding: function() {
    this.engine.resolveEnding();
    var pid = this.engine.currentPlanet;
    if (!this.engine.isPlanetCompleted(pid)) {
      this.engine.setFlag('completed_' + pid);
    }
    var isHidden = this.engine.ending.indexOf('隐藏') >= 0;
    this.setData({
      screen: 'ending',
      showHud: false,
      ending: this.engine.ending,
      endingText: GD.ENDINGS[this.engine.ending] || '',
      isHidden: isHidden,
      discoveries: this.engine.getDiscoveries()
    });
    this.updateHud();
    this.engine.save();
  },

  restart: function() {
    this.engine.reset();
    this.setData({ screen: 'title', showHud: false, currentBg: '' });
  }
});