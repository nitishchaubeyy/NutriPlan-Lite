
let foodDB = ""

async function getFoodDetails() {
    res = await fetch("./foodDB.json")
    foodDB = await res.json();
    console.log(foodDB)
    console.log(foodDB["apple"])
}

let currentTarget = 2000;
let currentConsumed = 0;
function updatePlan() {
    const w = parseFloat(document.getElementById('weight').value);
    const h = parseFloat(document.getElementById('height').value);
    const a = parseFloat(document.getElementById('age').value);
    if (h < 0 || h > 300) {
        alert("Height should be between 0 to 300 cm")
        return;
    }
    else if (w < 0 || w > 250) {
        alert("Weight should not more than 250 kg and less than 0 kg");
        return;
    }
    else if (w && h && a) {
        currentTarget = Math.round((10 * w + 6.25 * h - 5 * a + 5) * 1.2);
        document.getElementById('target-val').innerText = currentTarget;
        refreshUI();
    }
    else {
        alert("Please fill in all profile fields to calculate your goals.");
    }
}

// Add
async function addEntry() {
    await getFoodDetails()
    const inputEl = document.getElementById("food-input");
    const qtyEl = document.getElementById("qty-input");
    const name = inputEl.value.toLowerCase().trim();
    const qty = parseFloat(qtyEl.value) || 100;

    console.log(foodDB["apple"])
    if (!name) return;
    const baseCal = foodDB[name] ? foodDB[name].cal : 150;
    const totalAdded = Math.round((baseCal * qty) / 100);

    currentConsumed += totalAdded;

    const list = document.getElementById("log-list");
    if (currentConsumed === totalAdded) list.innerHTML = "";

    const div = document.createElement("div");
    div.className =
        "flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group";
    div.innerHTML = `
                <div class="flex flex-col">
                    <span class="capitalize font-bold text-base tracking-tight">${name}</span>
                    <span class="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">${qty}g Served</span>
                </div>
                <div class="text-right">
                    <span class="text-green-400 font-black text-lg">+${totalAdded}</span>
                    <span class="text-[10px] text-green-400/50 uppercase font-black ml-1">kcal</span>
                </div>
            `;
    list.prepend(div);

    refreshUI();
    inputEl.value = "";
    qtyEl.value = "";

    if (currentConsumed >= currentTarget) {
        document.getElementById("target-message").classList.remove("hidden");
    }
}

// Update the Progress UI
function refreshUI() {
    document.getElementById("consumed-val").innerText = currentConsumed;
    const percentage = Math.min(100, (currentConsumed / currentTarget) * 100);
    document.getElementById("progress-bar").style.width = percentage + "%";
}

