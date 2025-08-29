
/* QuizLab SPA
   - Demo auth via localStorage (signup/login)
   - Category dashboard
   - Quiz with 10 random questions, changeable answers until submit
   - Review page with per-question feedback
   - Theme toggle
*/

// ---------- Helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const store = {
  get(key, def=null){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch{ return def } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  del(key){ localStorage.removeItem(key); }
};

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ---------- Auth ----------
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function switchAuthTab(name){
  $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  $$('#auth-screen .form').forEach(f=>f.classList.remove('visible'));
  $(`#${name}-form`).classList.add('visible');
}

function initAuth(){
  // Tabs
  $$('.tab').forEach(tab=>{
    tab.addEventListener('click', ()=> switchAuthTab(tab.dataset.tab));
  });

  // Sign up
  $('#signup-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim().toLowerCase();
    const pass = $('#signup-password').value;

    if(pass.length < 6) return alert('Password must be at least 6 characters.');
    const users = store.get('users', {});
    if(users[email]) return alert('Account already exists. Please log in.');
    users[email] = { name, email, passHash: btoa(pass) };
    store.set('users', users);
    store.set('session', { email });
    onLogin();
  });

  // Login
  $('#login-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = $('#login-email').value.trim().toLowerCase();
    const pass = $('#login-password').value;
    const users = store.get('users', {});
    const u = users[email];
    if(!u) return alert('No account found. Please sign up.');
    if(u.passHash !== btoa(pass)) return alert('Incorrect password.');
    store.set('session', { email });
    onLogin();
  });
}

function onLogin(){
  const session = store.get('session');
  if(!session) return;
  const users = store.get('users', {});
  const u = users[session.email];
  $('#welcome').textContent = `Hi, ${u?.name || 'User'}`;
  hide($('#auth-screen'));
  show($('#topbar'));
  show($('#dashboard'));
}

function logout(){
  store.del('session');
  // Hide all sections except auth screen
  hide($('#topbar'));
  hide($('#dashboard'));
  hide($('#quiz-screen'));
  hide($('#review-screen'));
  // Show auth screen and reset forms
  show($('#auth-screen'));
  document.getElementById('login-form').reset();
  document.getElementById('signup-form').reset();
  switchAuthTab('login');
}

// ---------- Dashboard & Category loading ----------
const CATEGORY_MAP = {
  programming: 'Programming',
  cybersecurity: 'Cyber Security',
  machine_learning: 'Machine Learning',
  web_development: 'Web Development',
  microservices: 'Microservices',
  devops: 'DevOps',
  software_development: 'Software Development',
  data_science: 'Data Science',
};

let state = {
  category: null,
  questions: [], // 10 selected
  index: 0,
  answers: {}, // qIndex -> selected option text
  submitted: false,
};

async function loadCategory(catKey){
  const file = `${catKey}.json`;
  const res = await fetch(file);
  const all = await res.json();
  const picked = shuffle(all).slice(0, 10);
  state = { category: catKey, questions: picked, index: 0, answers: {}, submitted: false };
  $('#quiz-title').textContent = `Quiz • ${CATEGORY_MAP[catKey]}`;
  renderQuestion();
  hide($('#dashboard'));
  show($('#quiz-screen'));
}

// ---------- Quiz Rendering ----------
function renderProgress(){
  const pct = (state.index / state.questions.length) * 100;
  $('#progress').style.width = `${pct}%`;
}

function renderQuestion(){
  const q = state.questions[state.index];
  $('#question').textContent = `${state.index+1}. ${q.question}`;
  const options = $('#options');
  options.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt;
    if(state.answers[state.index] === opt) btn.classList.add('selected');
    btn.addEventListener('click', ()=>{
      state.answers[state.index] = opt;
      // allow change until submit: merely mark selected
      $$('.option').forEach(o=>o.classList.remove('selected'));
      btn.classList.add('selected');
    });
    options.appendChild(btn);
  });

  // buttons
  $('#prev-btn').disabled = state.index === 0;
  $('#next-btn').disabled = state.index >= state.questions.length-1;
  renderProgress();
}

// Navigation
$('#prev-btn')?.addEventListener('click', ()=>{
  if(state.index>0){ state.index--; renderQuestion(); }
});
$('#next-btn')?.addEventListener('click', ()=>{
  if(state.index < state.questions.length-1){ state.index++; renderQuestion(); }
});

// Submit
$('#submit-btn')?.addEventListener('click', ()=>{
  // Validate all answered?
  const unanswered = [];
  for(let i=0;i<state.questions.length;i++){
    if(!state.answers[i]) unanswered.push(i+1);
  }
  if(unanswered.length){
    const go = confirm(`You have unanswered questions: ${unanswered.join(', ')}.\nSubmit anyway?`);
    if(!go) return;
  }
  state.submitted = true;
  showReview();
});

// ---------- Review Page ----------
function showReview(){
  let correctCount = 0;
  const list = $('#review-list');
  list.innerHTML = '';
  state.questions.forEach((q, i)=>{
    const your = state.answers[i] ?? '(no answer)';
    const isCorrect = your === q.answer;
    if(isCorrect) correctCount++;
    const item = document.createElement('div');
    item.className = 'review-item ' + (isCorrect ? 'correct' : 'wrong');
    item.innerHTML = `
      <div class="muted">Q${i+1}</div>
      <div><strong>${q.question}</strong></div>
      <div>Your answer: <span class="${isCorrect ? 'muted' : ''}">${your}</span></div>
      <div>Correct answer: <strong>${q.answer}</strong></div>
    `;
    list.appendChild(item);
  });
  $('#score').textContent = `Score: ${correctCount} / ${state.questions.length}`;
  hide($('#quiz-screen'));
  show($('#review-screen'));
}

// ---------- Theme ----------
function initTheme() {
  // Check for saved user preference, if any, on load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // If no saved preference, check system preference
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    // Default to light theme
    document.documentElement.setAttribute('data-theme', 'light');
  }
  updateThemeToggle();
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) { // Only if user hasn't set a preference
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeToggle();
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeToggle();
}

function updateThemeToggle() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.setAttribute('title', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

// Initialize theme toggle
$('#theme-toggle')?.addEventListener('click', toggleTheme);

// Initialize theme when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  
  // Initialize category buttons
  $$('.category').forEach(btn => {
    btn.addEventListener('click', () => loadCategory(btn.dataset.cat));
  });
  
  // Ensure dashboard is hidden if user is not logged in
  if (!store.get('session')) {
    hide($('#dashboard'));
    hide($('#topbar'));
    show($('#auth-screen'));
  }
});

// ---------- Header buttons ----------
$('#back-to-dashboard')?.addEventListener('click', ()=>{
  hide($('#quiz-screen')); show($('#dashboard'));
});
$('#back-to-categories')?.addEventListener('click', ()=>{
  hide($('#review-screen')); show($('#dashboard'));
});
$('#home-btn')?.addEventListener('click', ()=>{
  hide($('#review-screen')); show($('#dashboard'));
});
$('#retry-btn')?.addEventListener('click', ()=>{
  // Reset quiz state and reload the same category
  state = {
    questions: [],
    answers: [],
    index: 0,
    submitted: false,
    category: state.category
  };
  
  // Hide review screen and show quiz screen
  hide($('#review-screen'));
  show($('#quiz-screen'));
  
  // Reload the same category with fresh questions
  loadCategory(state.category);
  
  // Reset to first question
  renderQuestion();
});
$('#logout')?.addEventListener('click', logout);

// ---------- Category clicks ----------
$$('.category').forEach(btn=>{
  btn.addEventListener('click', ()=> loadCategory(btn.dataset.cat));
});

// ---------- Boot ----------
initAuth();
if(store.get('session')){
  onLogin();
}
