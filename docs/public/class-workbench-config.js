/* 班主任工作台 - 模块与表格配置
 * 所有功能模块、子表、字段均在此定义；修改此文件即可增删改板块结构。
 */
window.WB_CONFIG = {
  // 版本号，用于升级兼容
  version: 1,

  // 模块定义：一级 + 二级
  modules: [
    { id: 'dashboard', icon: '📊', label: '首页仪表盘', type: 'dashboard' },

    { id: 'students', icon: '📚', label: '学生档案库', type: 'group', subs: [
      { id: 'roster', icon: '📋', label: '全班花名册', fields: [
        { name: 'studentNo', label: '学号', type: 'text', required: true, placeholder: '如 20240101' },
        { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
        { name: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
        { name: 'birth', label: '出生日期', type: 'date' },
        { name: 'phone', label: '联系电话', type: 'text' },
        { name: 'address', label: '家庭住址', type: 'text' },
        { name: 'position', label: '担任职务', type: 'select', options: ['班长', '副班长', '学习委员', '纪律委员', '体育委员', '文艺委员', '生活委员', '组长', '课代表', '无'] },
        { name: 'talent', label: '才艺特长', type: 'text', placeholder: '如 篮球 / 书法 / 钢琴' },
        { name: 'remark', label: '备注', type: 'textarea', full: true }
      ]},
      { id: 'seating', icon: '🪑', label: '座位表', fields: [
        { name: 'studentNo', label: '学号', type: 'text' },
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'zone', label: '区域', type: 'select', options: ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组'] },
        { name: 'row', label: '排号', type: 'text' },
        { name: 'seatNo', label: '座位号', type: 'text' },
        { name: 'note', label: '备注', type: 'text' }
      ]},
      { id: 'dorm', icon: '🏠', label: '住宿信息', fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'building', label: '楼栋', type: 'text' },
        { name: 'roomNo', label: '房间号', type: 'text' },
        { name: 'bedNo', label: '床位号', type: 'text' },
        { name: 'roommate', label: '室友', type: 'text' },
        { name: 'guardianPhone', label: '家长电话', type: 'text' },
        { name: 'note', label: '备注', type: 'text' }
      ]},
      { id: 'medical', icon: '💊', label: '过敏病史', fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'allergy', label: '过敏源', type: 'text', placeholder: '如 海鲜 / 花粉 / 青霉素' },
        { name: 'chronic', label: '慢性病', type: 'text', placeholder: '如 哮喘 / 癫痫' },
        { name: 'medication', label: '常用药物', type: 'text' },
        { name: 'emergencyPhone', label: '紧急联系人', type: 'text' },
        { name: 'note', label: '注意事项', type: 'textarea', full: true }
      ]},
      { id: 'mental', icon: '💭', label: '心理台账', fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'level', label: '关注等级', type: 'select', options: ['重点', '一般', '关注'], default: '一般' },
        { name: 'trigger', label: '诱因/背景', type: 'textarea', full: true },
        { name: 'intervention', label: '干预措施', type: 'textarea', full: true },
        { name: 'lastTalk', label: '最近沟通日期', type: 'date' },
        { name: 'nextFollow', label: '下次跟进日期', type: 'date' },
        { name: 'handler', label: '负责人', type: 'text' }
      ]},
      { id: 'gooddeed', icon: '⭐', label: '好人好事', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'date', label: '发生日期', type: 'date' },
        { name: 'category', label: '类别', type: 'select', options: ['助人为乐', '拾金不昧', '拾荒保洁', '见义勇为', '勤学苦练', '其他'] },
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'detail', label: '详情', type: 'textarea', full: true },
        { name: 'reward', label: '奖励', type: 'text', placeholder: '如 小红花 / 表扬信' }
      ]},
      { id: 'violation', icon: '⚠', label: '违纪台账', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'date', label: '发生日期', type: 'date' },
        { name: 'level', label: '情节等级', type: 'select', options: ['轻微', '一般', '较重', '严重'] },
        { name: 'type', label: '违纪类型', type: 'select', options: ['迟到早退', '课堂违纪', '打架斗殴', '吸烟饮酒', '作弊', '玩手机', '其他'] },
        { name: 'detail', label: '详情', type: 'textarea', full: true },
        { name: 'handling', label: '处理结果', type: 'textarea', full: true },
        { name: 'parentNotified', label: '家长是否知晓', type: 'select', options: ['是', '否'] }
      ]},
      { id: 'special', icon: '👤', label: '特殊学生档案', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'category', label: '类型', type: 'select', options: ['单亲家庭', '留守', '贫困', '学业困难', '行为偏差', '特殊体质', '其他'] },
        { name: 'background', label: '背景情况', type: 'textarea', full: true },
        { name: 'goal', label: '跟踪目标', type: 'text' },
        { name: 'measure', label: '帮扶措施', type: 'textarea', full: true },
        { name: 'lastUpdate', label: '最近更新', type: 'date' }
      ]}
    ]},

    { id: 'attendance', icon: '🕐', label: '考勤请假', type: 'group', subs: [
      { id: 'morning', icon: '🏃', label: '早操考勤', fields: [
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'status', label: '出勤情况', type: 'select', options: ['正常', '迟到', '请假', '旷操'], default: '正常' },
        { name: 'students', label: '涉及学生', type: 'textarea', placeholder: '多个姓名用逗号或顿号分隔' },
        { name: 'reason', label: '原因说明', type: 'text' },
        { name: 'remark', label: '备注', type: 'text' }
      ]},
      { id: 'break', icon: '🤸', label: '课间操考勤', fields: [
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'status', label: '出勤情况', type: 'select', options: ['正常', '迟到', '请假', '旷操'], default: '正常' },
        { name: 'students', label: '涉及学生', type: 'textarea' },
        { name: 'reason', label: '原因说明', type: 'text' },
        { name: 'remark', label: '备注', type: 'text' }
      ]},
      { id: 'leave', icon: '📝', label: '请假审批', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'startDate', label: '开始日期', type: 'date', required: true },
        { name: 'endDate', label: '结束日期', type: 'date' },
        { name: 'days', label: '请假天数', type: 'text', placeholder: '如 1.5' },
        { name: 'type', label: '类型', type: 'select', options: ['病假', '事假', '公假', '其他'] },
        { name: 'reason', label: '请假事由', type: 'textarea', full: true },
        { name: 'parentPhone', label: '家长电话', type: 'text' },
        { name: 'approval', label: '审批状态', type: 'select', options: ['待审批', '已批准', '已驳回'], default: '待审批' },
        { name: 'approver', label: '审批人', type: 'text' }
      ]},
      { id: 'absent', icon: '🚫', label: '缺勤登记', fields: [
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'classType', label: '课次', type: 'select', options: ['早读', '上午课', '下午课', '晚自习'] },
        { name: 'subject', label: '科目', type: 'text' },
        { name: 'reason', label: '原因', type: 'select', options: ['旷课', '病假未报', '外出', '失踪'] },
        { name: 'handled', label: '处理情况', type: 'textarea', full: true }
      ]}
    ]},

    { id: 'grades', icon: '📈', label: '智能成绩分析', type: 'grades', subs: [
      { id: 'exams', icon: '📅', label: '考试批次管理', desc: '先建立考试批次（周测/月考/期末），再录入各批次的分数。' }
    ]},

    { id: 'duty', icon: '🧹', label: '日常班务', type: 'group', subs: [
      { id: 'duty', icon: '📅', label: '值日排班', fields: [
        { name: 'week', label: '周次', type: 'text', placeholder: '如 第 8 周' },
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'group', label: '值日组', type: 'text', placeholder: '如 第一组' },
        { name: 'members', label: '成员', type: 'textarea', placeholder: '多个姓名用逗号分隔' },
        { name: 'area', label: '负责区域', type: 'select', options: ['教室', '走廊', '卫生间', '垃圾房', '室外'] },
        { name: 'remark', label: '备注', type: 'text' }
      ]},
      { id: 'hygiene', icon: '✨', label: '卫生检查', fields: [
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'time', label: '检查时段', type: 'select', options: ['早晨', '中午', '放学后'] },
        { name: 'score', label: '得分', type: 'text', placeholder: '0-100' },
        { name: 'level', label: '评级', type: 'select', options: ['优', '良', '中', '差'] },
        { name: 'dutyGroup', label: '值日组', type: 'text' },
        { name: 'issue', label: '存在问题', type: 'textarea', full: true },
        { name: 'inspector', label: '检查人', type: 'text' }
      ]},
      { id: 'cadres', icon: '🎖', label: '班干部档案', fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'position', label: '职务', type: 'text', required: true },
        { name: 'term', label: '任期', type: 'text', placeholder: '如 2024学年 第1学期' },
        { name: 'duty', label: '职责', type: 'textarea', full: true },
        { name: 'performance', label: '工作表现', type: 'select', options: ['优秀', '良好', '一般', '需改进'] },
        { name: 'reward', label: '奖惩', type: 'text' },
        { name: 'note', label: '备注', type: 'text' }
      ]},
      { id: 'meeting', icon: '🎤', label: '班会存档', fields: [
        { name: 'date', label: '班会日期', type: 'date', required: true },
        { name: 'theme', label: '主题', type: 'text', required: true },
        { name: 'type', label: '类型', type: 'select', options: ['主题班会', '安全教育', '心理健康', '学习方法', '励志教育', '其他'] },
        { name: 'content', label: '内容要点', type: 'textarea', full: true },
        { name: 'host', label: '主讲人', type: 'text' },
        { name: 'material', label: '课件链接/路径', type: 'text' }
      ]},
      { id: 'activity', icon: '🎉', label: '班级活动', fields: [
        { name: 'date', label: '活动日期', type: 'date', required: true },
        { name: 'name', label: '活动名称', type: 'text', required: true },
        { name: 'type', label: '活动类型', type: 'select', options: ['运动会', '文艺汇演', '社会实践', '志愿服务', '团建', '其他'] },
        { name: 'participants', label: '参与人数', type: 'text' },
        { name: 'summary', label: '活动总结', type: 'textarea', full: true },
        { name: 'photos', label: '照片/链接', type: 'text' }
      ]},
      { id: 'safety', icon: '🛡', label: '安全排查', fields: [
        { name: 'date', label: '排查日期', type: 'date', required: true },
        { name: 'area', label: '排查区域', type: 'select', options: ['教室', '走廊', '卫生间', '宿舍', '实验室', '其他'] },
        { name: 'type', label: '排查类型', type: 'select', options: ['消防', '用电', '设施', '食品', '交通', '其他'] },
        { name: 'result', label: '排查结果', type: 'select', options: ['正常', '隐患', '已整改'] },
        { name: 'issue', label: '问题描述', type: 'textarea', full: true },
        { name: 'handler', label: '处理人', type: 'text' }
      ]}
    ]},

    { id: 'communication', icon: '📞', label: '家校沟通', type: 'group', subs: [
      { id: 'contacts', icon: '📇', label: '家长通讯录', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'relation', label: '家长关系', type: 'select', options: ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'] },
        { name: 'parentName', label: '家长姓名', type: 'text', required: true },
        { name: 'phone', label: '联系电话', type: 'text', required: true },
        { name: 'occupation', label: '职业', type: 'text' },
        { name: 'address', label: '家庭住址', type: 'text' },
        { name: 'wechat', label: '微信号', type: 'text' }
      ]},
      { id: 'visit', icon: '🚪', label: '家访记录', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'date', label: '家访日期', type: 'date', required: true },
        { name: 'type', label: '方式', type: 'select', options: ['入户家访', '线上家访', '到校面谈'] },
        { name: 'participants', label: '参与人员', type: 'text' },
        { name: 'content', label: '家访内容', type: 'textarea', full: true },
        { name: 'feedback', label: '家长反馈', type: 'textarea', full: true },
        { name: 'followup', label: '后续跟进', type: 'text' }
      ]},
      { id: 'talk', icon: '💬', label: '师生谈话', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'date', label: '谈话日期', type: 'date', required: true },
        { name: 'topic', label: '主题', type: 'select', options: ['学习辅导', '心理疏导', '纪律教育', '生活关怀', '前途规划', '其他'] },
        { name: 'duration', label: '时长(分钟)', type: 'text' },
        { name: 'summary', label: '谈话要点', type: 'textarea', full: true },
        { name: 'action', label: '后续行动', type: 'textarea', full: true }
      ]},
      { id: 'notice', icon: '📢', label: '班级通知', fields: [
        { name: 'date', label: '发布日期', type: 'date', required: true },
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'type', label: '类型', type: 'select', options: ['学习通知', '活动通知', '安全通知', '放假通知', '家长会', '其他'] },
        { name: 'content', label: '正文', type: 'textarea', full: true },
        { name: 'channel', label: '发布渠道', type: 'select', options: ['家长群', '班级群', '公告栏', '飞书/钉钉', '其他'] },
        { name: 'deadline', label: '截止时间', type: 'date' }
      ]},
      { id: 'parentMeet', icon: '👪', label: '家长会资料', fields: [
        { name: 'date', label: '会议日期', type: 'date', required: true },
        { name: 'theme', label: '主题', type: 'text', required: true },
        { name: 'attendees', label: '参会人数', type: 'text' },
        { name: 'agenda', label: '会议议程', type: 'textarea', full: true },
        { name: 'summary', label: '会议纪要', type: 'textarea', full: true },
        { name: 'material', label: '资料链接', type: 'text' }
      ]}
    ]},

    { id: 'materials', icon: '📚', label: '文案素材', type: 'group', subs: [
      { id: 'rules', icon: '📜', label: '班规公约', fields: [
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'category', label: '类别', type: 'select', options: ['班级公约', '宿舍公约', '班委职责', '奖励制度', '惩罚制度'] },
        { name: 'content', label: '正文', type: 'textarea', full: true },
        { name: 'effectiveDate', label: '生效日期', type: 'date' },
        { name: 'version', label: '版本', type: 'text', placeholder: '如 v1.0' }
      ]},
      { id: 'weeklyPlan', icon: '📅', label: '每周计划', fields: [
        { name: 'week', label: '周次', type: 'text', required: true },
        { name: 'startDate', label: '起始日期', type: 'date' },
        { name: 'focus', label: '本周重点', type: 'text' },
        { name: 'tasks', label: '任务清单', type: 'textarea', full: true },
        { name: 'meeting', label: '班会主题', type: 'text' },
        { name: 'homework', label: '作业/活动', type: 'text' }
      ]},
      { id: 'summary', icon: '📝', label: '工作小结', fields: [
        { name: 'date', label: '日期', type: 'date', required: true },
        { name: 'period', label: '周期', type: 'text', placeholder: '如 第 8 周 / 2024学年上' },
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'type', label: '类型', type: 'select', options: ['周小结', '月小结', '期中小结', '期末小结', '学期总结'] },
        { name: 'achievement', label: '主要成绩', type: 'textarea', full: true },
        { name: 'problem', label: '存在问题', type: 'textarea', full: true },
        { name: 'nextStep', label: '下一步计划', type: 'textarea', full: true }
      ]},
      { id: 'comment', icon: '✏️', label: '期末评语', fields: [
        { name: 'name', label: '学生姓名', type: 'text', required: true },
        { name: 'term', label: '学期', type: 'text', placeholder: '如 2024学年下' },
        { name: 'category', label: '评语类型', type: 'select', options: ['学期总评', '操行等级', '家长寄语', '班主任寄语'] },
        { name: 'content', label: '评语内容', type: 'textarea', full: true },
        { name: 'grade', label: '操行等级', type: 'select', options: ['优秀', '良好', '合格', '待合格'] }
      ]},
      { id: 'noticeTpl', icon: '📄', label: '通知范本', fields: [
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'category', label: '类别', type: 'select', options: ['放假通知', '活动通知', '家长会通知', '安全通知', '学习通知'] },
        { name: 'content', label: '模板内容', type: 'textarea', full: true },
        { name: 'usage', label: '使用场景', type: 'text' }
      ]},
      { id: 'courseware', icon: '🎨', label: '班会课件素材', fields: [
        { name: 'title', label: '标题', type: 'text', required: true },
        { name: 'theme', label: '主题', type: 'select', options: ['爱国教育', '安全教育', '心理健康', '学习方法', '励志教育', '传统文化', '其他'] },
        { name: 'format', label: '格式', type: 'select', options: ['PPT', 'Word', 'PDF', '视频', '音频', '其他'] },
        { name: 'url', label: '链接/路径', type: 'text' },
        { name: 'summary', label: '素材简介', type: 'textarea', full: true }
      ]}
    ]},

    { id: 'todo', icon: '✅', label: '待办备忘录', type: 'todo' }
  ]
};
