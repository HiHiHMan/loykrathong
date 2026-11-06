"use strict";

/*
 * Firebase Realtime Database + optional local mock database for manual testing.
 * Open any page with ?mock=1 to use an empty local database.
 * Open any page with ?mock=0 to switch back to Firebase.
 */
(function initializeLoyKrathongDatabase() {
  const MODE_KEY = "loykrathong-db-mode";
  const MOCK_KEY = "loykrathong-mock-wishes";
  const params = new URLSearchParams(window.location.search);

  if (params.get("mock") === "1") {
    localStorage.setItem(MODE_KEY, "mock");
  } else if (params.get("mock") === "0") {
    localStorage.setItem(MODE_KEY, "firebase");
  }

  const useMock = localStorage.getItem(MODE_KEY) === "mock";

  if (useMock) {
    window.LoyKrathongDB = {
      mode: "mock",

      async addWish(data) {
        const items = JSON.parse(localStorage.getItem(MOCK_KEY) || "[]");
        const wish = {
          id: "mock-" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
          fullName: String(data.fullName || "").trim(),
          employeeCode: String(data.employeeCode || "").trim(),
          department: String(data.department || "").trim(),
          whName: String(data.whName || "ไม่ระบุ").trim(),
          krathongType: String(data.krathongType || "").trim(),
          wish: String(data.wish || "").trim(),
          createdAt: Date.now()
        };

        items.push(wish);
        localStorage.setItem(MOCK_KEY, JSON.stringify(items));
        return wish;
      },

      async getWishes(limit = null) {
        const items = JSON.parse(localStorage.getItem(MOCK_KEY) || "[]")
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        return Number.isInteger(limit) && limit > 0 ? items.slice(0, limit) : items;
      },

      async updateWish(id, data) {
        const items = JSON.parse(localStorage.getItem(MOCK_KEY) || "[]");
        const index = items.findIndex(item => item.id === id);
        if (index < 0) throw new Error("ไม่พบคำอธิษฐานที่ต้องการแก้ไข");
        items[index] = {
          ...items[index],
          fullName: String(data.fullName || "").trim(),
          employeeCode: String(data.employeeCode || "").trim(),
          department: String(data.department || "").trim(),
          whName: String(data.whName || "").trim(),
          krathongType: String(data.krathongType || "").trim(),
          wish: String(data.wish || "").trim()
        };
        localStorage.setItem(MOCK_KEY, JSON.stringify(items));
        return items[index];
      },

      async deleteWish(id) {
        const items = JSON.parse(localStorage.getItem(MOCK_KEY) || "[]");
        const filtered = items.filter(item => item.id !== id);
        if (filtered.length === items.length) throw new Error("ไม่พบคำอธิษฐานที่ต้องการลบ");
        localStorage.setItem(MOCK_KEY, JSON.stringify(filtered));
      }
    };

    console.info("Loy Krathong: ใช้ฐานข้อมูลจำลองในเครื่อง");
    return;
  }

  if (!window.firebase) {
    console.error("Firebase SDK ไม่พร้อมใช้งาน");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDTy9plABxNCBobSa5-WMEGlscZRDo4Rcs",
    authDomain: "loykrathong-33949.firebaseapp.com",
    databaseURL: "https://loykrathong-33949-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "loykrathong-33949",
    storageBucket: "loykrathong-33949.firebasestorage.app",
    messagingSenderId: "458591077502",
    appId: "1:458591077502:web:8e3a543ff647cbbd9f842f",
    measurementId: "G-DB42P1Y430"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const database = firebase.database();
  const wishesRef = database.ref("Wishes");

  window.LoyKrathongDB = {
    mode: "firebase",

    async addWish(data) {
      const itemRef = wishesRef.push();
      const wish = {
        id: itemRef.key,
        fullName: String(data.fullName || "").trim(),
        employeeCode: String(data.employeeCode || "").trim(),
        department: String(data.department || "").trim(),
        whName: String(data.whName || "ไม่ระบุ").trim(),
        krathongType: String(data.krathongType || "").trim(),
        wish: String(data.wish || "").trim(),
        createdAt: Date.now()
      };

      await itemRef.set(wish);
      return wish;
    },

    async getWishes(limit = null) {
      const query = Number.isInteger(limit) && limit > 0
        ? wishesRef.orderByChild("createdAt").limitToLast(limit)
        : wishesRef;
      const snapshot = await query.once("value");
      if (!snapshot.exists()) return [];

      return Object.entries(snapshot.val())
        .map(([key, value]) => ({
          ...value,
          id: key
        }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    },

    async updateWish(id, data) {
      const updates = {
        fullName: String(data.fullName || "").trim(),
        employeeCode: String(data.employeeCode || "").trim(),
        department: String(data.department || "").trim(),
        whName: String(data.whName || "").trim(),
        krathongType: String(data.krathongType || "").trim(),
        wish: String(data.wish || "").trim()
      };
      await wishesRef.child(id).update(updates);
      return { id, ...updates };
    },

    async deleteWish(id) {
      await wishesRef.child(id).remove();
    }
  };
})();
