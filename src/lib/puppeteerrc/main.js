const h = document.querySelector(".toggle-menu")
  , a = document.querySelector(".menu-list")
  , c = document.querySelector(".toggle-appearance")
  , l = document.getElementById("search-form");
let i, o;
l && (i = l.querySelector("input"),
  o = l.querySelector("ul"));
const r = document.getElementById("loader")
  , m = document.getElementById("results")
  , y = document.querySelector(".toggle-languages")
  , d = document.querySelector(".languages-list");
function L(e, n) {
  const t = "suggest_" + Math.round(1e5 * Math.random())
    , s = document.createElement("script");
  s.src = `${e}${e.indexOf("?") >= 0 ? "&" : "?"}&callback=${t}`,
    document.body.appendChild(s),
    window[t] = u => {
      delete window[t],
        document.body.removeChild(s),
        n(u)
    }
}
function v() {
  const e = new IntersectionObserver(n => {
      n.forEach(t => {
          if (t.isIntersecting) {
            const s = t.target;
            s.src = s.dataset.src,
              s.onload = () => {
                s.classList.add("loaded")
              }
              ,
              e.unobserve(s)
          }
        }
      )
    }
  );
  document.querySelectorAll("img.lazy").forEach(n => {
      e.observe(n)
    }
  )
}
function w() {
  document.querySelectorAll(".download-item").forEach(e => {
      const n = e.getAttribute("data-id");
      e.querySelector(".play-btn").addEventListener("click", function() {
        const t = document.querySelector(".download-item.playing");
        t && t !== e && (t.classList.remove("playing"),
          t.querySelector(".stop").classList.add("hidden"),
          t.querySelector(".play").classList.remove("hidden"),
          t.querySelector(".player div").innerHTML = "",
          t.querySelector(".player").classList.add("hidden")),
          e.classList.contains("playing") ? (e.classList.remove("playing"),
            this.querySelector(".stop").classList.add("hidden"),
            this.querySelector(".play").classList.remove("hidden"),
            e.querySelector(".player div").innerHTML = "",
            e.querySelector(".player").classList.add("hidden")) : (e.classList.add("playing"),
            this.querySelector(".play").classList.add("hidden"),
            this.querySelector(".stop").classList.remove("hidden"),
            e.querySelector(".player div").innerHTML = `<iframe src="https://www.youtube.com/embed/${n}?autoplay=1" allowfullscreen></iframe>`,
            e.querySelector(".player").classList.remove("hidden"),
            e.querySelector(".player").scrollIntoView({
              behavior: "smooth"
            }))
      }),
        e.querySelector(".download-btn").addEventListener("click", function() {
          const t = document.querySelector(".download-item.downloading");
          t && t !== e && (t.classList.remove("downloading"),
            t.querySelector(".download div").innerHTML = "",
            t.querySelector(".download").classList.add("hidden")),
            e.classList.contains("downloading") ? (e.classList.remove("downloading"),
              this.querySelector("span").textContent = "Download",
              e.querySelector(".download div").innerHTML = "",
              e.querySelector(".download").classList.add("hidden")) : (e.classList.add("downloading"),
              fetch(`${window.url}/iframe/${n}`, {
                method: "POST"
              }).then(s => s.text()).then(s => {
                  this.querySelector("span").textContent = "Cancel",
                    e.querySelector(".download div").innerHTML = s,
                    e.querySelector(".download").classList.remove("hidden"),
                    e.querySelector(".download").scrollIntoView({
                      behavior: "smooth"
                    })
                }
              ).catch( () => {
                  e.classList.remove("downloading")
                }
              ))
        })
    }
  )
}

h.addEventListener("click", function(e) {
  e.preventDefault(),
    this.classList.contains("show") ? (a.classList.remove("flex"),
      a.classList.add("hidden"),
      this.classList.remove("show")) : (a.classList.remove("hidden"),
      a.classList.add("flex"),
      this.classList.add("show"))
});

document.documentElement.classList.contains("dark") && (c.querySelector(".sun").classList.add("hidden"),
  c.querySelector(".moon").classList.remove("hidden"));

c.addEventListener("click", e => {
    e.preventDefault(),
      document.documentElement.classList.contains("dark") ? (localStorage.setItem("theme", "light"),
        document.documentElement.classList.remove("dark"),
        c.querySelector(".sun").classList.remove("hidden"),
        c.querySelector(".moon").classList.add("hidden")) : (localStorage.setItem("theme", "dark"),
        document.documentElement.classList.add("dark"),
        c.querySelector(".sun").classList.add("hidden"),
        c.querySelector(".moon").classList.remove("hidden"))
  }
);
l && (i.addEventListener("keyup", e => {
    const n = [];
    if (e.code === "ArrowUp" || e.code === "ArrowDown") {
      if (o.classList.contains("show")) {
        let t = !1;
        const s = o.querySelector("li.active");
        s ? e.code === "ArrowUp" && s.previousElementSibling || e.code === "ArrowDown" && s.nextElementSibling ? (s.classList.remove("active"),
          e.code === "ArrowUp" && s.previousElementSibling ? s.previousElementSibling.classList.add("active") : s.nextElementSibling.classList.add("active"),
          i.value = o.querySelector("li.active").textContent) : t = !0 : o.querySelector("li:first-child").classList.add("active"),
        t || o.querySelector(".active").scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        })
      }
    } else
      L(`https://suggestqueries.google.com/complete/search?q=${e.target.value}&hl=us&client=youtube-reduced&ds=yt&callback=supermp3`, t => {
          if (t != null && t[1] && t[1].length) {
            if (n.push(...t[1].map(s => s[0])),
              o.innerHTML = "",
              n.length) {
              o.classList.add("show");
              for (const s of n)
                o.innerHTML += `<li>${s}</li>`
            } else
              o.classList.remove("show");
            o.querySelectorAll("li").forEach(s => {
                s.addEventListener("mousedown", u => {
                    u.preventDefault(),
                      o.classList.remove("show"),
                      i.value = s.textContent,
                      l.dispatchEvent(new Event("submit",{
                        bubbles: !0,
                        cancelable: !0
                      }))
                  }
                )
              }
            )
          } else
            o.classList.remove("show")
        }
      )
  }
),
  i.addEventListener("keydown", e => {
      e.code === "Enter" && (i.blur(),
        l.dispatchEvent(new Event("submit",{
          bubbles: !0,
          cancelable: !0
        })))
    }
  ),
  i.addEventListener("focus", () => {
      o.querySelectorAll("li").length && !o.classList.contains("show") && o.classList.add("show")
    }
  ),
  i.addEventListener("blur", () => {
      o.classList.contains("show") && o.classList.remove("show")
    }
  ),
  l.addEventListener("submit", async e => {
      if (e.preventDefault(),
        r.classList.contains("flex"))
        return;
      const n = i.value.trim();
      if (!n)
        return i.focus();
      const t = n.match(/^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/);
      r.classList.remove("hidden"),
        r.classList.add("flex"),
        l.scrollIntoView({
          behavior: "smooth"
        }),
        m.classList.add("hidden");
      try {
        const s = await fetch(window.homeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: t ? `id=${t[1]}` : `q=${n}`
        });
        m.innerHTML = await s.text(),
          m.classList.remove("hidden"),
          v(),
          w()
      } catch (s) {
        console.log(s)
      }
      r.classList.remove("flex"),
        r.classList.add("hidden")
    }
  ));
y.addEventListener("click", e => {
    e.preventDefault(),
    d.classList.contains("invisible") && (e.stopPropagation(),
      d.classList.remove("invisible", "-translate-y-4", "opacity-0"))
  }
);
d.addEventListener("click", e => {
    e.stopPropagation()
  }
);
window.addEventListener("click", () => {
    d.classList.add("invisible", "-translate-y-4", "opacity-0")
  }
);
