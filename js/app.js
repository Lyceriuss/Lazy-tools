// js/app.js
function switchTab(tab) {
  const discordTab = document.getElementById('tab-discord');
  const dietTab = document.getElementById('tab-diet');
  const discordBtn = document.getElementById('tab-discord-btn');
  const dietBtn = document.getElementById('tab-diet-btn');

  if (tab === 'discord') {
    discordTab.classList.remove('hidden');
    dietTab.classList.add('hidden');
    discordBtn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition bg-indigo-600 text-white shadow';
    dietBtn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition text-slate-400 hover:text-white';
  } else {
    discordTab.classList.add('hidden');
    dietTab.classList.remove('hidden');
    dietBtn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition bg-emerald-600 text-white shadow';
    discordBtn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition text-slate-400 hover:text-white';
    
    // Call the diet render function when swapping tabs
    if (typeof renderDietWeek === "function") {
      renderDietWeek();
    }
  }
}