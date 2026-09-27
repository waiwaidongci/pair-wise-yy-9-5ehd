// 上岗资格存取：师傅登记、变更与历史，和底片放在同一个 JSON 库里。

export function ensureStaffShape(db) {
  if (!Array.isArray(db.staff)) db.staff = [];
  if (!Array.isArray(db.staffHistory)) db.staffHistory = [];
  return db;
}

export function listStaff(db) {
  return ensureStaffShape(db).staff;
}

export function findStaff(db, id) {
  return listStaff(db).find(r => r.id === id) || null;
}

export function addStaff(db, record) {
  const now = new Date().toISOString();
  const saved = { id: "SF-" + Date.now(), ...record, createdAt: now, updatedAt: now };
  ensureStaffShape(db).staff.unshift(saved);
  return saved;
}

// 返回 { before, after }，找不到返回 null
export function updateStaff(db, id, record) {
  const staff = listStaff(db);
  const index = staff.findIndex(r => r.id === id);
  if (index === -1) return null;
  const before = staff[index];
  const after = { ...before, ...record, id: before.id, createdAt: before.createdAt, updatedAt: new Date().toISOString() };
  staff[index] = after;
  return { before, after };
}

// 资格变更留痕：改了什么、改前改后、退回了哪些底片，旧记录一直能查
export function appendHistory(db, entry) {
  ensureStaffShape(db).staffHistory.unshift({ at: new Date().toISOString(), ...entry });
}

export function listHistory(db) {
  return ensureStaffShape(db).staffHistory;
}
