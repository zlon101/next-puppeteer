let S = !1,
  w,
  h,
  m,
  u,
  l,
  f,
  i,
  b,
  y,
  g,
  v,
  a,
  c,
  p = '';
const E = {
  fetching: 'Fetching',
  downloading: 'Downloading',
  downloadingAudio: 'Downloading audio',
  downloadingVideo: 'Downloading video',
  converting: 'Converting',
  completed: 'Completed',
};

function q() {
  var e;
  w || (w = document.getElementById('mp3-btn')),
    h || (h = document.getElementById('mp4-btn')),
    m || (m = document.getElementById('loader')),
    u || (u = document.getElementById('mp3-table')),
    l || (l = document.getElementById('mp4-table')),
    f || (f = document.getElementById('alert')),
    i ||
      ((i = document.getElementById('modal')),
      (b = i.querySelector('.info')),
      (y = i.querySelector('.status')),
      (g = i.querySelector('.progress-text')),
      (v = i.querySelector('.progress-bar')),
      (a = i.querySelector('.download-btn')),
      (c = i.querySelector('.alert'))),
    w.addEventListener('click', () => {
      m.classList.add('hidden'),
        h.classList.remove('active'),
        l.classList.add('hidden'),
        w.classList.add('active'),
        u.classList.remove('hidden');
    }),
    h.addEventListener('click', () => {
      w.classList.remove('active'),
        u.classList.add('hidden'),
        h.classList.add('active'),
        l.querySelectorAll('tbody tr').length ? l.classList.remove('hidden') : M();
    }),
    u.querySelectorAll('button').forEach(o => {
      o.addEventListener('click', s => T(s, o));
    }),
    a.addEventListener('click', () => {
      window.aUrl && window.open(window.aUrl, '_blank'), (window.location.href = a.getAttribute('data-url'));
    }),
    (e = i.querySelector('.close-btn')) == null ||
      e.addEventListener('click', () => {
        (p = ''), i.classList.remove('show');
      });
}

function T(e, o) {
  e.preventDefault(), window.aUrl && window.open(window.aUrl, '_blank');
  const s = i.querySelector('.format');
  (s.innerHTML = o.getAttribute('data-format-label')),
    B(o.getAttribute('data-format'), o.getAttribute('data-quality')),
    i.classList.add('show');
}

async function M() {
  if (!S)
    for (m.classList.remove('hidden'), S = !0; ; )
      try {
        const e = await fetch(`${window.mp4SU}/mp4/${window.videoId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hash: window.rB.hash,
            }),
          }),
          {status: o} = e,
          s = await e.json();
        if (o === 200) {
          if ((s == null ? void 0 : s.retry) !== void 0) {
            await new Promise(d => setTimeout(d, 1e3));
            continue;
          }
          m.classList.add('hidden');
          let n = '';
          s.forEach(d => {
            (n += '<tr>'),
              (n += `<td>${d.qualityLabel}</td>`),
              (n += '<td>MP4</td>'),
              (n += `<td class="hidden md:table-cell">${d.size}</td>`),
              (n += '<td class="has-btn">'),
              (n += `<button type="button" data-format="mp4" data-format-label="MP4 (${d.qualityLabel})" data-quality="${d.itag}">`),
              (n += '<span class="md:block hidden">Download</span>'),
              (n += '<span class="block md:hidden">'),
              (n += '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24">'),
              (n +=
                '<path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z" />'),
              (n += '</svg>'),
              (n += '</span>'),
              (n += '</button>'),
              (n += '</td>'),
              (n += '</tr>');
          }),
            (l.querySelector('tbody').innerHTML = n),
            l.querySelectorAll('button').forEach(d => {
              d.addEventListener('click', L => T(L, d));
            }),
            l.classList.remove('hidden');
          break;
        }
        if (o !== 200) {
          s != null &&
            s.message &&
            (m.classList.add('hidden'),
            (f.querySelector('.message').innerHTML = s.message),
            f.classList.remove('hidden'),
            f.classList.add('flex'));
          break;
        }
      } catch (e) {
        console.log(e), await new Promise(o => setTimeout(o, 1e3));
      }
}

async function B(e, o) {
  var L;
  const s = `${e}-${o}`;
  b.classList.remove('hidden'),
    c.classList.remove('flex'),
    c.classList.add('hidden'),
    p !== s &&
      ((y.innerHTML = 'Initialize'),
      (g.innerHTML = '0%'),
      (v.style.width = '0%'),
      a.classList.remove('flex'),
      a.classList.add('hidden')),
    (p = s);
  let n = e === 'mp4' ? window.mp4SU : window.mp3SU,
    d = 0;
  for (; p === s; ) {
    try {
      const r = await fetch(`${n}/convert/${window.videoId}/${e}/${o}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retry: d,
            hash: window.rB.hash,
            ref: window.ref,
            title: (L = document.querySelector('h2.title')) == null ? void 0 : L.textContent,
          }),
        }),
        {status: k} = r,
        t = await r.json();
      if (
        (t != null && t.server ? (n = t.server) : (n = e === 'mp4' ? window.mp4SU : window.mp3SU),
        (t == null ? void 0 : t.retry) !== void 0 &&
          ((d = t.retry), (y.innerHTML = 'Retrying'), (g.innerHTML = '0%'), (v.style.width = '0%')),
        t != null &&
          t.status &&
          ((y.innerHTML = E[t.status]),
          (g.innerHTML = `${t.progress}%`),
          (v.style.width = `${t.progress}%`),
          t.status === 'completed'))
      ) {
        (window.location.href = t.downloadUrl),
          a.setAttribute('data-url', t.downloadUrl),
          a.classList.remove('hidden'),
          a.classList.add('flex');
        break;
      }
      if (k !== 200) {
        t != null &&
          t.message &&
          (b.classList.add('hidden'),
          c.classList.remove('hidden'),
          c.classList.add('flex'),
          (c.querySelector('.message').innerHTML = t.message));
        break;
      }
    } catch (r) {
      console.log(r);
    }
    await new Promise(r => setTimeout(r, 1e3));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function ({matches: e}) {
    e ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }),
    fetch(window.location.href, {
      method: 'POST',
    })
      .then(e => e.text())
      .then(e => {
        (document.body.innerHTML = e), q();
      })
      .catch(e => console.log(e));
});
