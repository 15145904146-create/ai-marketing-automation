import type { DeliveryRecord } from '../types';
import { d1Messages, d2Messages, d3Messages, d4Messages } from './mock-history-messages';

export const mockDeliveryRecords: DeliveryRecord[] = [
  {
    id: 'd1',
    title: '促回款外呼_0601',
    status: 'completed',
    stage: 'reviewed',
    date: '06/01',
    dateRange: '6/1 - 6/3',
    preview: '外呼 · 8,692人 · ROI 3.06',
    owner: '赵运营',
    channel: 'outbound_call',
    audienceSize: '8,692',
    roi: 3.06,
    startedAt: '2026-05-30',
    messages: d1Messages,
    performance: {
      metrics: [
        { label: '拨打量', value: '17,384' },
        { label: '接通率', value: '45.0', unit: '%' },
        { label: '意向率', value: '29.0', unit: '%' },
        { label: 'ROI', value: '3.06' },
      ],
      funnel: [
        { label: '拨打', value: 17384, rate: '100%' },
        { label: '接通', value: 7823, rate: '45.0%' },
        { label: '意向', value: 2270, rate: '29.0%' },
        { label: '转化', value: 681, rate: '8.7%' },
      ],
      comparison: [
        { metric: '接通率', expected: '45.0%', actual: '45.0%', achievement: '100%' },
        { metric: '意向率', expected: '30.0%', actual: '29.0%', achievement: '96.7%' },
        { metric: '转化人数', expected: '702', actual: '681', achievement: '97.0%' },
        { metric: '回款GMV', expected: '¥102万', actual: '¥97.8万', achievement: '95.9%' },
        { metric: 'ROI', expected: '3.2', actual: '3.06', achievement: '95.6%' },
      ],
      trends: [
        { label: '接通率', unit: '%', points: [{ day: 'Day1', value: 48 }, { day: 'Day2', value: 45 }, { day: 'Day3', value: 42 }] },
        { label: '意向率', unit: '%', points: [{ day: 'Day1', value: 31 }, { day: 'Day2', value: 29 }, { day: 'Day3', value: 27 }] },
      ],
      aiSummary: '本次活动整体表现接近预期。意向率Day2-Day3出现自然衰减（31%→27%），属正常范围。建议下次对未接通人群间隔2天再拨，并设计二次跟进话术。',
    },
    planSnapshot: {
      background: '近30天未回款年框商家占比超25%，目标通过外呼促进回款，预期转化700+人，带动回款GMV约100万。',
      audienceStrategy: { conditions: '30天未回款 + 年框商家', finalCount: '8,692 人', source: 'ODPS表 xxx_table_20260601' },
      outboundStrategy: [
        '触达覆盖：8,692人',
        '外呼时间：6/1-6/3 周一至周三 9:00-18:00',
        '外呼频次：每人最多拨打2次',
        '并发量：80路/小时',
      ],
      callScript: [
        { section: '开场白', content: '"XX先生/女士您好，这里是XX金融，感谢您选择我们的年框服务。今天给您打电话是想提醒您，有一笔回款可以享手续费减免优惠。"' },
        { section: '利益点', content: '"本月回款可享受手续费减免3%，同时还能获得额外的信用额度提升。"' },
        { section: '促转化', content: '"现在回款还能额外获得下个季度的费率优惠资格，这是限时的。"' },
        { section: '异议处理', content: '若"不需要"→ "理解，不过手续费减免这个月底就截止了，您可以先了解一下。"\n若"考虑一下"→ "好的，我理解。那我稍后发个短信给您，方便时随时联系我们。"' },
      ],
      roiCalculation: [
        { item: '外呼成本', value: '¥32,000' },
        { item: '预计接通', value: '3,911人' },
        { item: '预计意向', value: '1,173人' },
        { item: '预计转化', value: '702人' },
        { item: '预计回款GMV', value: '¥102万' },
        { item: '预期ROI', value: '3.2' },
      ],
    },
    config: {
      sections: [
        {
          title: '基本信息',
          fields: [
            { label: '租户', value: 'TAOGAO' },
            { label: '产品', value: 'ECREDITBAO_TAOGAO_SELF' },
            { label: '名称', value: '促回款外呼_20260601' },
            { label: '接入须知', value: '是' },
          ],
        },
        {
          title: '数据源配置',
          fields: [
            { label: 'ODPS表', value: 'b2b_cn.dwd_cf_prd_public_usr_call_df' },
            { label: '过滤条件', value: "product_type = 'JSHK' and file_code = '552858'" },
            { label: '分区字段', value: 'ds(日期分区键)' },
            { label: '分区模版', value: '上一天 ${yyyymmdd-1}' },
            { label: '用户ID字段', value: 'user_id(用户id)' },
          ],
        },
        {
          title: '触达内容配置',
          fields: [
            { label: '话术模板ID', value: '552858' },
            { label: '特征组Code', value: '-' },
            { label: '策略平台Code', value: '-' },
            { label: '主手机号字段', value: 'main_phone' },
            { label: '备用手机号字段', value: '-' },
            {
              label: '模板占位符映射',
              value: '',
              table: {
                headers: ['占位符', '替换值'],
                rows: [['${name}', 'user_name(用户姓名)'], ['${amount}', 'repay_amount(回款金额)']],
              },
            },
          ],
        },
        {
          title: '限制执行时段',
          fields: [
            { label: '执行时段', value: '10:00-17:00' },
          ],
        },
        {
          title: '任务运行配置',
          fields: [
            { label: '任务有效期', value: '2026-06-01 00:00:00 ~ 2026-06-03 23:59:59' },
            { label: '定时策略', value: '0 10 * * *' },
            { label: '预检数据分区', value: '已启用', badge: '已启用' },
            {
              label: '预检数据列表',
              value: '',
              table: {
                headers: ['离线表名', '分区检查值'],
                rows: [['b2b_cn.dwd_cf_prd_public_usr_call_df', 'ds=${yyyy-mm-dd-1}/product_type=JSHK']],
              },
            },
          ],
        },
        {
          title: '挂机短信配置',
          fields: [
            { label: '发送挂机短信', value: '否' },
            { label: '短信触发范围', value: '-' },
            { label: '短信触发节点', value: '-' },
          ],
        },
      ],
    },
    chatHistory: [
      { role: 'user', content: '30万预算做个促回款活动，目标是30天未回款的年框商家，下周一开始', time: '08:15' },
      { role: 'assistant', content: '收到，我整理了一下你的需求：\n• 产品：回款\n• 活动目的：促进不活跃商家回款\n• 目标人群：30天以上未回款的年框商家\n• 预算：30万\n• 渠道：外呼\n• 投放时间：下周一（6/1）开始\n\n需要确认几个问题：\n1. 外呼话术需要偏正式还是亲和？\n2. 每人最多拨打几次？', time: '08:15' },
      { role: 'user', content: '偏正式，每人最多拨打2次', time: '08:16' },
      { role: 'assistant', content: '方案已生成，核心要点：\n• 人群：8,692人（30天未回款 + 年框商家）\n• 外呼时间：6/1-6/3 周一至周三 9:00-18:00\n• 并发量：80路/小时\n• 预计转化：702人\n• 预期ROI：3.2', time: '08:17' },
      { role: 'user', content: '人群改成60天未回款的', time: '08:18' },
      { role: 'assistant', content: '已更新：人群量级变为8,692人（60天未回款 + 年框商家），其他参数不变。预期ROI调整为3.2。', time: '08:18' },
      { role: 'user', content: '确认方案', time: '08:20' },
      { role: 'assistant', content: '方案已确认，正在提交投放配置...', time: '08:20' },
    ],
  },
  {
    id: 'd2',
    title: '618大促外呼_高价值',
    status: 'executing',
    stage: 'executing',
    date: '06/05',
    dateRange: '6/5 - 进行中',
    preview: '外呼 · 5,200人 · 进度 64%',
    owner: '赵运营',
    channel: 'outbound_call',
    audienceSize: '5,200',
    progress: 64,
    startedAt: '2026-06-04',
    messages: d2Messages,
    performance: {
      metrics: [
        { label: '拨打量', value: '8,320' },
        { label: '接通率', value: '47.2', unit: '%' },
        { label: '意向率', value: '31.5', unit: '%' },
        { label: '进度', value: '64', unit: '%' },
      ],
      funnel: [
        { label: '拨打', value: 8320, rate: '100%' },
        { label: '接通', value: 3927, rate: '47.2%' },
        { label: '意向', value: 1237, rate: '31.5%' },
        { label: '转化', value: 342, rate: '8.7%' },
      ],
      comparison: [
        { metric: '接通率', expected: '46.0%', actual: '47.2%', achievement: '102.6%' },
        { metric: '意向率', expected: '30.0%', actual: '31.5%', achievement: '105.0%' },
        { metric: '转化人数', expected: '520', actual: '342', achievement: '65.8%' },
      ],
      trends: [
        { label: '接通率', unit: '%', points: [{ day: 'Day1', value: 49 }, { day: 'Day2', value: 47 }] },
        { label: '意向率', unit: '%', points: [{ day: 'Day1', value: 33 }, { day: 'Day2', value: 30 }] },
      ],
      aiSummary: '活动进行中，前两天数据略高于预期。接通率和意向率均超预期，建议保持当前策略继续执行。',
    },
    config: {
      sections: [
        {
          title: '基本信息',
          fields: [
            { label: '租户', value: 'TAOGAO' },
            { label: '产品', value: 'ECREDITBAO_TAOGAO_SELF' },
            { label: '名称', value: '618大促外呼_高价值' },
            { label: '接入须知', value: '是' },
          ],
        },
        {
          title: '数据源配置',
          fields: [
            { label: 'ODPS表', value: 'b2b_cn.dwd_cf_prd_public_usr_call_df' },
            { label: '过滤条件', value: "product_type = 'JSHK' and file_code = '553012'" },
            { label: '分区字段', value: 'ds(日期分区键)' },
            { label: '分区模版', value: '上一天 ${yyyymmdd-1}' },
            { label: '用户ID字段', value: 'user_id(用户id)' },
          ],
        },
        {
          title: '触达内容配置',
          fields: [
            { label: '话术模板ID', value: '553012' },
            { label: '特征组Code', value: '-' },
            { label: '策略平台Code', value: '-' },
            { label: '主手机号字段', value: 'main_phone' },
            { label: '备用手机号字段', value: '-' },
            {
              label: '模板占位符映射',
              value: '',
              table: {
                headers: ['占位符', '替换值'],
                rows: [['${name}', 'user_name(用户姓名)'], ['${promo}', 'promo_code(优惠码)']],
              },
            },
          ],
        },
        {
          title: '限制执行时段',
          fields: [
            { label: '执行时段', value: '09:00-18:00' },
          ],
        },
        {
          title: '任务运行配置',
          fields: [
            { label: '任务有效期', value: '2026-06-05 00:00:00 ~ 2026-06-10 23:59:59' },
            { label: '定时策略', value: '0 9 * * *' },
            { label: '预检数据分区', value: '已启用', badge: '已启用' },
            {
              label: '预检数据列表',
              value: '',
              table: {
                headers: ['离线表名', '分区检查值'],
                rows: [['b2b_cn.dwd_cf_prd_public_usr_call_df', 'ds=${yyyy-mm-dd-1}/product_type=JSHK']],
              },
            },
          ],
        },
        {
          title: '挂机短信配置',
          fields: [
            { label: '发送挂机短信', value: '否' },
            { label: '短信触发范围', value: '-' },
            { label: '短信触发节点', value: '-' },
          ],
        },
      ],
    },
  },
  {
    id: 'd3',
    title: '老客复购外呼',
    status: 'completed',
    stage: 'reviewed',
    date: '05/28',
    dateRange: '5/28 - 5/30',
    preview: '外呼 · 3,400人 · ROI 2.8',
    owner: '赵运营',
    channel: 'outbound_call',
    audienceSize: '3,400',
    roi: 2.8,
    startedAt: '2026-05-26',
    messages: d3Messages,
    performance: {
      metrics: [
        { label: '拨打量', value: '6,800' },
        { label: '接通率', value: '52.0', unit: '%' },
        { label: '意向率', value: '25.0', unit: '%' },
        { label: 'ROI', value: '2.8' },
      ],
      funnel: [
        { label: '拨打', value: 6800, rate: '100%' },
        { label: '接通', value: 3536, rate: '52.0%' },
        { label: '意向', value: 884, rate: '25.0%' },
        { label: '转化', value: 283, rate: '8.0%' },
      ],
      comparison: [
        { metric: '接通率', expected: '50.0%', actual: '52.0%', achievement: '104.0%' },
        { metric: '意向率', expected: '28.0%', actual: '25.0%', achievement: '89.3%' },
        { metric: '转化人数', expected: '300', actual: '283', achievement: '94.3%' },
        { metric: 'ROI', expected: '3.0', actual: '2.8', achievement: '93.3%' },
      ],
      trends: [
        { label: '接通率', unit: '%', points: [{ day: 'Day1', value: 54 }, { day: 'Day2', value: 52 }, { day: 'Day3', value: 50 }] },
        { label: '意向率', unit: '%', points: [{ day: 'Day1', value: 27 }, { day: 'Day2', value: 25 }, { day: 'Day3', value: 23 }] },
      ],
      aiSummary: '老客复购活动接通率表现良好，但意向率略低于预期。建议优化话术中的利益点描述，增加紧迫感。',
    },
    config: {
      sections: [
        {
          title: '基本信息',
          fields: [
            { label: '租户', value: 'TAOGAO' },
            { label: '产品', value: 'ECREDITBAO_TAOGAO_SELF' },
            { label: '名称', value: '老客复购外呼_20260528' },
            { label: '接入须知', value: '是' },
          ],
        },
        {
          title: '数据源配置',
          fields: [
            { label: 'ODPS表', value: 'b2b_cn.dwd_cf_prd_public_usr_call_df' },
            { label: '过滤条件', value: "product_type = 'JSHK' and file_code = '551990'" },
            { label: '分区字段', value: 'ds(日期分区键)' },
            { label: '分区模版', value: '上一天 ${yyyymmdd-1}' },
            { label: '用户ID字段', value: 'user_id(用户id)' },
          ],
        },
        {
          title: '触达内容配置',
          fields: [
            { label: '话术模板ID', value: '551990' },
            { label: '特征组Code', value: '-' },
            { label: '策略平台Code', value: '-' },
            { label: '主手机号字段', value: 'main_phone' },
            { label: '备用手机号字段', value: '-' },
            {
              label: '模板占位符映射',
              value: '',
              table: {
                headers: ['占位符', '替换值'],
                rows: [['${name}', 'user_name(用户姓名)'], ['${product}', 'last_product(上次购买商品)']],
              },
            },
          ],
        },
        {
          title: '限制执行时段',
          fields: [
            { label: '执行时段', value: '09:00-18:00' },
          ],
        },
        {
          title: '任务运行配置',
          fields: [
            { label: '任务有效期', value: '2026-05-28 00:00:00 ~ 2026-05-30 23:59:59' },
            { label: '定时策略', value: '0 9 * * *' },
            { label: '预检数据分区', value: '已启用', badge: '已启用' },
            {
              label: '预检数据列表',
              value: '',
              table: {
                headers: ['离线表名', '分区检查值'],
                rows: [['b2b_cn.dwd_cf_prd_public_usr_call_df', 'ds=${yyyy-mm-dd-1}/product_type=JSHK']],
              },
            },
          ],
        },
        {
          title: '挂机短信配置',
          fields: [
            { label: '发送挂机短信', value: '否' },
            { label: '短信触发范围', value: '-' },
            { label: '短信触发节点', value: '-' },
          ],
        },
      ],
    },
  },
  {
    id: 'd4',
    title: '流失挽回短信_0520',
    status: 'completed',
    stage: 'completed',
    date: '05/20',
    dateRange: '5/20',
    preview: '短信 · 15,000人 · ROI 1.9',
    owner: '李运营',
    channel: 'sms',
    audienceSize: '15,000',
    roi: 1.9,
    startedAt: '2026-05-19',
    messages: d4Messages,
    performance: {
      metrics: [
        { label: '发送量', value: '15,000' },
        { label: '打开率', value: '38.5', unit: '%' },
        { label: '点击率', value: '12.3', unit: '%' },
        { label: 'ROI', value: '1.9' },
      ],
      funnel: [
        { label: '发送', value: 15000, rate: '100%' },
        { label: '打开', value: 5775, rate: '38.5%' },
        { label: '点击', value: 1845, rate: '12.3%' },
        { label: '转化', value: 370, rate: '2.5%' },
      ],
      comparison: [
        { metric: '打开率', expected: '40.0%', actual: '38.5%', achievement: '96.3%' },
        { metric: '点击率', expected: '15.0%', actual: '12.3%', achievement: '82.0%' },
        { metric: '转化人数', expected: '450', actual: '370', achievement: '82.2%' },
        { metric: 'ROI', expected: '2.5', actual: '1.9', achievement: '76.0%' },
      ],
      trends: [
        { label: '打开率', unit: '%', points: [{ day: 'Day1', value: 38.5 }] },
        { label: '点击率', unit: '%', points: [{ day: 'Day1', value: 12.3 }] },
      ],
      aiSummary: '短信渠道转化率低于预期，点击率仅为12.3%。建议优化短信标题和CTA文案，考虑使用个性化变量提升打开率。',
    },
    config: {
      sections: [
        {
          title: '基本信息',
          fields: [
            { label: '租户', value: 'TAOGAO' },
            { label: '产品', value: 'ECREDITBAO_TAOGAO_SELF' },
            { label: '名称', value: '流失挽回短信_20260520' },
            { label: '接入须知', value: '是' },
          ],
        },
        {
          title: '数据源配置',
          fields: [
            { label: 'ODPS表', value: 'b2b_cn.dwd_cf_prd_public_usr_sms_df' },
            { label: '过滤条件', value: "product_type = 'JSHK' and file_code = '550880'" },
            { label: '分区字段', value: 'ds(日期分区键)' },
            { label: '分区模版', value: '上一天 ${yyyymmdd-1}' },
            { label: '用户ID字段', value: 'user_id(用户id)' },
          ],
        },
        {
          title: '触达内容配置',
          fields: [
            { label: '话术模板ID', value: '550880' },
            { label: '特征组Code', value: '-' },
            { label: '策略平台Code', value: '-' },
            { label: '主手机号字段', value: 'main_phone' },
            { label: '备用手机号字段', value: '-' },
            {
              label: '模板占位符映射',
              value: '',
              table: {
                headers: ['占位符', '替换值'],
                rows: [['${name}', 'user_name(用户姓名)'], ['${coupon}', 'coupon_code(优惠券码)']],
              },
            },
          ],
        },
        {
          title: '限制执行时段',
          fields: [
            { label: '执行时段', value: '10:00-18:00' },
          ],
        },
        {
          title: '任务运行配置',
          fields: [
            { label: '任务有效期', value: '2026-05-20 00:00:00 ~ 2026-05-20 23:59:59' },
            { label: '定时策略', value: '0 10 * * *' },
            { label: '预检数据分区', value: '已启用', badge: '已启用' },
            {
              label: '预检数据列表',
              value: '',
              table: {
                headers: ['离线表名', '分区检查值'],
                rows: [['b2b_cn.dwd_cf_prd_public_usr_sms_df', 'ds=${yyyy-mm-dd-1}/product_type=JSHK']],
              },
            },
          ],
        },
        {
          title: '挂机短信配置',
          fields: [
            { label: '发送挂机短信', value: '否' },
            { label: '短信触发范围', value: '-' },
            { label: '短信触发节点', value: '-' },
          ],
        },
      ],
    },
  },
];
