# 古法蓝晒底片整理室

运行：

```bash
npm start
```

访问`http://localhost:3040`。数据保存在`data/cyanotype-negative-room.json`。

## 上岗资格台

访问`http://localhost:3040/staff`登记师傅的班组、在岗时段、可做工序和证书有效期。

- 提交涂布、曝光、冲洗时必须选择操作人员；不在岗、证书过期、工序不符或同一人时段重叠会停下并说明原因，原记录不写入。
- 修改班组、在岗时段或证书有效期后，此人经手过的未交付底片退回"待复核"，变更历史保留可查。
- 业务文件：`qualification-rules.js`（规则）、`staff-store.js`（存取）、`staff-page.js`（页面）。
