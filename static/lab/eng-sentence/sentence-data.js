/**
 * 句型建构数据 · 高中英语必修一核心语法
 * ---------------------------------------------------------------
 * words   : 正确顺序的词块数组，{ t: 单词, p: 词性 }
 * roles   : 与 words 一一对应的「句法槽位角色提示」
 * caption : 分阶段讲解（每步对应填对一个词的解说）
 * note    : 信息面板中的语法讲解
 */

/* 词性 → 配色（工作台高亮用，CSS 颜色） */
export const WORD_COLORS = {
  n:     0x4a90d9,  // 名词 蓝
  v:     0xe0594a,  // 动词 红
  adj:   0x4caf6e,  // 形容词 绿
  adv:   0xf0b429,  // 副词 黄
  det:   0xe0843a,  // 冠词/限定词 橙
  prep:  0x3fb6c4,  // 介词 青
  conj:  0x9b6dd6,  // 连词 紫
  rel:   0xb56cff,  // 关系词 亮紫
  pron:  0x6c8ce0,  // 代词 浅蓝
  aux:   0xd65a8a,  // 助动词(be/have/do) 粉
  modal: 0xc77b3a,  // 情态动词 棕橙
};

/* 词性 → 中文名（图例 / 标签用） */
export const POS_NAMES = {
  n:     { zh: "名词" },
  v:     { zh: "动词" },
  adj:   { zh: "形容词" },
  adv:   { zh: "副词" },
  det:   { zh: "冠词" },
  prep:  { zh: "介词" },
  conj:  { zh: "连词" },
  rel:   { zh: "关系词" },
  pron:  { zh: "代词" },
  aux:   { zh: "助动词" },
  modal: { zh: "情态动词" },
};

/**
 * 句型模型库
 */
export const SENTENCES = {
  /* ============ 五种基本句型 ============ */
  sv: {
    name: "S + V　主谓",
    grammar: "五种基本句型 ①",
    scene: "classroom",
    words: [ { t: "Birds", p: "n" }, { t: "sing", p: "v" } ],
    roles: [ "S 主语", "V 谓语" ],
    caption: [
      "① 主语 S：Birds（鸟，名词）— 句子的主角",
      "② 谓语 V：sing（唱歌，动词）— 描述主语发出的动作",
      "✓ S + V 完整：主语 + 不及物动词，动词后无需宾语"
    ],
    note: "五种基本句型之① S+V（主+谓）：主语发出动作，后面不接宾语。常见不及物动词：sing, run, sleep, arrive, exist, happen。"
  },
  svp: {
    name: "S + V + P　主系表",
    grammar: "五种基本句型 ②",
    scene: "classroom",
    words: [ { t: "He", p: "pron" }, { t: "is", p: "aux" }, { t: "happy", p: "adj" } ],
    roles: [ "S 主语", "V 系动词", "P 表语" ],
    caption: [
      "① 主语 S：He（他，代词）",
      "② 系动词 V：is（be 动词）— 不表动作，只连系主语与表语",
      "③ 表语 P：happy（高兴的，形容词）— 说明主语的状态",
      "✓ S + V + P：主语 + 系动词 + 表语"
    ],
    note: "五种基本句型之② S+V+P（主+系+表）：be 动词（am/is/are）作系动词，后接形容词、名词或介词短语来说明主语的状态或身份。"
  },
  svo: {
    name: "S + V + O　主谓宾",
    grammar: "五种基本句型 ③",
    scene: "classroom",
    words: [ { t: "I", p: "pron" }, { t: "found", p: "v" }, { t: "the", p: "det" }, { t: "book", p: "n" } ],
    roles: [ "S 主语", "V 谓语", "O 宾语", "O 宾语" ],
    caption: [
      "① 主语 S：I（我，代词）",
      "② 谓语 V：found（找到，动词过去式）",
      "③ 宾语 O：the book（这本书，冠词+名词）— 动作的承受者",
      "✓ S + V + O：主语 + 谓语 + 宾语"
    ],
    note: "五种基本句型之③ S+V+O（主+谓+宾）：及物动词后接宾语，动作作用于宾语。宾语常由名词、代词或名词短语充当。"
  },
  svio: {
    name: "S + V + IO + DO",
    grammar: "五种基本句型 ④",
    scene: "club_room",
    words: [ { t: "She", p: "pron" }, { t: "gave", p: "v" }, { t: "me", p: "pron" }, { t: "a", p: "det" }, { t: "book", p: "n" } ],
    roles: [ "S 主语", "V 谓语", "IO 间宾", "DO 直宾", "DO 直宾" ],
    caption: [
      "① 主语 S：She（她）",
      "② 谓语 V：gave（给，双宾动词）",
      "③ 间接宾语 IO：me（我）— 动作的接受者（人）",
      "④ 直接宾语 DO：a book（一本书）— 动作的直接对象（物）",
      "✓ S + V + IO + DO：主 + 谓 + 间宾(人) + 直宾(物)"
    ],
    note: "五种基本句型之④ S+V+IO+DO（主+谓+间宾+直宾）：give, send, show, teach, buy 等双宾动词后接「人(间宾) + 物(直宾)」。"
  },
  svoc: {
    name: "S + V + O + C",
    grammar: "五种基本句型 ⑤",
    scene: "club_room",
    words: [ { t: "We", p: "pron" }, { t: "made", p: "v" }, { t: "him", p: "pron" }, { t: "captain", p: "n" } ],
    roles: [ "S 主语", "V 谓语", "O 宾语", "C 宾补" ],
    caption: [
      "① 主语 S：We（我们）",
      "② 谓语 V：made（使，使役动词）",
      "③ 宾语 O：him（他）",
      "④ 宾语补足语 C：captain（队长，名词）— 补充说明宾语的身份",
      "✓ S + V + O + C：主 + 谓 + 宾 + 宾补"
    ],
    note: "五种基本句型之⑤ S+V+O+C（主+谓+宾+宾补）：make, call, name, keep 等使役/感官动词后接宾补，说明宾语「成为什么/处于什么状态」。"
  },

  /* ============ 现在进行时表将来 ============ */
  bedoing: {
    name: "be doing 表将来",
    grammar: "现在进行时表将来",
    scene: "old_town",
    words: [
      { t: "We", p: "pron" }, { t: "are", p: "aux" }, { t: "visiting", p: "v" },
      { t: "the", p: "det" }, { t: "museum", p: "n" }, { t: "tomorrow", p: "adv" }
    ],
    roles: [ "S 主语", "be 动词", "V-ing", "O 宾语", "时间状语" ],
    caption: [
      "① 主语 S：We（我们）",
      "② be 动词：are（现在时）",
      "③ 现在分词 V-ing：visiting（参观）",
      "④ 宾语：the museum（博物馆）",
      "⑤ 时间状语：tomorrow（明天）",
      "✓ 用 are visiting 表示「已确定的将来安排」，语气比 will 更确定"
    ],
    note: "现在进行时表将来：当动词表示位移或既定计划（go, come, leave, arrive, visit…）且指向已有安排时，用 be doing 表将来。它比 will 更确定、更口语化。"
  },

  /* ============ 情态动词 ============ */
  modal: {
    name: "情态动词",
    grammar: "情态动词",
    scene: "club_room",
    words: [
      { t: "You", p: "pron" }, { t: "must", p: "modal" }, { t: "finish", p: "v" },
      { t: "the", p: "det" }, { t: "homework", p: "n" }
    ],
    roles: [ "S 主语", "情态动词", "V 原形", "O 宾语", "O 宾语" ],
    caption: [
      "① 主语 S：You（你）",
      "② 情态动词：must（必须）— 后接动词原形",
      "③ 谓语（原形）：finish（完成）",
      "④ 宾语：the homework（作业）",
      "✓ 情态动词 + 动词原形，表达语气与态度"
    ],
    note: "情态动词（can / must / should / may / need…）后接动词原形，无人称和数的变化，用来表达能力、义务、推测、许可等语气。"
  },

  /* ============ 定语从句 ============ */
  attr: {
    name: "定语从句",
    grammar: "定语从句（U4/U5）",
    scene: "farewell_party",
    words: [
      { t: "I", p: "pron" }, { t: "like", p: "v" }, { t: "the", p: "det" },
      { t: "book", p: "n" }, { t: "which", p: "rel" }, { t: "is", p: "aux" },
      { t: "on", p: "prep" }, { t: "the", p: "det" }, { t: "desk", p: "n" }
    ],
    roles: [ "主句主语", "主句谓语", "先行词", "先行词", "关系词", "从句系动词", "从句表语", "从句表语", "从句表语" ],
    caption: [
      "① 主句主语：I",
      "② 主句谓语：like",
      "③ 先行词：the book（书，被修饰的名词）",
      "④ 关系词：which（指代 book，在从句中作主语）",
      "⑤ 从句系动词：is",
      "⑥ 从句表语：on the desk（在桌上）",
      "✓ 定语从句 which is on the desk 修饰 the book"
    ],
    note: "定语从句：用关系词（who / which / that / whose / when / where / why）引导，紧跟在它所修饰的名词（先行词）之后。关系词在从句中充当成分——who 指人、which 指物、where 指地点、when 指时间。"
  },
};

/* tab 顺序（即「句型库」展示顺序） */
export const SENTENCE_ORDER = ["sv", "svp", "svo", "svio", "svoc", "bedoing", "modal", "attr"];
