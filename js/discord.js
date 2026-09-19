// js/discord.js
let discordSelectedDate = new Date();
const dayButtonsContainer = document.getElementById('day-buttons');
const timeInput = document.getElementById('time-input');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copy-btn');
const copyStatus = document.getElementById('copy-status');

for (let i = 0; i < 7; i++) {
  const d = new Date();
  d.setDate(d.getDate() + i);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition flex justify-between items-center ${
    i === 0 
      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium' 
      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
  }`;
  
  const dayName = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' }));
  const formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  btn.innerHTML = `<span>${dayName}</span><span class="text-xs text-slate-500 font-mono">${formattedDate}</span>`;
  
  btn.onclick = () => {
    discordSelectedDate = d;
    document.querySelectorAll('#day-buttons button').forEach(b => {
      b.className = 'w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition flex justify-between items-center bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800';
    });
    btn.className = 'w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition flex justify-between items-center bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium';
    updateTimestamp();
  };

  dayButtonsContainer.appendChild(btn);
}

function updateTimestamp() {
  let raw = timeInput.value.replace(/[^0-9]/g, '');
  if (raw.length < 4) {
    output.textContent = '<t:0000000000:F>';
    return;
  }

  const hours = parseInt(raw.slice(0, 2), 10);
  const minutes = parseInt(raw.slice(2, 4), 10);

  if (hours > 23 || minutes > 59) {
    output.textContent = 'Invalid Time';
    return;
  }

  const target = new Date(discordSelectedDate);
  target.setHours(hours, minutes, 0, 0);

  const unixTime = Math.floor(target.getTime() / 1000);
  output.textContent = `<t:${unixTime}:F>`;
}

timeInput.addEventListener('input', updateTimestamp);
timeInput.value = "2000";
updateTimestamp();

copyBtn.onclick = async () => {
  const text = output.textContent;
  if (text.startsWith('<t:')) {
    await navigator.clipboard.writeText(text);
    copyStatus.classList.remove('opacity-0');
    setTimeout(() => copyStatus.classList.add('opacity-0'), 2000);
  }
};