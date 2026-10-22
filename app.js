
const krathongs = document.querySelectorAll(".krathong");
const startButton = document.querySelector("#start-button");
const status = document.querySelector("#status");

let selectedKrathong = "lotus";

const krathongNames = {
  lotus: "บัวชมพู",
  marigold: "ดาวเรืองทอง",
  banana: "ใบตองธรรมชาติ",
};

krathongs.forEach((button) => {
  button.addEventListener("click", () => {
    selectedKrathong = button.dataset.flower;

    krathongs.forEach((item) => {
      const isSelected = item === button;

      item.classList.toggle("selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    status.textContent =
      `คุณเลือก${krathongNames[selectedKrathong]}แล้ว`;
  });
});

startButton.addEventListener("click", () => {
  status.textContent =
    `กระทง${krathongNames[selectedKrathong]}พร้อมแล้ว — ขั้นตอนถัดไปคือเขียนคำอธิษฐาน`;
});
