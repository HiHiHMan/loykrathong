"use strict";

/*
 * Firebase Realtime Database + local mock database.
 * Open any page with ?mock=1 to use the local sample database.
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

  const sampleWishes = [
    ["สมชาย ใจดี", "EMP001", "คลังสินค้า", "คลังสมุทรปราการ", "lotus", "ขอให้สุขภาพแข็งแรงและครอบครัวมีความสุข"],
    ["สุดา แสงทอง", "EMP002", "ฝ่ายบัญชี", "คลังบางนา", "orchid", "ขอให้การงานก้าวหน้าและพบเจอแต่สิ่งดี ๆ"],
    ["กิตติพงษ์ มีสุข", "EMP003", "ฝ่ายขนส่ง", "คลังชลบุรี", "marigold", "ขอให้เดินทางปลอดภัยตลอดทั้งปี"],
    ["พิมพ์ชนก วัฒนา", "EMP004", "ฝ่ายบุคคล", "คลังสมุทรสาคร", "globeAmaranth", "ขอให้คนที่รักมีความสุขและสมหวัง"],
    ["ธนกร ตั้งใจ", "EMP005", "คลังสินค้า", "คลังอยุธยา", "ixora", "ขอให้มีสติปัญญาแก้ไขทุกปัญหา"],
    ["อรทัย ใจงาม", "EMP006", "ฝ่ายจัดซื้อ", "คลังปทุมธานี", "whiteChampaca", "ขอให้มีโชคลาภและความมั่นคง"],
    ["ณัฐพล พูนทรัพย์", "EMP007", "ฝ่าย IT", "คลังบางนา", "lotus", "ขอให้โปรเจกต์ทุกอย่างสำเร็จตามเป้าหมาย"],
    ["วราภรณ์ สุขใจ", "EMP008", "ฝ่าย QC", "คลังสมุทรปราการ", "orchid", "ขอให้สุขภาพแข็งแรง ไร้โรคภัย"],
    ["ภาคิน รุ่งเรือง", "EMP009", "ฝ่ายขนส่ง", "คลังระยอง", "marigold", "ขอให้ธุรกิจและการงานรุ่งเรือง"],
    ["ชลธิชา มั่นคง", "EMP010", "ฝ่ายบัญชี", "คลังชลบุรี", "globeAmaranth", "ขอให้ความรักมั่นคงและยืนยาว"],
    ["เอกชัย ขยันงาน", "EMP011", "คลังสินค้า", "คลังอยุธยา", "ixora", "ขอให้ผ่านอุปสรรคทุกอย่างไปได้"],
    ["เบญจมาศ สดใส", "EMP012", "ฝ่ายบุคคล", "คลังสมุทรสาคร", "whiteChampaca", "ขอให้มีความสุขและเงินทองไหลมาเทมา"],
    ["ศุภชัย ใจเย็น", "EMP013", "ฝ่ายผลิต", "คลังปทุมธานี", "lotus", "ขอให้ทุกคนในทีมทำงานอย่างราบรื่น"],
    ["มณีรัตน์ แก้วใส", "EMP014", "ฝ่ายจัดซื้อ", "คลังบางนา", "orchid", "ขอให้ครอบครัวอบอุ่นและปลอดภัย"],
    ["ปกรณ์ เก่งกิจ", "EMP015", "ฝ่าย IT", "คลังระยอง", "marigold", "ขอให้เรียนรู้สิ่งใหม่และเติบโตในหน้าที่"],
    ["สุภาวดี มีวาสนา", "EMP016", "ฝ่าย QC", "คลังชลบุรี", "globeAmaranth", "ขอให้พบเจอแต่คนดีและมิตรภาพที่ดี"],
    ["จักรพันธ์ มานะ", "EMP017", "ฝ่ายขนส่ง", "คลังสมุทรปราการ", "ixora", "ขอให้การเดินทางทุกครั้งปลอดภัย"],
    ["กัญญารัตน์ ใจดี", "EMP018", "ฝ่ายบัญชี", "คลังอยุธยา", "whiteChampaca", "ขอให้มีความก้าวหน้าและมั่งคั่ง"],
    ["ธีรภัทร ตั้งมั่น", "EMP019", "คลังสินค้า", "คลังสมุทรสาคร", "lotus", "ขอให้มีพลังใจในการทำสิ่งที่ตั้งใจ"],
    ["นภัสสร พรดี", "EMP020", "ฝ่ายบุคคล", "คลังปทุมธานี", "orchid", "ขอให้ปีนี้เต็มไปด้วยรอยยิ้มและความสุข"]
  ];

  function createSampleWishes() {
    const now = Date.now();
    return sampleWishes.map((row, index) => ({
      id: "mock-" + String(index + 1).padStart(3, "0"),
      fullName: row[0],
      employeeCode: row[1],
      department: row[2],
      whName: row[3],
      krathongType: row[4],
      wish: row[5],
      createdAt: now - (sampleWishes.length - index) * 60000
    }));
  }

  function initializeMockData() {
    if (localStorage.getItem(MOCK_KEY) === null) {
      localStorage.setItem(MOCK_KEY, JSON.stringify(createSampleWishes()));
    }
  }

  if (useMock) {
    initializeMockData();

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

      async getWishes() {
        return JSON.parse(localStorage.getItem(MOCK_KEY) || "[]");
      }
    };

    console.info("Loy Krathong: ใช้ฐานข้อมูลจำลองในเครื่อง (20 รายการเริ่มต้น)");
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
