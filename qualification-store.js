// 上岗资格台与底片整理室共用的数据存取：同一个 JSON 文件，items 与 workers 两个集合。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "data", "cyanotype-negative-room.json");

const seed = {
  "items": [
    {
      "code": "CN-001",
      "plateSize": "18x24cm",
      "chemicalBatch": "B-0620",
      "exposure": "8分钟",
      "waterSource": "井水过滤",
      "box": "蓝盒A-03",
      "status": "冲洗中",
      "defect": "边角显影不均",
      "logs": [
        {
          "at": "2026-06-20",
          "step": "曝光",
          "note": "阴天补时2分钟"
        }
      ]
    }
  ],
  "workers": [
    {
      "id": "W-001",
      "name": "沈青",
      "team": "甲班",
      "periods": [{ "start": "08:00", "end": "16:00" }],
      "skills": ["涂布", "曝光", "冲洗"],
      "certValidUntil": "2027-06-30",
      "createdAt": "2026-06-20T08:00:00.000Z",
      "history": []
    }
  ]
};

export async function loadDb() {
  if (!existsSync(dbPath)) {
    await mkdir(dirname(dbPath), { recursive: true });
    await saveDb(seed);
  }
  const db = JSON.parse(await readFile(dbPath, "utf8"));
  db.items ||= [];
  db.workers ||= [];
  return db;
}

export async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

export function findWorker(db, idOrName) {
  return db.workers.find(w => w.id === idOrName || w.name === idOrName);
}

export function newWorkerId() {
  return "W-" + Date.now();
}
