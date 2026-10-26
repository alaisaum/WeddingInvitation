'use strict';

const RSVP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyuBTsm6aBwZ3IGMtZBlUPYMvfMMN-blcouamx5IZF1k2TOCcLq-lJQWx154-Lqh0Ypgw/exec';
const weddingDate = new Date('2026-11-21T14:00:00+08:00').getTime();
const $ = (selector) => document.querySelector(selector);

function updateCountdown() {
  const remaining = Math.max(0, weddingDate - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  $('#days').textContent = String(days).padStart(2, '0');
  $('#hours').textContent = String(hours).padStart(2, '0');
  $('#minutes').textContent = String(minutes).padStart(2, '0');
  $('#seconds').textContent = String(seconds).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

const audio = $('#weddingMusic');
const toggle = $('#musicToggle');
const progress = $('#musicProgress');
const status = $('#musicStatus');
const repeat = $('#musicRepeat');
const heartSymbol = toggle.querySelector('.heart-symbol');
let isOpened = false;
let loopEnabled = true;

function syncAudioUI() {
  const playing = !audio.paused && !audio.ended;
  toggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  toggle.setAttribute('aria-pressed', String(playing));
  heartSymbol.setAttribute('d', playing ? 'M20 16h4v17h-4z M28 16h4v17h-4z' : 'M22 16v17l13-8.5Z');
  if (playing) status.textContent = 'Playing our love song';
  else if (audio.error) status.textContent = 'Add assets/music1.mp3 to play';
  else status.textContent = 'Tap the heart to play';
}
function tryPlay() {
  // Called synchronously from a user click, so the browser can allow audio.
  try {
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => { status.textContent = 'Tap the heart to play'; syncAudioUI(); });
    }
  } catch (_) { status.textContent = 'Tap the heart to play'; }
}
function openInvitation() {
  if (isOpened) return;
  isOpened = true;
  $('#envelope').classList.add('opened');
  $('#openingScreen').classList.add('is-opened');
  $('#openingExtras').hidden = false;
  $('#waxSeal').disabled = true;
  tryPlay();
}
$('#waxSeal').addEventListener('click', openInvitation);
$('#envelope').addEventListener('click', (event) => {
  if (!isOpened && event.target !== $('#waxSeal')) openInvitation();
});
toggle.addEventListener('click', () => {
  if (audio.paused) tryPlay(); else audio.pause();
});
$('#musicRestart').addEventListener('click', () => { audio.currentTime = 0; if (audio.paused) tryPlay(); });
repeat.addEventListener('click', () => {
  loopEnabled = !loopEnabled;
  audio.loop = loopEnabled;
  repeat.classList.toggle('is-active', loopEnabled);
  repeat.setAttribute('aria-pressed', String(loopEnabled));
});
audio.addEventListener('play', syncAudioUI);
audio.addEventListener('pause', syncAudioUI);
audio.addEventListener('ended', syncAudioUI);
audio.addEventListener('error', syncAudioUI);
audio.addEventListener('timeupdate', () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const value = (audio.currentTime / audio.duration) * 100;
  progress.value = String(value);
  progress.style.setProperty('--music-progress', `${value}%`);
});
progress.addEventListener('input', () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  progress.style.setProperty('--music-progress', `${progress.value}%`);
});
$('#scrollIndicator').addEventListener('click', () => {
  $('#countdownSection').scrollIntoView({behavior: 'smooth', block: 'start'});
});
// No timed scrolling: guests choose when to continue.

const form = $('#rsvpForm');
const attendance = $('#attendance');
const count = $('#guestCount');
const guestNumberGroup = $('#guestNumberGroup');
const guestNamesSection = $('#guestNamesSection');
const guestNamesList = $('#guestNamesList');
function updateGuests() {
  const accepting = attendance.value === 'Joyfully Accept';
  guestNumberGroup.hidden = !accepting;
  guestNumberGroup.style.display = accepting ? '' : 'none';
  count.required = accepting;
  if (!accepting) count.value = '';
  const n = accepting ? Math.min(2, Math.max(0, Number(count.value || 0))) : 0;
  guestNamesSection.classList.toggle('show', n > 0);
  const previous = [...guestNamesList.querySelectorAll('input')].map(x => x.value);
  guestNamesList.replaceChildren();
  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'guest-name-field';
    const label = document.createElement('label');
    label.htmlFor = `guest${i + 1}`;
    label.textContent = `Guest ${i + 1} full name`;
    const input = document.createElement('input');
    input.id = `guest${i + 1}`;
    input.name = `guest${i + 1}`;
    input.type = 'text';
    input.required = true;
    input.placeholder = `Guest ${i + 1} name`;
    input.value = previous[i] || '';
    wrap.append(label, input);
    guestNamesList.append(wrap);
  }
}
attendance.addEventListener('change', updateGuests);
count.addEventListener('change', updateGuests);
updateGuests();
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const submit = form.querySelector('[type=submit]');
  const original = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'SENDING…';
  const payload = {
    name: $('#guestName').value.trim(),
    attendance: attendance.value,
    guestCount: attendance.value === 'Joyfully Accept' ? Number(count.value || 0) : 0,
    guest1: $('#guest1')?.value.trim() || '',
    guest2: $('#guest2')?.value.trim() || '',
    message: $('#guestMessage').value.trim()
  };
  try {
    // Apps Script commonly uses an opaque no-cors response. A resolved fetch
    // means sent, but cannot confirm that Google Sheets saved the entry.
    await fetch(RSVP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload)
    });
    $('#rsvpSuccess').classList.add('show');
    $('#rsvpSuccess').querySelector('.success-text').textContent =
      'Your RSVP was sent. Thank you! We look forward to celebrating with you.';
    form.hidden = true;
  } catch (error) {
    let message = $('#rsvpError');
    if (!message) {
      message = document.createElement('p');
      message.id = 'rsvpError';
      message.setAttribute('role', 'alert');
      message.style.cssText = 'color:#9c4260;font-size:13px;line-height:1.5;margin-top:12px';
      form.append(message);
    }
    message.textContent = 'Unable to send your RSVP right now. Please check your connection and try again.';
  } finally {
    submit.disabled = false;
    submit.textContent = original;
  }
});