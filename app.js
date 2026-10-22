
const form = document.querySelector("#wish-form");
const nicknameInput = document.querySelector("#nickname");
const prayerInput = document.querySelector("#prayer");
const wishesList = document.querySelector("#wishes-list");
const message = document.querySelector("#message");
const flowerButtons = document.querySelectorAll(".flower-choice");

let selectedFlower = "🪷";

flowerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedFlower = button.dataset.flower;

    flowerButtons.forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const nickname = nicknameInput.value.trim();
  const prayer = prayerInput.value.trim();

  if (!nickname || !prayer) {
    message.textContent = "กรุณากรอกชื่อเล่นและคำอธิษฐาน";
    return;
  }

  if (nickname.length > 30 || prayer.length > 300) {
    message.textContent = "ชื่อเล่นไม่เกิน 30 และคำอธิษฐานไม่เกิน 300 ตัวอักษร";
    return;
  }

  const card = document.createElement("article");
  card.className = "wish-card";

  const flower = document.createElement("span");
  flower.className = "wish-flower";
  flower.textContent = selectedFlower;

  const content = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = nickname;

  const words = document.createElement("p");
  words.textContent = prayer;

  content.append(name, words);
  card.append(flower, content);
  wishesList.prepend(card);

  form.reset();
  selectedFlower = "🪷";
  flowerButtons.forEach((button, index) => {
    button.classList.toggle("selected", index === 0);
  });

  message.textContent = "เพิ่มคำอธิษฐานบนหน้าเว็บแล้ว ✨";
});
