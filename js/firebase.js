"use strict";

/*
 * Firebase Realtime Database connection.
 * The Firebase web config is public by design; database access is controlled by Realtime Database Rules.
 */
(function initializeLoyKrathongFirebase() {
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

    async getWishes() {
      const snapshot = await wishesRef.once("value");
      if (!snapshot.exists()) return [];

      return Object.entries(snapshot.val()).map(([key, value]) => ({
        ...value,
        id: value && value.id ? value.id : key
      }));
    }
  };
})();
