// Live demos on /clop: the Format bar and Fit under size cards, the stats line, and the lazy section
// clips. Each demo runs only while it is on screen. Card metrics, colours and strings follow Clop's
// FloatingResult.swift (196 × 148 pt card + 18 pt format bar, size labels in system red and
// FloatingResult.yellow over the thumbnail) and ActionButtons.swift (fit-under slider with magnetic
// stops on the size presets); file sizes are illustrative.
//
// Motion model: every moving thing is a body with a position, a height above the desk and a tilt.
// Height lifts it slightly towards the viewer and pushes its shadow out and soft; springs carry the
// weight on landing. Emphasis comes from what the result means: sizes count to their new value on
// the card and glow once, the format chip stretches across to the new format with a shine,
// converted files are thrown out of the card into the folder, a replaced file tips over. Small
// details get a camera move onto the whole region, never a magnified element.
//
// Everything that moves on its own goes through MotionPause (motion-pause.js): with reduced motion or
// after Pause all motion, nothing self-plays and every loop keeps a play button of its own.
(() => {
    const MP = window.MotionPause || { paused: false, subscribe: fn => fn(false), clip() {} }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Pauses keep their length under reduced motion so every state stays up long enough to read;
    // only the movement between states is dropped.
    const sleep = ms => new Promise(r => setTimeout(r, ms))

    // Runs `loop` while `el` is visible; `loop` awaits `gate()` between beats, which parks it off screen
    // and while motion is paused. (The Format bar and Fit under demos this drives are not on the page
    // right now; if they come back, port them to MotionPause.demo so a paused page shows a still frame.)
    function whileVisible(el, loop) {
        let visible = false
        let wake = null
        const gate = async () => {
            while (!visible || MP.paused) await new Promise(r => (wake = r))
        }
        const poke = () => {
            if (visible && !MP.paused && wake) {
                wake()
                wake = null
            }
        }
        new IntersectionObserver(entries => {
            visible = entries.some(e => e.isIntersecting)
            poke()
        }, { rootMargin: '100px 0px' }).observe(el)
        MP.subscribe(poke)
        loop(gate)
    }

    // Int.humanSize from Shared.swift: decimal units, no space, one decimal under 10 MB.
    function humanSize(b) {
        if (b < 1000) return `${Math.round(b)}B`
        if (b < 1e6) return `${Math.floor(b / 1000)}KB`
        const mb = b / 1e6
        return mb < 10 ? `${mb.toFixed(1)}MB` : `${Math.round(mb)}MB`
    }

    // ---------------------------------------------------------------- motion primitives
    const smooth = k => k * k * k * (k * (6 * k - 15) + 10) // minimum jerk: how a hand moves a mouse
    const easeOut = k => 1 - Math.pow(1 - k, 3)
    const easeIn = k => k * k

    function tween(ms, fn, ease = smooth) {
        return new Promise(resolve => {
            if (reduceMotion) {
                fn(1, 1)
                return resolve()
            }
            const t0 = performance.now()
            const tick = now => {
                const k = Math.min(1, (now - t0) / ms)
                fn(ease(k), k)
                if (k < 1) requestAnimationFrame(tick)
                else resolve()
            }
            requestAnimationFrame(tick)
        })
    }

    // Damped springs on numeric fields of `state`, integrated per frame. `opts[key]` overrides the
    // stiffness/damping of one field (the format chip's leading edge is stiffer than its trailing one).
    // `owns(key)` lets a newer motion take a field over: the older spring drops it and stops
    // pushing, so two springs never pull the same field towards different targets.
    function spring(state, target, { k = 170, c = 20, v = {}, opts = {}, onFrame, owns = () => true } = {}) {
        return new Promise(resolve => {
            const keys = Object.keys(target)
            if (reduceMotion) {
                Object.assign(state, target)
                onFrame?.()
                return resolve()
            }
            const vel = Object.fromEntries(keys.map(key => [key, v[key] || 0]))
            let last = performance.now()
            const tick = now => {
                const dt = Math.min(0.034, (now - last) / 1000)
                last = now
                const steps = 4
                const live = keys.filter(owns)
                for (let i = 0; i < steps; i++) {
                    for (const key of live) {
                        const K = opts[key]?.k ?? k
                        const C = opts[key]?.c ?? c
                        const a = -K * (state[key] - target[key]) - C * vel[key]
                        vel[key] += (a * dt) / steps
                        state[key] += (vel[key] * dt) / steps
                    }
                }
                const moving = live.some(key => Math.abs(state[key] - target[key]) > 0.004 || Math.abs(vel[key]) > 0.02)
                if (!moving) for (const key of live) state[key] = target[key]
                onFrame?.()
                if (moving) requestAnimationFrame(tick)
                else resolve()
            }
            requestAnimationFrame(tick)
        })
    }

    // A physical object on the desk. `h` is its height above the desk: it grows slightly towards the
    // viewer and its shadow drops further, larger and softer. Negative h presses it into the desk.
    function body(el, shadow) {
        const s = { x: 0, y: 0, h: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1 }
        const owner = {} // field → the motion currently driving it
        const claim = keys => {
            const id = {}
            for (const key of keys) owner[key] = id
            return key => owner[key] === id
        }
        const paint = () => {
            const lift = Math.max(0.2, 1 + s.h * 0.0022)
            el.style.transform = `translate3d(${s.x}px, ${s.y - s.h * 0.35}px, 0) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotate(${s.rz}deg) scale(${lift * s.sx}, ${lift * s.sy})`
            if (shadow) shadow(Math.max(0, s.h), s)
        }
        const api = {
            el,
            s,
            paint,
            set(p) {
                claim(Object.keys(p))
                Object.assign(s, p)
                paint()
            },
            to(target, o = {}) {
                return spring(s, target, { ...o, onFrame: paint, owns: claim(Object.keys(target)) })
            },
            // Interpolates from the current values to `target` on `ease`; `extra(k, e)` drives
            // anything that follows its own curve over the same time from the raw time k (an arc's
            // height, a lean that peaks mid-flight).
            tw(target, ms, ease = smooth, extra) {
                const from = { ...s }
                const owns = claim([...Object.keys(target), ...Object.keys(extra ? extra(0, 0) : {})])
                return tween(ms, (_, k) => {
                    const e = ease(k)
                    for (const key in target) if (owns(key)) s[key] = from[key] + (target[key] - from[key]) * e
                    if (extra) for (const [key, val] of Object.entries(extra(k, e))) if (owns(key)) s[key] = val
                    paint()
                }, x => x)
            },
        }
        paint()
        return api
    }

    // Shadows: the card's matches the app's resting shadow (black 40%, radius 12, y 8) at h = 0.
    const cardShadow = el => h => {
        const a = 0.42 * Math.max(0.35, 1 - h / 110)
        el.style.boxShadow = `0 ${8 + h * 0.75}px ${24 + h * 1.1}px rgba(46,38,32,${a.toFixed(3)}), 0 ${1 + h * 0.1}px ${3 + h * 0.2}px rgba(0,0,0,${(0.18 * Math.max(0, 1 - h / 30)).toFixed(3)})`
    }
    const docShadow = el => h => {
        const a = 0.22 * Math.max(0.35, 1 - h / 90)
        el.style.boxShadow = `0 ${1 + h * 0.55}px ${3 + h * 0.9}px rgba(46,38,32,${a.toFixed(3)})`
    }
    // The keycap's own edge flattens when it is pressed; its drop shadow follows its height.
    const keyShadow = el => h => {
        const down = el.classList.contains('down')
        const a = 0.12 * Math.max(0.4, 1 - h / 60)
        el.style.boxShadow = `0 ${down ? 1 : 3}px 0 #ddd2c6, 0 ${(down ? 3 : 6) + h * 0.6}px ${(down ? 8 : 14) + h}px rgba(46,38,32,${a.toFixed(3)})`
    }

    const ICONS = {
        minus: '<path d="M3 8h10"/>',
        restore: '<path d="M6 4 3 7l3 3"/><path d="M3 7h6.5a3.5 3.5 0 0 1 0 7H8"/>',
        sliders: '<path d="M2 4h12M2 8h12M2 12h12"/><circle cx="5" cy="4" r="1.6" fill="currentColor"/><circle cx="10.5" cy="8" r="1.6" fill="currentColor"/><circle cx="7" cy="12" r="1.6" fill="currentColor"/>',
        bolt: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" stroke-linejoin="round"/>',
        share: '<path d="M8 10V2M5 4.5 8 1.5l3 3"/><path d="M5 7H3.5v7h9V7H11"/>',
        plane: '<path d="M14 2 2 7l5 2 2 5z" stroke-linejoin="round"/><path d="M7 9l7-7"/>',
        target: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".8" fill="currentColor"/>',
        x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
        stop: '<rect x="4.5" y="4.5" width="7" height="7" rx="1" fill="currentColor" stroke="none"/>',
        dots: '<circle cx="3.5" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.3" fill="currentColor" stroke="none"/>',
    }
    const svg = name => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">${ICONS[name]}</svg>`
    const ARROW = '<svg class="arr" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11M9 4l4 4-4 4"/></svg>'

    // Geometry in the camera's own coordinates, so it holds while the camera is zoomed in.
    const rel = (el, stage) => {
        const z = +(stage.dataset.z || 1)
        const s = stage.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        const x = (r.left - s.left) / z
        const y = (r.top - s.top) / z
        return { x, y, w: r.width / z, h: r.height / z, cx: x + r.width / z / 2, cy: y + r.height / z / 2 }
    }
    const box = stage => ({ width: stage.offsetWidth, height: stage.offsetHeight })

    // The camera. The scene is laid out at 1 pt = 1 px in a fixed W0 × H0 layer, and the camera
    // frames it tightly: the stage is exactly as tall as the scene at its width, so the cards and
    // files fill it at any page width. Zooms are springs with a little overshoot, follow the point
    // where the action is, and drift slightly while they hold. A backdrop layer moves at a third of
    // the camera's speed, which gives the moves their parallax.
    function makeCam(stage, W0, H0) {
        const cam = document.createElement('div')
        cam.className = 'cd-cam'
        cam.append(...stage.childNodes)
        cam.style.width = `${W0}px`
        cam.style.height = `${H0}px`
        const back = document.createElement('div')
        back.className = 'cd-back'
        stage.append(back, cam)
        stage.classList.add('framed')
        const v = { z: 1, fx: W0 / 2, fy: H0 / 2, a: 0 }
        const t0 = performance.now()
        let z0 = 1
        const paint = () => {
            const W = stage.clientWidth
            const H = H0 * z0
            const S = z0 * v.z
            const t = (performance.now() - t0) / 1000
            const fx = v.fx + v.a * Math.sin(t * 0.8)
            const fy = v.fy + v.a * 0.7 * Math.cos(t * 0.55)
            const tx = Math.min(0, Math.max(W - W0 * S, W / 2 - S * fx))
            const ty = Math.min(0, Math.max(H - H0 * S, H / 2 - S * fy))
            cam.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${S.toFixed(4)})`
            cam.dataset.z = S.toFixed(4)
            back.style.transform = `translate(${(tx * 0.35).toFixed(2)}px, ${(ty * 0.35).toFixed(2)}px) scale(${(1 + (v.z - 1) * 0.35).toFixed(4)})`
        }
        const fit = () => {
            z0 = stage.clientWidth / W0
            stage.style.height = `${(H0 * z0).toFixed(1)}px`
            paint()
        }
        new ResizeObserver(fit).observe(stage)
        fit()
        // keeps painting while the camera is away from rest, so the drift stays alive
        let ticking = false
        const tick = () => {
            if (ticking) return
            ticking = true
            const loop = () => {
                paint()
                if (v.z > 1.001 || v.a > 0.01) requestAnimationFrame(loop)
                else ticking = false
            }
            requestAnimationFrame(loop)
        }
        let token = 0
        // zoom by `z` so the local point (px, py) comes to the middle of the frame
        cam.zoomTo = (z, px = W0 / 2, py = H0 / 2) => {
            if (reduceMotion) return Promise.resolve()
            const mine = ++token
            tick()
            return spring(v, { z, fx: px, fy: py, a: z > 1 ? 2.5 : 0 }, { k: 120, c: 14, opts: { a: { k: 20, c: 9 } }, owns: () => mine === token, onFrame: paint })
        }
        cam.zoomOn = (el, z, dy = 0) => {
            const r = rel(el, cam)
            return cam.zoomTo(z, r.cx, r.cy + dy)
        }
        return cam
    }

    // A brief emphasis that suits the element: a shine across a chip, a glow on a number.
    function flash(el, cls, ms = 900) {
        if (reduceMotion) return
        el.classList.remove(cls)
        void el.offsetWidth
        el.classList.add(cls)
        setTimeout(() => el.classList.remove(cls), ms)
    }

    // Slides `els` from where they were before `mutate` to where they are after it, on a spring.
    async function flip(els, mutate, o = { k: 210, c: 22 }) {
        const before = els.map(e => e.getBoundingClientRect().left)
        mutate()
        const after = els.map(e => e.getBoundingClientRect().left)
        await Promise.all(els.map((e, i) => {
            // screen pixels back to the element's own, under the camera's scale
            const scale = e.getBoundingClientRect().width / (e.offsetWidth || 1) || 1
            const st = { x: (before[i] - after[i]) / scale }
            if (Math.abs(st.x) < 0.5) return null
            const paint = () => (e.style.translate = `${st.x.toFixed(2)}px 0`)
            paint()
            return spring(st, { x: 0 }, { ...o, onFrame: paint })
        }))
    }

    // ---------------------------------------------------------------- shared card
    // One floating result card: 196 × 148 pt content plus the 18 pt format bar, at 1 pt = 1 CSS px.
    function makeCard(host, { thumb, formats, grid }) {
        const el = document.createElement('div')
        el.className = 'cd-card'
        el.innerHTML = `
            <div class="cd-thumb" style="background-image:url(${thumb})"></div>
            <div class="cd-band"></div>
            <div class="cd-veil"></div>
            <div class="cd-grid">${grid.map(g => `<span class="cd-btn" data-a="${g}">${svg(g)}</span>`).join('')}</div>
            <div class="cd-slider"><span class="cd-hint"></span><div class="cd-track"><span class="cd-knob"></span></div></div>
            <div class="cd-bottom">
                <div class="cd-rest">
                    <div class="cd-size"><b class="old"></b><span class="tail">${ARROW}<b class="new"></b></span></div>
                    <div class="cd-res"><span class="a"></span><span class="tail">${ARROW}<span class="b"></span></span></div>
                </div>
                <div class="cd-run"><div class="cd-op"></div><div class="cd-prog"><span></span></div></div>
            </div>
            <span class="cd-corner cd-close">${svg('x')}</span>
            <span class="cd-corner cd-more">${svg('dots')}</span>
            <div class="cd-bar"><span class="cd-active"></span>${formats
                .map((f, i) => `${i ? '<i></i>' : ''}<span class="cd-seg" data-f="${f}">${f}</span>`)
                .join('')}</div>`
        host.append(el)

        const q = s => el.querySelector(s)
        const segs = [...el.querySelectorAll('.cd-seg')]
        const dividers = [...el.querySelectorAll('.cd-bar i')]
        const sizeEl = q('.cd-size')
        const oldEl = q('.cd-size .old')
        const newEl = q('.cd-size .new')
        const resEl = q('.cd-res')
        const pillEl = q('.cd-active')
        const pill = { L: 0, R: 0 }
        const bytes = { old: 0, now: 0 }
        let res = { w: 0, h: 0, nw: 0, nh: 0 }

        const paintPill = () => {
            pillEl.style.left = `${pill.L.toFixed(2)}px`
            pillEl.style.width = `${Math.max(0, pill.R - pill.L).toFixed(2)}px`
            // a label turns dark once the chip covers most of it, so it reads through the whole glide
            for (const s of segs) {
                const a = s.offsetLeft
                const b = a + s.offsetWidth
                const cover = Math.max(0, Math.min(b, pill.R) - Math.max(a, pill.L)) / (b - a)
                s.classList.toggle('on', cover > 0.5)
            }
        }
        const paintSize = () => {
            oldEl.textContent = humanSize(bytes.old)
            newEl.textContent = humanSize(bytes.now)
        }
        const paintRes = () => {
            q('.cd-res .a').textContent = `${res.w}×${res.h}`
            q('.cd-res .b').textContent = `${res.nw}×${res.nh}`
        }

        const api = {
            el,
            segs,
            seg: f => segs.find(s => s.dataset.f === f),
            btn: a => el.querySelector(`.cd-btn[data-a="${a}"]`),
            // One size alone is the app's "nothing changed yet" state, shown in yellow; a pair is
            // old in red → new in yellow (fileSizeDiff).
            setSize(oldB, newB) {
                bytes.old = oldB
                bytes.now = newB ?? oldB
                sizeEl.classList.toggle('pair', newB != null)
                paintSize()
            },
            // The new size counts to its value on the card. From a single size, the number splits:
            // the old one slides aside and turns red, the new one runs down from it.
            async landSize(newB, ms = 900) {
                const from = bytes.now
                if (!sizeEl.classList.contains('pair')) {
                    bytes.now = from
                    paintSize()
                    await flip([oldEl], () => sizeEl.classList.add('pair'))
                }
                await tween(ms, e => {
                    bytes.now = from + (newB - from) * e
                    paintSize()
                }, easeOut)
                bytes.now = newB
                paintSize()
            },
            setRes(w, h, nw, nh) {
                res = { w, h, nw: nw ?? w, nh: nh ?? h }
                resEl.classList.toggle('pair', nw != null)
                paintRes()
            },
            async landRes(nw, nh, ms = 900) {
                const fw = res.nw
                const fh = res.nh
                if (!resEl.classList.contains('pair')) await flip([q('.cd-res .a')], () => resEl.classList.add('pair'))
                await tween(ms, e => {
                    res.nw = Math.round((fw + (nw - fw) * e) / 2) * 2
                    res.nh = Math.round((fh + (nh - fh) * e) / 2) * 2
                    paintRes()
                }, easeOut)
                res.nw = nw
                res.nh = nh
                paintRes()
            },
            hover(on) {
                el.classList.toggle('hover', on)
            },
            setActive(f) {
                const s = api.seg(f)
                pill.L = s.offsetLeft
                pill.R = s.offsetLeft + s.offsetWidth
                paintPill()
            },
            // The white chip glides to the new format (the app's matchedGeometryEffect spring): its
            // leading edge runs ahead on a stiffer spring, so it stretches across and catches up.
            movePill(f) {
                const s = api.seg(f)
                const L = s.offsetLeft
                const R = L + s.offsetWidth
                const fast = { k: 340, c: 26 }
                const slow = { k: 140, c: 19 }
                const right = L > pill.L
                return spring(pill, { L, R }, { opts: right ? { R: fast, L: slow } : { L: fast, R: slow }, onFrame: paintPill })
            },
            // FormatPickerBar hover: the format pops 1.22× off the row, the others fade and slide
            // aside by up to 5 pt, tapering to zero at the row's ends.
            hoverSeg(f) {
                const h = f ? segs.findIndex(s => s.dataset.f === f) : -1
                const last = segs.length - 1
                const push = p => (h < 0 ? 0 : p < h ? -5 * (p / h) : p > h ? 5 * ((last - p) / (last - h)) : 0)
                segs.forEach((s, i) => {
                    s.classList.toggle('hov', i === h)
                    s.classList.toggle('dim', h >= 0 && i !== h)
                    s.style.transformOrigin = i === 0 ? '0 100%' : i === last ? '100% 100%' : '50% 100%'
                    s.style.transform = h < 0 ? '' : `translate(${push(i)}px, ${i === h ? -1 : 0}px) scale(${i === h ? 1.22 : 1})`
                })
                dividers.forEach((d, i) => {
                    d.classList.toggle('dim', h >= 0)
                    d.style.transform = h < 0 ? '' : `translateX(${push(i + 0.5)}px)`
                })
            },
            plus(on) {
                segs.forEach(s => (s.textContent = (on && !s.classList.contains('on') ? '+' : '') + s.dataset.f))
            },
            pending(f) {
                segs.forEach(s => s.classList.toggle('pend', s.dataset.f === f))
            },
            run(op) {
                el.classList.add('running')
                q('.cd-close').innerHTML = svg('stop')
                q('.cd-op').textContent = op
                q('.cd-prog span').style.width = '0%'
            },
            progress(p) {
                q('.cd-prog span').style.width = `${(p * 100).toFixed(1)}%`
            },
            done() {
                el.classList.remove('running')
                q('.cd-close').innerHTML = svg('x')
            },
            slider(on) {
                el.classList.toggle('sliding', on)
            },
        }
        return api
    }

    // The pointer: a macOS arrow that travels on slightly curved, minimum-jerk paths, settles on its
    // target, presses with a ripple and stays a beat after the release.
    function makeCursor(stage) {
        const c = document.createElement('div')
        c.className = 'cd-cursor'
        c.innerHTML = '<svg viewBox="0 0 20 24"><path d="M2 2v17.5l4.6-4.4 2.9 6.6 2.9-1.3-2.9-6.4h6.4z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
        stage.append(c)
        const p = { x: 0, y: 0 }
        const paint = () => (c.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`)
        const api = {
            el: c,
            p,
            jump(x, y) {
                p.x = x
                p.y = y
                paint()
            },
            async toXY(x, y, ms) {
                const x0 = p.x
                const y0 = p.y
                const d = Math.hypot(x - x0, y - y0)
                if (d < 0.5) return
                ms = ms ?? Math.min(1000, Math.max(420, 300 + d * 1.5))
                // a hand's path bows a little; the bow scales with the distance
                const cx = (x0 + x) / 2 - (y - y0) * 0.16
                const cy = (y0 + y) / 2 + (x - x0) * 0.16
                await tween(ms, e => {
                    const a = (1 - e) * (1 - e)
                    const b = 2 * (1 - e) * e
                    const cc = e * e
                    p.x = a * x0 + b * cx + cc * x
                    p.y = a * y0 + b * cy + cc * y
                    paint()
                })
            },
            async to(target, { dx = 0, dy = 0, ms } = {}) {
                const r = rel(target, stage)
                await api.toXY(r.cx + dx, r.cy + dy, ms)
            },
            async click({ onPress, onRelease, hold = 120 } = {}) {
                await sleep(180)
                c.classList.add('down')
                if (!reduceMotion) {
                    const r = document.createElement('span')
                    r.className = 'cd-ripple'
                    r.style.left = `${p.x}px`
                    r.style.top = `${p.y}px`
                    stage.append(r)
                    setTimeout(() => r.remove(), 700)
                }
                onPress?.()
                await sleep(hold)
                c.classList.remove('down')
                onRelease?.()
                await sleep(300)
            },
            press() {
                c.classList.add('down')
            },
            release() {
                c.classList.remove('down')
            },
        }
        return api
    }

    // Pressing a card tilts it a degree or two away under the finger and presses it into the desk;
    // the release lets it spring back.
    function pressCard(cardB, stage, p) {
        const r = rel(cardB.el, stage)
        const px = Math.max(-1, Math.min(1, (p.x - r.cx) / (r.w / 2)))
        const py = Math.max(-1, Math.min(1, (p.y - r.cy) / (r.h / 2)))
        return {
            down: () => cardB.to({ rx: -py * 2.2, ry: px * 2.2, h: -2 }, { k: 520, c: 32 }),
            up: () => cardB.to({ rx: 0, ry: 0, h: 0 }, { k: 260, c: 13 }),
        }
    }

    // A result card falls onto the desk from above the stage and lands with weight.
    async function dropIn(cardB, stage) {
        const r = rel(cardB.el, stage)
        // starts close to the camera and above the frame, falls onto the desk and bounces
        cardB.set({ x: 0, y: -(r.y + r.h * 0.6), h: 150, rx: 0, ry: 0, rz: -3, sx: 1, sy: 1 })
        await cardB.tw({ y: 0, rz: 0 }, 560, easeOut, k => ({ h: 150 * (1 - k * k) }))
        cardB.set({ h: 0, sx: 1.03, sy: 0.95 })
        await cardB.to({ h: 0, sx: 1, sy: 1 }, { k: 360, c: 11, v: { h: 90 } })
    }

    async function runProgress(card, ms) {
        await tween(ms, e => card.progress(e), k => k * (2 - k))
    }

    // ---------------------------------------------------------------- format bar
    // One screenshot, three clicks: PNG → WEBP adds a file next to the original; ⌥-click AVIF keeps
    // the WEBP too; a plain click on JPEG replaces the AVIF (keep-only-last, OptimisationUtils.swift:356).
    const FB_ORIG = 1_458_390
    const FB_SIZES = { PNG: 487_256, WEBP: 196_400, AVIF: 141_200, JPEG: 309_800 }
    const EXT = { PNG: 'png', WEBP: 'webp', AVIF: 'avif', JPEG: 'jpg' }

    function initFormatBar() {
        const demo = document.getElementById('format-bar-demo')
        if (!demo) return
        const stage = makeCam(demo.querySelector('.cd-stage'), 320, 330)
        const files = demo.querySelector('.cd-files')
        const keyEl = demo.querySelector('.cd-key')
        const card = makeCard(stage.querySelector('.cd-slot'), {
            thumb: '/static/img/clop-demo/screenshot.jpg',
            formats: ['JPEG', 'WEBP', 'AVIF', 'HEIC', 'PNG', 'JXL'],
            grid: ['minus', 'restore', 'sliders', 'bolt', 'share', 'plane'],
        })
        const cardB = body(card.el, cardShadow(card.el))
        const keyB = body(keyEl, keyShadow(keyEl))
        const cursor = makeCursor(stage)
        const docs = new Map() // format → body

        function makeFile(f) {
            const t = document.createElement('span')
            t.className = 'cd-file'
            t.dataset.f = f
            t.innerHTML = `<span class="ic t-${EXT[f]}">${EXT[f].toUpperCase()}</span><span class="nm">screenshot.${EXT[f]}</span>`
            const B = body(t, docShadow(t.querySelector('.ic')))
            docs.set(f, B)
            return B
        }

        // The converted file leaves the card, arcs over the desk and lands in the folder with a
        // squash. Files already there slide aside. A replaced file stays put until the new one lands
        // on it, then sinks away under it and the new one takes its place in the row.
        async function throwFile(f, replace) {
            const B = makeFile(f)
            const t = B.el
            const old = replace && docs.get(replace)
            let sliding = null
            if (old) {
                // fly to the old file's spot, then swap it into the row once that one is gone
                const offset = rel(old.el, stage)
                const row = rel(files, stage)
                t.style.position = 'absolute'
                t.style.left = `${offset.x - row.x}px`
                t.style.top = `${offset.y - row.y}px`
                t.style.visibility = 'hidden'
                files.append(t)
            } else {
                sliding = flip([...files.children], () => {
                    files.append(t)
                    t.style.visibility = 'hidden'
                })
            }
            const tr = rel(t, stage)
            const cr = rel(card.el, stage)
            const sx = cr.cx - tr.cx
            const sy = cr.y + cr.h * 0.42 - tr.y - 16
            B.set({ x: sx, y: sy, h: 10, rz: 0, sx: 0.5, sy: 0.5 })
            t.style.visibility = ''
            t.classList.add('flying')
            // the card gives a little as the file leaves it
            cardB.set({ h: -2.5 })
            cardB.to({ h: 0 }, { k: 300, c: 14 })
            let sunk = null
            await B.tw({ x: 0, y: 0, sx: 1, sy: 1 }, 760, smooth, (k, e) => {
                if (old && !sunk && k > 0.72) sunk = sink(old)
                return { h: 10 * (1 - e) + 70 * Math.sin(Math.PI * k), rz: -9 * Math.sin(Math.PI * k) }
            })
            B.set({ h: 0, rz: 0, sx: 1.14, sy: 0.8 })
            await Promise.all([B.to({ sx: 1, sy: 1 }, { k: 380, c: 10 }), sunk, sliding])
            t.classList.remove('flying')
            if (old) {
                await flip([...files.children].filter(x => x !== old.el), () => {
                    files.insertBefore(t, old.el)
                    old.el.remove()
                    t.style.position = ''
                    t.style.left = ''
                    t.style.top = ''
                })
            }
        }

        async function sink(B) {
            // pushed down into the desk, away from the camera, as the new file lands on it
            await B.tw({ h: -320, y: -102 }, 380, easeIn) // y cancels the drop that negative height adds
            B.el.style.visibility = 'hidden'
            docs.delete(B.el.dataset.f)
        }

        async function convert(f, { additive = false, zoom = false } = {}) {
            const seg = card.seg(f)
            // the 8 pt formats are too small to follow at real size: the view moves in on the
            // bottom of the card while the pointer travels, and back out once the click lands
            const bar = card.el.querySelector('.cd-bar')
            await Promise.all([cursor.to(seg, { dy: 3 }), zoom ? sleep(150).then(() => stage.zoomOn(bar, 1.45, -24)) : null])
            card.hoverSeg(f)
            await sleep(zoom ? 700 : 450)
            const press = pressCard(cardB, stage, cursor.p)
            await cursor.click({ onPress: press.down, onRelease: press.up })
            card.hoverSeg(null)
            if (zoom) stage.zoomTo(1)
            card.pending(f)
            card.run(`Converting to ${f}`)
            await runProgress(card, 1250)
            const prev = additive ? null : [...docs.keys()].filter(x => x !== 'PNG').pop()
            card.pending(null)
            card.done()
            card.plus(additive)
            await Promise.all([
                card.movePill(f).then(() => {
                    card.plus(additive)
                    flash(card.el.querySelector('.cd-active'), 'shine')
                }),
                card.landSize(FB_SIZES[f]).then(() => flash(card.el.querySelector('.cd-size .new'), 'glow', 1100)),
                throwFile(f, prev),
            ])
        }

        async function keyDown() {
            keyB.set({ y: -70, h: 120, rz: 4 })
            keyEl.classList.add('shown')
            await keyB.tw({ y: 0, rz: 0 }, 460, easeOut, k => ({ h: 120 * (1 - k * k) }))
            keyB.set({ h: 0, sx: 1.05, sy: 0.92 })
            await keyB.to({ h: 0, sx: 1, sy: 1 }, { k: 380, c: 11, v: { h: 70 } })
            await sleep(250)
            keyEl.classList.add('down')
            keyB.paint()
        }
        async function keyUp() {
            keyEl.classList.remove('down')
            keyB.paint()
            await sleep(350)
            await keyB.tw({ y: -80, h: 160, rz: -3 }, 420, easeIn)
            keyEl.classList.remove('shown')
        }

        const restXY = () => {
            const s = box(stage)
            return [s.width + 30, s.height * 0.8]
        }

        function reset() {
            files.innerHTML = ''
            docs.clear()
            files.append(makeFile('PNG').el)
            card.setSize(FB_ORIG, FB_SIZES.PNG)
            card.setRes(3024, 1890)
            card.setActive('PNG')
            card.plus(false)
            card.hover(false)
            card.done()
            keyEl.classList.remove('down', 'shown')
            cursor.jump(...restXY())
        }

        whileVisible(demo, async gate => {
            await sleep(60)
            reset()
            const r0 = rel(card.el, stage)
            cardB.set({ y: -(r0.y + r0.h + 60) })
            while (true) {
                await gate()
                await sleep(300)
                await dropIn(cardB, stage)
                await sleep(500)
                await cursor.to(card.el, { dy: -18 })
                card.hover(true)
                await sleep(600)

                await gate()
                await convert('WEBP', { zoom: true })
                await sleep(1500)

                await gate()
                await keyDown()
                card.plus(true)
                await sleep(650)
                await convert('AVIF', { additive: true, zoom: true })
                await sleep(400)
                card.plus(false)
                await keyUp()
                await sleep(900)

                await gate()
                await convert('JPEG')
                await sleep(2200)

                // close the card; it slides off towards the screen corner it came from
                await gate()
                await cursor.to(card.el.querySelector('.cd-close'))
                const press = pressCard(cardB, stage, cursor.p)
                await cursor.click({ onPress: press.down, onRelease: press.up })
                const s = box(stage)
                const rc = rel(card.el, stage)
                // the converted files are swept off the desk after it, the outermost first; the
                // original slides back to the middle
                const swept = [...files.children].filter(x => x.dataset.f !== 'PNG').reverse()
                await Promise.all([
                    cardB.tw({ x: s.width - rc.x + 40, y: -40, h: -260 }, 620, easeIn),
                    sleep(120).then(() => cursor.toXY(...restXY(), 900)),
                    ...swept.map((x, i) => sleep(260 + i * 110).then(() => docs.get(x.dataset.f)?.tw({ x: s.width - rel(x, stage).x + 40, rz: 8 }, 560, easeIn, k => ({ h: 16 * Math.sin(Math.PI * k) })))),
                ])
                card.hover(false)
                const png = docs.get('PNG').el
                await flip([png], () => swept.forEach(x => x.remove()))
                await sleep(250)
                reset()
                cardB.set({ x: 0, y: -(r0.y + r0.h + 60), rz: 0 })
            }
        })
    }

    // ---------------------------------------------------------------- fit under size
    // One recording, two fits: under 25MB by compression alone, then under 10MB, where the
    // resolution finally drops. The slider is log-scaled from the current size down to
    // max(50KB, size/200), with magnetic stops on the presets in range (CardTargetSizeSlider).
    const PRESETS = [500_000, 1e6, 2e6, 5e6, 8e6, 10e6, 25e6, 50e6]

    function initFitUnder() {
        const demo = document.getElementById('fit-under-demo')
        if (!demo) return
        const stage = makeCam(demo.querySelector('.cd-stage'), 260, 214)
        const card = makeCard(stage.querySelector('.cd-slot'), {
            thumb: '/static/img/clop-demo/screen-recording.jpg',
            formats: ['MP4', 'MOV', 'GIF', 'WEBM', 'HEVC', 'AV1'],
            grid: ['minus', 'restore', 'sliders', 'target', 'share', 'plane'],
        })
        const cardB = body(card.el, cardShadow(card.el))
        const cursor = makeCursor(stage)
        const track = card.el.querySelector('.cd-track')
        const knob = card.el.querySelector('.cd-knob')
        const hint = card.el.querySelector('.cd-hint')
        const ORIG = 64_200_000

        function sliderFor(maxB) {
            const minB = Math.max(50_000, maxB / 200)
            const pos = b => Math.log(maxB / b) / Math.log(maxB / minB)
            const v = b => 1 - 0.9 * pos(b)
            const bytesAt = vv => maxB * Math.pow(minB / maxB, Math.min(Math.max((1 - vv) / 0.9, 0), 1))
            track.querySelectorAll('.tick').forEach(t => t.remove())
            const snaps = PRESETS.filter(p => p > minB && p < maxB)
            for (const p of snaps) {
                const t = document.createElement('span')
                t.className = 'tick'
                t.style.left = `${v(p) * 100}%`
                track.append(t)
            }
            return { v, bytesAt, snaps: snaps.map(p => [v(p), p]) }
        }
        const setKnob = vv => (knob.style.left = `${vv * 100}%`)

        async function fit(fromB, toB, newB, res, zoom = false) {
            const s = sliderFor(fromB)
            const target = card.btn('target')
            // the first time, the view moves in on the card so the slider's small type is legible
            await Promise.all([cursor.to(target), zoom ? sleep(150).then(() => stage.zoomOn(card.el, 1.18, -16)) : null])
            await sleep(200)
            const press = pressCard(cardB, stage, cursor.p)
            cursor.press()
            press.down()
            card.slider(true)
            setKnob(1)
            hint.textContent = `fit under ${humanSize(fromB)}`
            await sleep(380)
            // press-and-drag continues straight into the slider: the pointer rides the knob
            const tr = rel(track, stage)
            const y = tr.cy
            const xAt = vv => tr.x + vv * tr.w
            await cursor.toXY(xAt(1), y, 300)
            press.up()
            // the hand overshoots the stop a little; the knob holds on the magnet until it lets go
            const end = s.v(toB)
            const over = end - 0.012
            let snapped = null
            await tween(1600, e => {
                const hand = 1 + (over - 1) * e
                cursor.jump(xAt(hand), y)
                const near = s.snaps.filter(([sv]) => Math.abs(sv - hand) < 0.022).sort((a, b) => Math.abs(a[0] - hand) - Math.abs(b[0] - hand))[0]
                const kv = near ? near[0] : hand
                if (near && snapped !== near[1]) {
                    snapped = near[1]
                    flash(knob, 'glow', 500)
                } else if (!near) snapped = null
                setKnob(kv)
                hint.textContent = `fit under ${humanSize(near ? near[1] : s.bytesAt(kv))}`
            })
            await sleep(450)
            await cursor.toXY(xAt(end), y, 260)
            await sleep(300)
            cursor.release()
            card.slider(false)
            card.hover(false)
            card.run(`Fitting under ${humanSize(toB)}`)
            if (zoom) stage.zoomTo(1)
            // pointer steps off the card so it never covers the result
            const st = box(stage)
            await Promise.all([cursor.toXY(st.width - 10, st.height - 6, 700), runProgress(card, 1800)])
            card.done()
            await Promise.all([
                card.landSize(newB, 1000).then(() => flash(card.el.querySelector('.cd-size .new'), 'glow', 1100)),
                res ? sleep(250).then(() => card.landRes(...res, 900)).then(() => flash(card.el.querySelector('.cd-res .b'), 'glow', 1100)) : null,
            ])
        }

        const restXY = () => {
            const s = box(stage)
            return [s.width + 30, s.height * 0.85]
        }

        function reset() {
            card.setSize(ORIG, null)
            card.setRes(2880, 1800)
            card.setActive('MP4')
            card.hover(false)
            card.slider(false)
            card.done()
            cursor.jump(...restXY())
        }

        whileVisible(demo, async gate => {
            await sleep(60)
            reset()
            const r0 = rel(card.el, stage)
            cardB.set({ y: -(r0.y + r0.h + 60) })
            while (true) {
                await gate()
                await sleep(300)
                await dropIn(cardB, stage)
                await sleep(500)
                await cursor.to(card.el, { dy: -20 })
                card.hover(true)
                await sleep(600)
                await gate()
                await fit(ORIG, 25e6, 23_400_000, null, true)
                await sleep(1800)

                await gate()
                await cursor.to(card.el, { dy: -20 })
                card.hover(true)
                await sleep(500)
                await fit(23_400_000, 10e6, 9_600_000, [1920, 1200])
                await sleep(2400)

                // drag the result out to wherever it was going; Clop dismisses it on drop
                await gate()
                const top = rel(card.el, stage)
                await cursor.toXY(top.cx, top.y + 12)
                await sleep(200)
                cursor.press()
                card.hover(false)
                await cardB.to({ h: 40 }, { k: 260, c: 16 })
                const s = box(stage)
                const x0 = cursor.p.x
                const y0 = cursor.p.y
                const dx = s.width - x0 + 160
                const dy = -40
                await tween(950, (e, k) => {
                    cursor.jump(x0 + dx * e, y0 + dy * e)
                    // the card trails the hand and leans into the drag
                    const lag = smooth(Math.max(0, k * 1.08 - 0.08))
                    const vel = Math.sin(Math.PI * k)
                    cardB.set({ x: dx * lag, y: dy * lag, rz: 6 * vel, h: 40 + 60 * lag })
                }, x => x)
                cursor.release()
                await sleep(800)
                reset()
                cardB.set({ x: 0, y: -(r0.y + r0.h + 60), h: 0, rx: 0, ry: 0, rz: 0 })
            }
        })
    }

    // ---------------------------------------------------------------- stats line
    function initStats() {
        const nums = document.querySelectorAll('#stats [data-count]')
        if (!nums.length) return
        let done = false
        new IntersectionObserver(entries => {
            if (done || !entries.some(e => e.isIntersecting)) return
            done = true
            nums.forEach(el => {
                const to = +el.dataset.count
                if (MP.paused) return (el.textContent = to)
                const t0 = performance.now()
                const tick = now => {
                    // Pause all motion pressed mid-count lands it on the final value
                    const k = MP.paused ? 1 : Math.min(1, (now - t0) / 1200)
                    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)))
                    if (k < 1) requestAnimationFrame(tick)
                }
                requestAnimationFrame(tick)
            })
        }, { threshold: 0.6 }).observe(document.getElementById('stats'))
    }

    // ---------------------------------------------------------------- section clips
    // Only one clip plays at a time, and none while the film is playing, so nothing moves beside what
    // is being watched. Scrolled until less than half of it shows, the film pauses and the clips take
    // over. On their own, the clip in focus plays: the one nearest the viewport centre with at least
    // half of it on screen. A click or tap on a clip, the pair clips included, pauses it and it stays
    // paused until it is less than half on screen; on a paused clip it plays it and keeps it playing
    // past the focus pick. Ported from Cling's three-up row (cling-demos.js initClips). While motion
    // is paused nothing starts on its own, and clips play and stop on click or tap. Every clip gets
    // MotionPause's play/pause button and dim (MotionPause.clip).
    function initClips() {
        const clips = [...document.querySelectorAll('video.page-clip')]
        if (!clips.length) return

        const film = document.getElementById('clop-video')
        const onScreen = new Set()
        let filmVisible = false
        let queued = false
        // the pair clip someone chose, and whether they then stopped it with a tap
        let held = null
        let heldStopped = false

        const filmPlaying = () => film && filmVisible && !film.paused && !film.ended
        const halfShown = v => {
            // clips go by the observer; the film and its poster are measured directly (the film unhides and plays before the observer reports it)
            if (clips.includes(v) && !onScreen.has(v)) return false
            const r = v.getBoundingClientRect()
            const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)
            return shown >= Math.min(r.height, innerHeight) * 0.5
        }
        // skimming: a clip picked by scroll position starts only once the page has held still for
        // SETTLE ms; stopping is immediate, and a clip someone clicked or tapped starts at once
        const SETTLE = 400
        let lastScroll = -Infinity
        let settleTimer = 0
        addEventListener('scroll', () => (lastScroll = performance.now()), { passive: true })
        const start = v => {
            const wait = v === held ? 0 : SETTLE - (performance.now() - lastScroll)
            clearTimeout(settleTimer)
            if (wait > 0) settleTimer = setTimeout(refocus, wait)
            else v.play()?.catch(() => {})
        }
        // the film starts by itself once: the first time at least half of it is on screen with the page
        // settled (on load, when it is already in view); scrolled past, it pauses like any clip. Its
        // poster frame stays up until the first frame is ready, and if the browser refuses to autoplay
        // (Low Power Mode) the poster and play button come back.
        let autoFilm = film
        const posterShown = () => {
            const poster = autoFilm?.closest('.zstack')?.querySelector('.video-poster')
            return poster && autoFilm.classList.contains('hidden') && halfShown(poster)
        }
        const startFilm = film => {
            const box = film.closest('.zstack')
            const poster = box.querySelector('.video-poster')
            const btn = box.querySelector('.play-btn')
            film.poster = poster.currentSrc || poster.src
            film.classList.remove('hidden')
            poster.style.display = 'none'
            if (btn) btn.style.display = 'none'
            film.play()?.then(
                () => {
                    box.onclick = null
                    film.onclick = () => (film.paused ? film.play() : film.pause())
                },
                () => {
                    film.classList.add('hidden')
                    poster.style.display = ''
                    if (btn) btn.style.display = ''
                }
            )
        }
        const focus = () => {
            queued = false
            // the film keeps the stage only while half of it is on screen: scrolled past, it stops and
            // its pause event hands the stage back to the clips
            if (film && film.readyState >= 1 && !film.paused && !film.ended && !halfShown(film)) return film.pause()
            if (MP.paused) return
            if (posterShown()) {
                const wait = SETTLE - (performance.now() - lastScroll)
                clearTimeout(settleTimer)
                if (wait > 0) return void (settleTimer = setTimeout(refocus, wait))
                startFilm(autoFilm)
                autoFilm = null
                return
            }
            let best = null
            if (filmPlaying()) held = null
            else if (held && !halfShown(held)) held = null
            if (held) best = heldStopped ? null : held
            else if (!filmPlaying()) {
                const mid = innerHeight / 2
                let bestDist = Infinity
                for (const v of onScreen) {
                    if (!halfShown(v)) continue
                    const r = v.getBoundingClientRect()
                    const dist = Math.abs(r.top + r.height / 2 - mid)
                    if (dist < bestDist) (bestDist = dist), (best = v)
                }
            }
            for (const v of clips) {
                if (v === best) v.paused && start(v)
                else if (!v.paused) v.pause()
            }
        }
        const refocus = () => queued || ((queued = true), requestAnimationFrame(focus))

        const io = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (e.target === film) filmVisible = e.isIntersecting
                else if (e.isIntersecting) onScreen.add(e.target)
                else onScreen.delete(e.target)
            }
            refocus()
        }, { threshold: [0, 0.3] })
        clips.forEach(v => io.observe(v))
        if (film) {
            io.observe(film)
            for (const ev of ['play', 'pause', 'ended']) film.addEventListener(ev, refocus)
            // while paused, the film started by hand stops a loop started by hand
            film.addEventListener('play', () => MP.paused && clips.forEach(v => v.paused || v.pause()))
        }
        addEventListener('scroll', refocus, { passive: true })
        addEventListener('resize', refocus)
        MP.subscribe(paused => {
            // a choice made while paused does not carry over into the focus pick
            if (!paused) (held = null), (heldStopped = false)
            refocus()
        })

        const choose = (v, stop = false) => {
            if (filmPlaying()) return
            held = v
            heldStopped = stop
            focus()
        }
        // by hand while paused: one clip at a time, the film included
        const toggleByHand = v => {
            if (!v.paused) return v.pause()
            clips.forEach(o => o !== v && !o.paused && o.pause())
            if (film && !film.paused) film.pause()
            v.play()?.catch(() => {})
        }
        // a click or tap on any clip pauses it, and it stays paused until it scrolls out of view;
        // on a paused one it plays it
        const tap = v => (MP.paused ? toggleByHand(v) : choose(v, !v.paused))
        for (const v of clips) {
            const btn = MP.clip(v, v.closest('.clip-cap') || v.parentElement, () => tap(v))
            const wrap = v.closest('.pair-clip')
            if (!wrap) continue
            // the label dims with the video's own state, whoever started or stopped it
            const sync = () => wrap.classList.toggle('playing', !v.paused && !v.ended)
            for (const ev of ['play', 'playing', 'pause', 'ended', 'emptied']) v.addEventListener(ev, sync)
            sync()
            // the label; the clip itself is covered by its MotionPause button
            wrap.addEventListener('click', () => btn.click())
        }
    }

    // ---------------------------------------------------------------- film chapters
    // A thumb per section under the film (tools/clop-chapters.py). Clicking one starts the film if it has
    // not started and seeks to that section; while it plays, the section on screen is lifted and kept
    // in view inside the row (horizontally only, the page never scrolls for it).
    function initChapters() {
        const nav = document.getElementById('chapters')
        const film = document.getElementById('clop-video')
        if (!nav || !film) return
        const row = nav.querySelector('.chapter-row')
        const thumbs = [...nav.querySelectorAll('.chapter')].map(el => ({
            el,
            start: parseFloat(el.dataset.start),
            end: parseFloat(el.dataset.end),
        }))
        let current = null

        const mark = () => {
            const t = film.currentTime
            const hit = thumbs.find(c => t >= c.start && t < c.end)?.el ?? null
            if (hit === current) return
            current?.classList.remove('is-current')
            current?.removeAttribute('aria-current')
            current = hit
            if (!hit) return
            hit.classList.add('is-current')
            hit.setAttribute('aria-current', 'true')
        }
        const seek = t => {
            const go = () => {
                film.currentTime = t + 0.01
                mark()
                if (film.paused) film.play()?.catch(() => {})
            }
            if (film.readyState >= 1) go()
            else film.addEventListener('loadedmetadata', go, { once: true })
        }

        for (const { el, start } of thumbs) {
            el.addEventListener('click', () => {
                if (film.classList.contains('hidden')) window.playVideo?.(document.getElementById('video-container'))
                seek(start)
            })
        }
        film.addEventListener('play', () => nav.classList.add('is-live'))
        film.addEventListener('timeupdate', mark)
        film.addEventListener('seeked', mark)
    }

    const start = () => {
        initFormatBar()
        initFitUnder()
        initStats()
        initClips()
        initChapters()
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
})()
