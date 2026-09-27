# 古法蓝晒底片整理室

运行：

```bash
npm start
```

访问`http://localhost:3040`。数据保存在`data/cyanotype-negative-room.json`。

## 上岗资格台

访问`http://localhost:3040/qualifications`，登记师傅的班组、在岗时段、可做工序（涂布/曝光/冲洗）和证书有效期。

- 提交涂布、曝光、冲洗时必须选择操作人；不在岗、证书过期、工序不符或同一人时段重叠都会被拦下并说明原因，原记录不写入。
- 师傅的班组、在岗时段或证书变更后，其沾过手的未交付底片自动退回「待复核」，旧记录保留可查。

业务文件：`qualification-rules.js`（规则）、`qualification-store.js`（存取）、`qualification-page.js`（页面）。
