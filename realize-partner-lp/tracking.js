/* REALIZE PARTNER: native FormSubmit receipt redirect -> one lead per submission.
 * IDs come from the account setup; no name, email or phone is sent to ad tags.
 * A pending session token is a client-side guard, not a server receipt signature.
 */
(() => {
  'use strict';
  const PIXEL = '1431125817444550';
  const GOOGLE = 'AW-18447736878';
  const DESTINATION = GOOGLE + '/RvvvCO_So68dEK7AyNxE';
  const BASE = 'https://nrealize04784-sys.github.io/jinnsei-siennkeiei/realize-partner-lp/';
  const PENDING = 'rp.partner.pending.v1';
  const SOURCE = 'rp.partner.source.v1';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const form = document.getElementById('trialForm');
  const status = document.getElementById('trialStatus');
  const params = new URLSearchParams(location.search);
  const now = Date.now();
  const read = key => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); }
    catch (_) { return null; }
  };
  const write = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
    'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  let source = read(SOURCE);
  if (!source || !source.at || !source.values || now - source.at > MAX_AGE) source = {at: now, values: {}};
  // Replace the source only on a fresh attributed visit. Retain it during the receipt redirect.
  if (fields.some(key => params.has(key))) {
    source = {at: now, values: {}};
    fields.forEach(key => {
      const value = params.get(key);
      if (value && value.length <= 500 && !/[\r\n]/.test(value)) source.values[key] = value;
    });
    write(SOURCE, source);
  }
  function hidden(name, value) {
    let input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden'; input.name = name; form.appendChild(input);
    }
    input.value = value;
  }
  if (form) {
    fields.forEach(key => { if (source.values[key]) hidden(key, source.values[key]); });
    form.addEventListener('submit', event => {
      if (location.protocol !== 'https:') {
        event.preventDefault();
        if (status) {
          status.hidden = false;
          status.textContent = 'プレビューでは送信できません。公開済みのLPからお申し込みください。';
        }
        return;
      }
      if (event.defaultPrevented || !form.checkValidity()) return;
      const honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) return;
      let pending = read(PENDING);
      if (!pending || !pending.id || pending.reported || Date.now() - pending.at > MAX_AGE) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        pending = {id: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''), at: Date.now()};
      }
      // If storage is disabled, keep the application working and omit unverified conversion reporting.
      if (write(PENDING, pending)) {
        hidden('_next', BASE + '?rp_complete=' + pending.id + '#contact');
        hidden('rp_submission_id', pending.id);
      }
      // Native POST, CAPTCHA and the existing auto-response are deliberately preserved.
      // No ad conversion is emitted here.
    });
  }

  if (location.protocol !== 'https:') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GOOGLE, {allow_enhanced_conversions: false});
  const googleScript = document.createElement('script');
  googleScript.async = true;
  googleScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE;
  document.head.appendChild(googleScript);

  if (!window.fbq) {
    const fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    const metaScript = document.createElement('script');
    metaScript.async = true; metaScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(metaScript);
  }
  fbq('set', 'autoConfig', false, PIXEL);
  fbq('init', PIXEL);
  fbq('trackSingle', PIXEL, 'PageView');

  const completed = params.get('rp_complete');
  const pending = read(PENDING);
  if (!completed || !/^[a-f0-9]{32}$/.test(completed) || !pending ||
      pending.id !== completed || now - pending.at < 0 || now - pending.at > MAX_AGE) return;

  if (status) {
    status.hidden = false;
    status.textContent = 'お申し込みを受け付けました。体験URLのご案内メールをご確認ください。届かない場合は迷惑メールフォルダをご確認ください。';
    const submit = document.getElementById('trialSubmit');
    if (submit) submit.disabled = true;
  }
  const sentKey = 'rp.partner.sent.' + completed;
  let alreadySent = false;
  try { alreadySent = localStorage.getItem(sentKey) === '1'; } catch (_) {}
  if (alreadySent || pending.reported) return;
  // Record before queueing to suppress reload/back-button duplicates, even while tags are loading.
  if (!write(PENDING, {...pending, reported: true})) return;
  try { localStorage.setItem(sentKey, '1'); } catch (_) {}
  gtag('event', 'conversion', {send_to: DESTINATION, transaction_id: completed, value: 0, currency: 'JPY'});
  fbq('trackSingle', PIXEL, 'Lead', {content_name: 'REALIZE PARTNER', content_category: 'partner_trial'}, {eventID: completed});
})();
