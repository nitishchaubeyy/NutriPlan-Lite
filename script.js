
let foodDB = "";

let currentTarget = 2000;
let currentConsumed = 0;

document.addEventListener("DOMContentLoaded", () => {
  const profile = JSON.parse(localStorage.getItem("profile"));
  if (profile) {
    document.getElementById("age").value = profile.age;
    document.getElementById("weight").value = profile.weight;
    document.getElementById("height").value = profile.height;
  }

  currentTarget =
    Number(localStorage.getItem("currentTarget")) || currentTarget;

  currentConsumed =
    Number(localStorage.getItem("currentConsumed")) || 0;

  document.getElementById("target-val").innerText = currentTarget;

  const savedLogs = JSON.parse(localStorage.getItem("logs")) || [];
  const list = document.getElementById("log-list");
  list.innerHTML = "";

  savedLogs.forEach((log) => restoreLog(log));

  refreshUI();
});


async function getFoodDetails() {
  res = await fetch("./foodDB.json");
  foodDB = await res.json();
  console.log(foodDB);
  console.log(foodDB["apple"]);
}


function updatePlan() {
  const w = parseFloat(document.getElementById("weight").value);
  const h = parseFloat(document.getElementById("height").value);
  const a = parseFloat(document.getElementById("age").value);
  if (h < 0 || h > 300) {
    alert("Height should be between 0 to 300 cm");
    return;
  } else if (w < 0 || w > 250) {
    alert("Weight should not more than 250 kg and less than 0 kg");
    return;
  } else if (w && h && a) {
    currentTarget = Math.round((10 * w + 6.25 * h - 5 * a + 5) * 1.2);
    document.getElementById("target-val").innerText = currentTarget;
    refreshUI();
    localStorage.setItem(
      "profile",
      JSON.stringify({
        age: a,
        weight: w,
        height: h,
      }),
    );

    localStorage.setItem("currentTarget", currentTarget);
  } else {
    alert("Please fill in all profile fields to calculate your goals.");
  }
}

// Add
function addEntry() {
  const inputEl = document.getElementById("food-input");
  const qtyEl = document.getElementById("qty-input");

  const name = inputEl.value.toLowerCase().trim();
  const qty = parseFloat(qtyEl.value) || 100;

  if (!name) return;

  const baseCal = foodDB[name] ? foodDB[name].cal : 150;
  const totalAdded = Math.round((baseCal * qty) / 100);

  const list = document.getElementById("log-list");

  if (currentConsumed === 0) list.innerHTML = "";

  currentConsumed += totalAdded;

  const div = document.createElement("div");

  div.dataset.name = name;
  div.dataset.qty = qty;
  div.dataset.cal = totalAdded;

  div.className =
    "flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group";

  div.innerHTML = `
    <div class="flex flex-col">
        <span class="capitalize font-bold text-base tracking-tight">${name}</span>

        <span class="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1 qty-text">
          ${qty}g Served
        </span>
    </div>

    <div class="text-right flex items-center gap-4">

      <div>
        <span class="text-green-400 font-black text-lg cal-text">+${totalAdded}</span>
        <span class="text-[10px] text-green-400/50 uppercase font-black ml-1">kcal</span>
      </div>

      <!-- EDIT -->
      <button onclick="startEdit(this)"
        class="opacity-0 group-hover:opacity-100 text-yellow-400 hover:text-yellow-300 transition">
        <i class="fas fa-pen"></i>
      </button>

      <!-- SAVE -->
      <button onclick="saveEdit(this)"
        class="hidden text-green-400 hover:text-green-300 transition">
        <i class="fas fa-check"></i>
      </button>

      <!-- DELETE -->
      <button onclick="deleteEntry(this)"
        class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  list.prepend(div);

  refreshUI();
  saveLogs();


  inputEl.value = "";
  qtyEl.value = "";

  document
    .getElementById("target-message")
    .classList.toggle("hidden", currentConsumed < currentTarget);
}

function refreshUI() {
  document.getElementById("consumed-val").innerText = currentConsumed;
  const percentage = Math.min(100, (currentConsumed / currentTarget) * 100);
  document.getElementById("progress-bar").style.width = percentage + "%";
}

function saveLogs() {
  const cards = document.querySelectorAll("#log-list .group");
  const logs = [];

  cards.forEach(card => {
    logs.push({
      name: card.dataset.name,
      qty: Number(card.dataset.qty),
      cal: Number(card.dataset.cal)
    });
  });

  localStorage.setItem("logs", JSON.stringify(logs));
  localStorage.setItem("currentConsumed", currentConsumed);
}


function startEdit(btn) {
  const card = btn.closest(".group");

  const qtySpan = card.querySelector(".qty-text");
  const currentQty = card.dataset.qty;

  qtySpan.innerHTML = `
    <input type="number"
      min="1"
      class="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 qty-input-edit"
      value="${currentQty}">
  `;

  btn.classList.add("hidden");
  btn.nextElementSibling.classList.remove("hidden");
}

function saveEdit(btn) {
  const card = btn.closest(".group");

  const input = card.querySelector(".qty-input-edit");
  const newQty = parseFloat(input.value);

  if (!newQty || newQty <= 0) return;

  const name = card.dataset.name;
  const baseCal = foodDB[name]?.cal || 150;

  const newCalories = Math.round((baseCal * newQty) / 100);

  // adjust total
  currentConsumed -= parseInt(card.dataset.cal);
  currentConsumed += newCalories;

  // update data
  card.dataset.qty = newQty;
  card.dataset.cal = newCalories;

  // update UI
  card.querySelector(".qty-text").innerText = `${newQty}g Served`;
  card.querySelector(".cal-text").innerText = `+${newCalories}`;

  refreshUI();

  btn.classList.add("hidden");
  btn.previousElementSibling.classList.remove("hidden");

  document
    .getElementById("target-message")
    .classList.toggle("hidden", currentConsumed < currentTarget);
  
  saveLogs();

}

function deleteEntry(btn) {
  const card = btn.closest(".group");

  currentConsumed -= parseInt(card.dataset.cal);

  card.remove();

  refreshUI();

  if (!document.getElementById("log-list").children.length) {
    document.getElementById("log-list").innerHTML = `
      <p class="text-center text-white/30 py-10 font-medium italic">
        Your daily log is empty
      </p>`;
  }

  document.getElementById("target-message").classList.add("hidden");

  saveLogs();

}


function restoreLog(log) {
  const list = document.getElementById("log-list");

  const div = document.createElement("div");

  div.dataset.name = log.name;
  div.dataset.qty = log.qty;
  div.dataset.cal = log.cal;

  div.className =
    "flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group";

  div.innerHTML = `
    <div class="flex flex-col">
      <span class="capitalize font-bold text-base tracking-tight">${log.name}</span>
      <span class="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1 qty-text">
        ${log.qty}g Served
      </span>
    </div>

    <div class="text-right flex items-center gap-4">
      <div>
        <span class="text-green-400 font-black text-lg cal-text">+${log.cal}</span>
        <span class="text-[10px] text-green-400/50 uppercase font-black ml-1">kcal</span>
      </div>

      <button onclick="startEdit(this)"
        class="opacity-0 group-hover:opacity-100 text-yellow-400 hover:text-yellow-300 transition">
        <i class="fas fa-pen"></i>
      </button>

      <button onclick="saveEdit(this)"
        class="hidden text-green-400 hover:text-green-300 transition">
        <i class="fas fa-check"></i>
      </button>

      <button onclick="deleteEntry(this)"
        class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  list.prepend(div);
}
