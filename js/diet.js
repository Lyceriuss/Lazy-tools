// js/diet.js

const RDI_PRIMARY = {
  "vitamin c": 75, "vitamin d": 10, "vitamin e": 12, "vitamin b6": 1.5, "vitamin b12": 2.5,
  "folat, totalt": 300, "järn, fe": 15, "kalcium, ca": 800, "zink, zn": 9, "magnesium, mg": 350,
  "kalium, k": 3100, "fosfor, p": 600, "selen, se": 55, "jod, i": 150, "fiber": 30
};

const RDI_SECONDARY = {
  "tiamin": 1.1, "riboflavin": 1.4, "niacin": 16, "vitamin a": 800, "natrium, na": 2400,
  "salt, nacl": 6, "sockerarter, totalt": 50, "summa mättade fettsyror": 20, 
  "summa enkelomättade fettsyror": 30, "summa fleromättade fettsyror": 15, "kolesterol": 300
};

// En sammanslagen lista som appen använder för att spara all data i bakgrunden
const ALL_MICROS = { ...RDI_PRIMARY, ...RDI_SECONDARY };

const RDI_UNITS = {
  "vitamin c": "mg", "vitamin d": "µg", "vitamin e": "mg", "vitamin b6": "mg", "vitamin b12": "µg",
  "folat, totalt": "µg", "järn, fe": "mg", "kalcium, ca": "mg", "zink, zn": "mg", "magnesium, mg": "mg",
  "kalium, k": "mg", "fosfor, p": "mg", "selen, se": "µg", "jod, i": "µg", "fiber": "g",
  "tiamin": "mg", "riboflavin": "mg", "niacin": "mg", "vitamin a": "µg", "natrium, na": "mg",
  "salt, nacl": "g", "sockerarter, totalt": "g", "summa mättade fettsyror": "g", 
  "summa enkelomättade fettsyror": "g", "summa fleromättade fettsyror": "g", "kolesterol": "mg"
};

let dietData = JSON.parse(localStorage.getItem('lazy_diet_data')) || {
  "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [],
  "Friday": [], "Saturday": [], "Sunday": []
};

let targets = JSON.parse(localStorage.getItem('lazy_diet_targets')) || {
  kcal: 2500, p: 160, c: 250, f: 70
};

let mealTemplates = JSON.parse(localStorage.getItem('lazy_diet_templates')) || [];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let currentDietDay = "Monday";
let currentMealIngredients = [];
let editingMealIndex = null;

// Cache för den tunga JSON-filen
let deepDatabaseCache = null;

function saveDietData() { localStorage.setItem('lazy_diet_data', JSON.stringify(dietData)); }
function saveTargetsData() { localStorage.setItem('lazy_diet_targets', JSON.stringify(targets)); }
function saveDietTemplates() { localStorage.setItem('lazy_diet_templates', JSON.stringify(mealTemplates)); }

// --- DROPDOWN LOGIK ---
const categoryFilter = document.getElementById('category-filter');
const foodSelect = document.getElementById('food-select');
const ingredientWeight = document.getElementById('ingredient-weight');

function updateFoodDropdown() {
    const selectedCategory = categoryFilter.value;
    foodSelect.innerHTML = '';
    
    const filteredFoods = LOCAL_DB.filter(food => {
        const namn = food.name.toLowerCase();

        if (selectedCategory === "Kött") {
            const kottOrd = ["kyckling", "gris", "fläsk", "bacon", "skinka", "lamm", "nöt ", "nötfärs", "blandfärs", "ox", "kalv", "lax", "torsk", "pollock", "sej", "räk", "sill", "strömming", "tonfisk", "fisk"];
            return kottOrd.some(ord => namn.includes(ord));
        } 
        else if (selectedCategory === "Kolhydrat") {
            const kolhydratOrd = ["potatis", "pommes", "pasta", "makaroner", "spaghetti", "havre"];
            const isVanligKolhydrat = kolhydratOrd.some(ord => namn.includes(ord));
            const isRis = namn.includes("ris") && !namn.includes("gris") && !namn.includes("krisp");
            return isVanligKolhydrat || isRis;
        } 
        else if (selectedCategory === "Frön") {
            const froOrd = ["frö", "kärnor", "chia"];
            return froOrd.some(ord => namn.includes(ord));
        } 
        else if (selectedCategory === "Övrigt") {
            const isKott = ["kyckling", "gris", "fläsk", "lamm", "nöt ", "lax", "torsk", "fisk", "räk"].some(ord => namn.includes(ord));
            const isKolhydrat = ["potatis", "pasta", "havre"].some(ord => namn.includes(ord)) || (namn.includes("ris") && !namn.includes("gris"));
            const isFro = ["frö", "kärnor"].some(ord => namn.includes(ord));
            return !isKott && !isKolhydrat && !isFro;
        }

        return true;
    });
    
    filteredFoods.sort((a, b) => a.name.localeCompare(b.name));

    if (filteredFoods.length === 0) {
        foodSelect.innerHTML = '<option value="">Inga råvaror hittades</option>';
        return;
    }

    filteredFoods.forEach(food => {
        const option = document.createElement('option');
        option.value = food.id;
        option.textContent = food.name;
        foodSelect.appendChild(option);
    });
}

// Ladda JSON-filen om den inte redan är laddad
async function fetchDeepDatabase() {
    if (deepDatabaseCache) return deepDatabaseCache;
    try {
        const response = await fetch('diet_database.json');
        deepDatabaseCache = await response.json();
        return deepDatabaseCache;
    } catch (e) {
        console.error("Kunde inte hämta diet_database.json", e);
        return null;
    }
}

// ----------------------

function openTargetsModal() {
  document.getElementById('target-kcal').value = targets.kcal;
  document.getElementById('target-p').value = targets.p;
  document.getElementById('target-c').value = targets.c;
  document.getElementById('target-f').value = targets.f;
  document.getElementById('targets-modal').classList.remove('hidden');
}

function saveTargets() {
  targets.kcal = parseInt(document.getElementById('target-kcal').value) || 0;
  targets.p = parseInt(document.getElementById('target-p').value) || 0;
  targets.c = parseInt(document.getElementById('target-c').value) || 0;
  targets.f = parseInt(document.getElementById('target-f').value) || 0;
  saveTargetsData();
  document.getElementById('targets-modal').classList.add('hidden');
  renderDayFocus();
}

function renderDietWeek() {
  const container = document.getElementById('diet-week-days');
  container.innerHTML = '';
  daysOfWeek.forEach(day => {
    const meals = dietData[day] || [];
    const totalKcal = meals.reduce((sum, m) => sum + (m.macros?.kcal || 0), 0);
    const completedMeals = meals.filter(m => m.completed).length;
    const isSelected = day === currentDietDay;
    const isAllDone = meals.length > 0 && completedMeals === meals.length;

    const btn = document.createElement('button');
    btn.onclick = () => { currentDietDay = day; renderDietWeek(); };
    btn.className = `p-3 rounded-xl border text-left transition flex flex-col justify-between ${
      isSelected ? 'bg-emerald-600/20 border-emerald-500/50 shadow' : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
    } ${isAllDone && !isSelected ? 'border-emerald-900/50 opacity-70' : ''}`;

    btn.innerHTML = `
      <div class="flex justify-between items-center w-full text-xs uppercase tracking-wide font-medium ${isSelected ? 'text-emerald-300' : 'text-slate-400'}">
        ${day.slice(0, 3)}
        ${isAllDone ? '<span class="text-emerald-500">✓</span>' : ''}
      </div>
      <div class="text-sm font-mono mt-1 ${isSelected ? 'text-white' : 'text-slate-300'} font-bold">${Math.round(totalKcal)} <span class="text-[10px] font-normal text-slate-500">kcal</span></div>
      <div class="text-[10px] text-slate-500 mt-0.5">${completedMeals}/${meals.length} done</div>
    `;
    container.appendChild(btn);
  });
  renderDayFocus();
}

function updateProgressBar(id, current, target) {
  const bar = document.getElementById(`prog-${id}-bar`);
  const text = document.getElementById(`prog-${id}-text`);
  const percent = Math.min((current / (target || 1)) * 100, 100);
  bar.style.width = `${percent}%`;
  text.textContent = `${Math.round(current)}/${target}`;
}

function renderDayFocus() {
  document.getElementById('current-day-heading').textContent = currentDietDay;
  const meals = dietData[currentDietDay] || [];
  
  let dayKcal = 0, dayP = 0, dayC = 0, dayF = 0;
  
  // Skapa totalt spårningsobjekt för alla mikros
  let dayMicros = {};
  for (let key in ALL_MICROS) dayMicros[key] = 0;

  meals.forEach(m => { 
      dayKcal += m.macros.kcal; 
      dayP += m.macros.p; 
      dayC += m.macros.c; 
      dayF += m.macros.f; 
      
      if (m.micros) {
          for (let key in ALL_MICROS) {
              dayMicros[key] += (m.micros[key] || 0);
          }
      }
  });

  // 1. Uppdatera Energimätaren
  const kcalTarget = targets.kcal || 1;
  const kcalPercent = Math.min(Math.round((dayKcal / kcalTarget) * 100), 100);
  document.getElementById('prog-kcal-current').textContent = Math.round(dayKcal);
  document.getElementById('prog-kcal-target').textContent = `/ ${targets.kcal} kcal`;
  document.getElementById('prog-kcal-bar').style.width = `${kcalPercent}%`;
  document.getElementById('prog-kcal-percent').textContent = `${kcalPercent}%`;

  // 2. Uppdatera Makros
  updateProgressBar('p', dayP, targets.p);
  updateProgressBar('f', dayF, targets.f);
  updateProgressBar('c', dayC, targets.c);

  // 3. Hjälpfunktion för att rita ut de små mikrokorten med dubbla staplar (Överfyllnad)
  const renderMicroCards = (dataset, targetRDIList) => {
      return Object.keys(targetRDIList).map(key => {
          let currentAmount = dataset[key] || 0;
          let targetRDI = targetRDIList[key];
          let unit = RDI_UNITS[key] || "";
          
          let displayPercent = Math.round((currentAmount / targetRDI) * 100);
          
          // Bas-stapel (0-100%)
          let basePercentage = Math.min(displayPercent, 100);
          // Överfyllnads-stapel (100-200%) - drar av 100 och maxar på 100
          let extraPercentage = Math.max(0, Math.min(displayPercent - 100, 100));
          
          let niceName = key.split(',')[0].charAt(0).toUpperCase() + key.split(',')[0].slice(1);
          let displayAmount = currentAmount < 10 ? currentAmount.toFixed(1) : Math.round(currentAmount);
          
          // Färgkodning text: Blå om > 100, Grön vid exakt 100, Gul vid > 50
          let textColor = displayPercent > 100 ? 'text-sky-400' : (displayPercent === 100 ? 'text-emerald-400' : (displayPercent >= 50 ? 'text-amber-400' : 'text-slate-400'));
          
          // Färgkodning bas-stapel
          let baseColor = displayPercent >= 100 ? 'bg-emerald-500' : (displayPercent >= 50 ? 'bg-amber-400' : 'bg-slate-600');
          
          return `
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div class="flex justify-between items-end text-[10px] mb-1.5 gap-2">
                <span class="text-slate-400 uppercase font-bold tracking-wider truncate" title="${niceName}">${niceName}</span>
                <span class="${textColor} font-mono font-medium whitespace-nowrap">${displayAmount}/${targetRDI}${unit} (${displayPercent}%)</span>
              </div>
              
              <!-- Mätare med dubbla lager för överfyllnad -->
              <div class="w-full bg-slate-950 rounded-full h-1 relative overflow-hidden">
                <div class="${baseColor} absolute left-0 top-0 h-1 rounded-full transition-all duration-500" style="width: ${basePercentage}%"></div>
                <div class="bg-sky-500 absolute left-0 top-0 h-1 rounded-full transition-all duration-500" style="width: ${extraPercentage}%"></div>
              </div>
            </div>
          `;
      }).join('');
  };

  // Rita ut de två griden
  const microContainer = document.getElementById('daily-micros-grid');
  const extraContainer = document.getElementById('daily-extras-grid');
  
  if (microContainer) microContainer.innerHTML = renderMicroCards(dayMicros, RDI_PRIMARY);
  if (extraContainer) extraContainer.innerHTML = renderMicroCards(dayMicros, RDI_SECONDARY);

  // 4. Rita ut måltiderna
  const container = document.getElementById('meals-container');
  if (meals.length === 0) {
    container.innerHTML = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">No meals logged today.</div>`;
    return;
  }

  container.innerHTML = meals.map((meal, mealIdx) => `
    <div class="bg-slate-900 border ${meal.completed ? 'border-emerald-800/50 bg-slate-900/40' : 'border-slate-800'} rounded-xl p-4 transition duration-300">
      <div class="flex items-center justify-between border-b border-slate-800/50 pb-2 mb-2">
        <div class="flex items-center gap-3">
          <input type="checkbox" ${meal.completed ? 'checked' : ''} onchange="toggleMealStatus(${mealIdx})" class="w-5 h-5 accent-emerald-500 rounded border-slate-700 bg-slate-900 cursor-pointer">
          <h4 class="font-bold text-white text-sm ${meal.completed ? 'line-through text-slate-400' : ''}">${meal.name}</h4>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-mono text-amber-400 font-bold">${Math.round(meal.macros.kcal)} kcal</span>
          <button onclick="editMeal(${mealIdx})" class="text-xs text-sky-400 hover:text-sky-300 font-medium">Edit</button>
          <button onclick="deleteMeal(${mealIdx})" class="text-xs text-rose-400 hover:text-rose-300 font-medium">&times;</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5 ${meal.completed ? 'opacity-50' : ''}">
        ${meal.items.map(item => `<span class="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg text-xs text-slate-300">${item.name} (${item.weight}g)</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function toggleMealStatus(index) {
  dietData[currentDietDay][index].completed = !dietData[currentDietDay][index].completed;
  saveDietData();
  renderDietWeek();
}

function deleteMeal(index) {
  dietData[currentDietDay].splice(index, 1);
  saveDietData();
  renderDietWeek();
}

function openMealModal() {
  editingMealIndex = null;
  currentMealIngredients = [];
  
  document.getElementById('modal-title').textContent = "Create Meal";
  document.getElementById('modal-day-title').textContent = `Adding meal to ${currentDietDay}`;
  document.getElementById('modal-meal-name').value = '';
  document.getElementById('save-as-template').checked = false;
  
  updateFoodDropdown(); 
  renderModalIngredients();
  document.getElementById('meal-modal').classList.remove('hidden');
}

function editMeal(index) {
  editingMealIndex = index;
  const meal = dietData[currentDietDay][index];
  currentMealIngredients = JSON.parse(JSON.stringify(meal.items));
  
  document.getElementById('modal-title').textContent = "Edit Meal";
  document.getElementById('modal-day-title').textContent = `Updating meal on ${currentDietDay}`;
  document.getElementById('modal-meal-name').value = meal.name;
  document.getElementById('save-as-template').checked = false;
  
  updateFoodDropdown();
  renderModalIngredients();
  document.getElementById('meal-modal').classList.remove('hidden');
}

function closeMealModal() { document.getElementById('meal-modal').classList.add('hidden'); }

// --- LOGIK FÖR ATT LÄGGA TILL VIA JSON ---
async function addIngredientToCurrentMeal() {
  const foodId = foodSelect.value;
  if (!foodId) return;

  const weight = parseFloat(ingredientWeight.value);
  if (isNaN(weight) || weight <= 0) return alert("Ange en giltig vikt i gram.");

  const btn = document.getElementById('add-btn');
  btn.textContent = "...";
  
  const baseFood = LOCAL_DB.find(f => f.id == foodId);
  const ratio = weight / 100;
  
  const deepDb = await fetchDeepDatabase();
  const deepInfo = deepDb && deepDb[foodId] ? deepDb[foodId].nutrients : {};

  // Räkna ut mikronäring för denna vikt på ALLA 26 spårämnen
  let scaledMicros = {};
  for (let key in ALL_MICROS) {
     scaledMicros[key] = (deepInfo[key] || 0) * ratio;
  }

  currentMealIngredients.push({ 
      id: baseFood.id,
      name: baseFood.name, 
      weight: weight, 
      p: baseFood.p * ratio, 
      c: baseFood.c * ratio, 
      f: baseFood.f * ratio, 
      kcal: baseFood.kcal * ratio,
      micros: scaledMicros
  });
  
  ingredientWeight.value = '100';
  btn.textContent = "Lägg till";
  renderModalIngredients();
}

function removeModalIngredient(idx) { currentMealIngredients.splice(idx, 1); renderModalIngredients(); }

function renderModalIngredients() {
  const container = document.getElementById('modal-ingredients-list');
  const rdiContainer = document.getElementById('rdi-container');
  
  if (currentMealIngredients.length === 0) {
    container.innerHTML = '<p class="text-slate-500 italic py-2">No ingredients added yet.</p>';
    rdiContainer.innerHTML = '';
  } else {
    container.innerHTML = currentMealIngredients.map((item, idx) => `
      <div class="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
        <div><span class="font-medium text-slate-200">${item.name}</span> <span class="text-slate-500 text-[11px]">(${item.weight}g)</span></div>
        <div class="flex items-center gap-2 font-mono"><span class="text-amber-400">${Math.round(item.kcal)} kcal</span><button onclick="removeModalIngredient(${idx})" class="text-rose-400 hover:text-rose-300 ml-1">&times;</button></div>
      </div>`).join('');
  }

  let totals = { k:0, p:0, c:0, f:0 };
  let totalMicros = {};
  
  for (let key in ALL_MICROS) totalMicros[key] = 0;

  currentMealIngredients.forEach(i => {
      totals.k += i.kcal; totals.p += i.p; totals.c += i.c; totals.f += i.f;
      if (i.micros) {
          for (let key in ALL_MICROS) {
              totalMicros[key] += (i.micros[key] || 0);
          }
      }
  });

  document.getElementById('modal-total-kcal').textContent = `${Math.round(totals.k)} kcal`;
  document.getElementById('modal-total-p').textContent = `${Math.round(totals.p)}g P`;
  document.getElementById('modal-total-c').textContent = `${Math.round(totals.c)}g C`;
  document.getElementById('modal-total-f').textContent = `${Math.round(totals.f)}g F`;

  // Visa BARA de primära RDI i modalen så den inte blir för enorm
  if (currentMealIngredients.length > 0) {
      rdiContainer.innerHTML = Object.keys(RDI_PRIMARY).map(key => {
          let currentAmount = totalMicros[key] || 0;
          let targetRDI = RDI_PRIMARY[key];
          let percentage = Math.min(Math.round((currentAmount / targetRDI) * 100), 999);
          let niceName = key.split(',')[0].charAt(0).toUpperCase() + key.split(',')[0].slice(1);
          
          let color = percentage >= 100 ? 'text-emerald-400' : (percentage >= 50 ? 'text-amber-400' : 'text-slate-500');
          
          return `
            <div class="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
               <span class="truncate pr-1">${niceName}</span>
               <span class="${color} font-bold">${percentage}%</span>
            </div>
          `;
      }).join('');
  }
}

function saveMealToDay() {
  const name = document.getElementById('modal-meal-name').value.trim() || "Meal";
  if (currentMealIngredients.length === 0) return alert("Add ingredients first.");

  let totals = currentMealIngredients.reduce((acc, i) => { acc.k+=i.kcal; acc.p+=i.p; acc.c+=i.c; acc.f+=i.f; return acc; }, {k:0,p:0,c:0,f:0});

  let totalMicros = {};
  for (let key in ALL_MICROS) totalMicros[key] = 0;
  currentMealIngredients.forEach(i => {
      if (i.micros) {
          for (let key in ALL_MICROS) totalMicros[key] += (i.micros[key] || 0);
      }
  });

  const newMeal = { 
      name, 
      items: [...currentMealIngredients], 
      macros: { kcal: totals.k, p: totals.p, c: totals.c, f: totals.f }, 
      micros: totalMicros, // Sparar alla mikros på måltidsnivå
      completed: false 
  };

  // Kolla om användaren vill spara detta som en mall också
  const isTemplate = document.getElementById('save-as-template') && document.getElementById('save-as-template').checked;
  if (isTemplate) {
      mealTemplates.push({
          name: name,
          items: JSON.parse(JSON.stringify(currentMealIngredients)),
          macros: JSON.parse(JSON.stringify(newMeal.macros)),
          micros: JSON.parse(JSON.stringify(totalMicros))
      });
      saveDietTemplates();
  }

  if (editingMealIndex !== null) {
    newMeal.completed = dietData[currentDietDay][editingMealIndex].completed;
    dietData[currentDietDay][editingMealIndex] = newMeal;
  } else {
    dietData[currentDietDay].push(newMeal);
  }

  saveDietData();
  closeMealModal();
  renderDietWeek();
}

// --- MALL (TEMPLATE) LOGIK ---
function openTemplatesModal() {
    renderTemplatesList();
    document.getElementById('templates-modal').classList.remove('hidden');
}

function closeTemplatesModal() {
    document.getElementById('templates-modal').classList.add('hidden');
}

function renderTemplatesList() {
    const container = document.getElementById('templates-list');
    if (mealTemplates.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">Du har inga sparade mallar ännu. Skapa en måltid och kryssa i "Spara som mall".</p>';
        return;
    }

    container.innerHTML = mealTemplates.map((tpl, idx) => `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-indigo-500/50 transition">
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-bold text-white text-sm">${tpl.name}</h4>
                <div class="flex gap-2">
                    <button onclick="addTemplateToDay(${idx})" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow">Lägg till i ${currentDietDay.slice(0,3)}</button>
                    <button onclick="deleteTemplate(${idx})" class="text-rose-400 hover:text-rose-300 px-2 font-bold text-lg">&times;</button>
                </div>
            </div>
            <div class="flex gap-3 text-xs font-mono border-b border-slate-800 pb-2 mb-2">
                <span class="text-amber-400">${Math.round(tpl.macros.kcal)} kcal</span>
                <span class="text-sky-400">${Math.round(tpl.macros.p)}g P</span>
                <span class="text-emerald-400">${Math.round(tpl.macros.c)}g C</span>
                <span class="text-rose-400">${Math.round(tpl.macros.f)}g F</span>
            </div>
            <div class="flex flex-wrap gap-1">
                ${tpl.items.map(item => `<span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">${item.name}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function addTemplateToDay(idx) {
    const tpl = mealTemplates[idx];
    
    // Gör en djupkopia så att vi inte råkar redigera mallen när vi redigerar dagens måltid
    const newMeal = {
        name: tpl.name,
        items: JSON.parse(JSON.stringify(tpl.items)),
        macros: JSON.parse(JSON.stringify(tpl.macros)),
        micros: JSON.parse(JSON.stringify(tpl.micros)),
        completed: false
    };

    dietData[currentDietDay].push(newMeal);
    saveDietData();
    closeTemplatesModal();
    renderDietWeek();
}

function deleteTemplate(idx) {
    if (confirm("Är du säker på att du vill ta bort denna mall?")) {
        mealTemplates.splice(idx, 1);
        saveDietTemplates();
        renderTemplatesList();
    }
}