// Live demos on /cling: the search operators field, the exclude-from-index picker,
// the stats line, the section clips and the chapters under the film. Each demo runs only while it is on screen.
// Everything that moves on its own goes through MotionPause (motion-pause.js): with reduced motion or
// after Pause all motion, nothing self-plays and every piece keeps a play button of its own.
(() => {
    const MP = window.MotionPause || { paused: false, subscribe: fn => fn(false), clip() {}, demo: null }
    const ICON = n => `/static/img/cling-file-icons/${n}.png`
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // ---------------------------------------------------------------- search operators
    const FILES = [
        { name: 'recipe-lasagna.pdf', path: '~/Documents/Recipes', icon: 'pdf' },
        { name: 'recipe-pancake.jpg', path: '~/Pictures/Recipes', icon: 'png' },
        { name: 'recipe-ideas.md', path: '~/Notes', icon: 'md' },
        { name: 'lasagna-recipe.pdf', path: '~/Downloads', icon: 'pdf' },
        { name: 'recipe-tomato-soup.pdf', path: '~/Documents/Recipes', icon: 'pdf' },
        { name: 'recipe-cupcake.jpg', path: '~/Pictures/Recipes', icon: 'png' },
        { name: 'recipe-book-draft.pdf', path: '~/Documents/Recipes/Drafts', icon: 'pdf' },
        { name: 'recipe-cards.pdf', path: '~/Desktop', icon: 'pdf' },
        { name: 'recipe-lasagna.jpg', path: '~/Pictures/Recipes', icon: 'png' },
        { name: 'recipe-soup.jpg', path: '~/Pictures/Recipes/2019', icon: 'png' },
        { name: 'recipe-scan.jpg', path: '~/Downloads', icon: 'png' },
        { name: 'recipe-cake.jpg', path: '~/Pictures/Recipes/2019', icon: 'png' },
    ].map((f, id) => {
        const dot = f.name.lastIndexOf('.')
        return { ...f, id, stem: f.name.slice(0, dot), ext: f.name.slice(dot + 1) }
    })

    // One query, edited step by step: ['type', text] appends, ['replace', old, new] edits in place.
    const STEPS = [
        [['type', 'rcp']],
        [['type', ' .pdf']],
        [['type', ' !draft']],
        [['type', ' ^recipe']],
        [['type', ' Recipes/']],
        [['replace', 'pdf', 'jpg'], ['replace', ' !draft', ''], ['replace', ' Recipes/', '']],
        [['type', ' in:~/Pictures']],
        [['type', ' depth:1']],
        [['type', ' cake$']],
    ]
    const MAX_ROWS = 6
    const ROW_H = 46

    const tokenKind = t =>
        t.startsWith('!') ? 'not'
        : t.startsWith('in:') || t.startsWith('depth:') ? 'in'
        : t.startsWith('.') ? 'ext'
        : t.startsWith('^') || (t.endsWith('$') && t.length > 1) ? 'anchor'
        : t.endsWith('/') ? 'dir'
        : 'fuzzy'

    function parse(q) {
        const p = { fuzzy: [], ext: [], not: [], start: [], end: [], dir: [], in: null, depth: null }
        for (const t of q.split(/\s+/).filter(Boolean)) {
            const k = tokenKind(t)
            if (k === 'not' && t.length > 1) p.not.push(t.slice(1).toLowerCase())
            else if (t.startsWith('in:')) p.in = t.slice(3)
            else if (t.startsWith('depth:')) p.depth = parseInt(t.slice(6), 10)
            else if (k === 'ext' && t.length > 1) p.ext.push(t.slice(1).toLowerCase())
            else if (t.startsWith('^') && t.length > 1) p.start.push(t.slice(1).toLowerCase())
            else if (t.endsWith('$') && t.length > 1) p.end.push(t.slice(0, -1).toLowerCase())
            else if (k === 'dir' && t.length > 1) p.dir.push(t.slice(0, -1).toLowerCase())
            else if (k === 'fuzzy') p.fuzzy.push(t.toLowerCase())
        }
        return p
    }

    // Returns { ok, why, name: Map(index -> class), path: [start, end, class][] }
    function evaluate(f, p) {
        const lname = f.name.toLowerCase()
        const lstem = f.stem.toLowerCase()
        const name = new Map()
        const path = []
        let why = null
        const fail = w => (why = why || w)

        for (const w of p.fuzzy) {
            let i = 0
            const hits = []
            for (const ch of w) {
                i = lname.indexOf(ch, i)
                if (i < 0) break
                hits.push(i++)
            }
            if (hits.length < w.length) fail('fuzzy')
            else hits.forEach(h => name.set(h, 'hl-f'))
        }
        if (p.ext.length && !p.ext.includes(f.ext)) fail('ext')
        for (const w of p.start) {
            if (lstem.startsWith(w)) for (let i = 0; i < w.length; i++) name.set(i, 'hl-a')
            else fail('start')
        }
        for (const w of p.end) {
            if (lstem.endsWith(w)) for (let i = lstem.length - w.length; i < lstem.length; i++) name.set(i, 'hl-a')
            else fail('end')
        }
        for (const w of p.not) {
            const at = lname.indexOf(w)
            if (at >= 0) {
                for (let i = at; i < at + w.length; i++) name.set(i, 'hl-n')
                fail('not')
            }
        }
        for (const w of p.dir) {
            const lp = f.path.toLowerCase()
            const at = lp.indexOf(w)
            if (at >= 0) path.push([at, at + w.length, 'hl-d'])
            else fail('dir')
        }
        if (p.in) {
            if (f.path === p.in || f.path.startsWith(p.in + '/')) {
                path.push([0, p.in.length, 'hl-i'])
                if (p.depth != null) {
                    const rest = f.path.slice(p.in.length).split('/').filter(Boolean)
                    if (rest.length > p.depth) {
                        const keep = p.in.length + rest.slice(0, p.depth).reduce((n, s) => n + s.length + 1, 0)
                        path.push([keep + 1, f.path.length, 'hl-n'])
                        fail('depth')
                    }
                }
            } else {
                path.push([0, f.path.length, 'hl-n'])
                fail('in')
            }
        }
        return { ok: !why, why, name, path }
    }

    function markup(text, ranges, fresh) {
        // ranges: Map(index -> class) or [start, end, class][]
        const cls = new Array(text.length).fill(null)
        if (ranges instanceof Map) ranges.forEach((c, i) => (cls[i] = c))
        else ranges.forEach(([a, b, c]) => {
            for (let i = a; i < b; i++) cls[i] = c
        })
        let out = ''
        let i = 0
        while (i < text.length) {
            const c = cls[i]
            let j = i
            while (j < text.length && cls[j] === c) j++
            const chunk = esc(text.slice(i, j))
            out += c ? `<mark class="${c}${fresh.has(c) ? ' fresh' : ''}">${chunk}</mark>` : chunk
            i = j
        }
        return out
    }

    function initOperators() {
        const demo = document.getElementById('query-demo')
        if (!demo) return
        const field = demo.querySelector('.qd-text')
        const placeholder = demo.querySelector('.qd-placeholder')
        const list = demo.querySelector('.qd-results')
        const rows = new Map()
        let text = ''

        function renderField(caret = text.length, sel = null) {
            placeholder.style.display = text ? 'none' : ''
            let html = ''
            const re = /\S+/g
            let m
            let last = 0
            const kinds = new Array(text.length).fill(null)
            while ((m = re.exec(text))) for (let i = m.index; i < m.index + m[0].length; i++) kinds[i] = tokenKind(m[0])
            for (let i = 0; i <= text.length; i++) {
                if (i === caret) html += '<span class="qd-caret"></span>'
                if (i === text.length) break
                const inSel = sel && i >= sel[0] && i < sel[1]
                const k = kinds[i]
                html += `<span class="${k ? 'tk-' + k : ''}${inSel ? ' qd-sel' : ''}">${esc(text[i])}</span>`
            }
            field.innerHTML = html
            void last
        }

        function rowEl(f) {
            const el = document.createElement('div')
            el.className = 'qrow entering'
            el.innerHTML = `<img src="${ICON(f.icon)}" alt=""><div class="qmain"><div class="qname"></div><div class="qpath"></div></div><span class="qkind"></span>`
            list.append(el)
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('entering')))
            return el
        }

        function paintRow(el, f, r, p, fresh) {
            el.querySelector('.qname').innerHTML = markup(f.name, r.name, fresh)
            el.querySelector('.qpath').innerHTML = markup(f.path, r.path, fresh)
            const kind = el.querySelector('.qkind')
            kind.textContent = f.ext.toUpperCase()
            const extOn = p.ext.includes(f.ext)
            kind.className = 'qkind' + (extOn ? ' hl-e' : '') + (extOn && fresh.has('hl-e') ? ' fresh' : '')
        }

        // step(ms) waits between beats; without it the results are drawn at once, with nothing popping
        async function applyResults(q, prevQ, step) {
            const p = parse(q)
            const before = parse(prevQ)
            const fresh = new Set()
            if (step) {
                if (p.fuzzy.join() !== before.fuzzy.join()) fresh.add('hl-f')
                if (p.ext.join() !== before.ext.join()) fresh.add('hl-e')
                if (p.start.join() !== before.start.join() || p.end.join() !== before.end.join()) fresh.add('hl-a')
                if (p.dir.join() !== before.dir.join()) fresh.add('hl-d')
                if (p.in !== before.in || p.depth !== before.depth) fresh.add('hl-i')
                fresh.add('hl-n')
            }

            const results = FILES.map(f => ({ f, r: evaluate(f, p) }))
            const shown = q.trim() ? results.filter(x => x.r.ok).slice(0, MAX_ROWS) : []
            const shownIds = new Set(shown.map(x => x.f.id))

            // Rows on their way out first show why: the struck word, the path outside in:, the extra depth.
            const leaving = [...rows.keys()].filter(id => !shownIds.has(id))
            const explained = leaving.filter(id => ['not', 'in', 'depth'].includes(results[id].r.why))
            for (const id of explained) {
                const el = rows.get(id)
                paintRow(el, FILES[id], results[id].r, p, fresh)
                el.classList.add('struck')
            }
            if (explained.length && step) await step(750)

            for (const id of leaving) {
                const el = rows.get(id)
                rows.delete(id)
                el.classList.add('leaving')
                setTimeout(() => el.remove(), 350)
            }
            shown.forEach((x, i) => {
                let el = rows.get(x.f.id)
                if (!el) {
                    el = rowEl(x.f)
                    rows.set(x.f.id, el)
                }
                el.style.top = `${i * ROW_H}px`
                paintRow(el, x.f, x.r, p, fresh)
            })
            list.style.height = `${Math.max(shown.length, 1) * ROW_H}px`
        }

        async function typeText(s, step) {
            for (const ch of s) {
                text += ch
                renderField()
                await step(55 + Math.random() * 55)
            }
        }

        async function replaceText(oldS, newS, step) {
            const at = text.indexOf(oldS)
            if (at < 0) return
            renderField(at + oldS.length, [at, at + oldS.length])
            await step(450)
            text = text.slice(0, at) + text.slice(at + oldS.length)
            renderField(at)
            await step(120)
            for (let i = 0; i < newS.length; i++) {
                text = text.slice(0, at + i) + newS[i] + text.slice(at + i)
                renderField(at + i + 1)
                await step(70)
            }
        }

        const reset = () => {
            text = ''
            rows.clear()
            list.replaceChildren()
            list.style.height = `${ROW_H}px`
            renderField()
        }
        // resting frame: five operators at work, two files left
        const REST_STEPS = 5
        const rest = () => {
            reset()
            for (const step of STEPS.slice(0, REST_STEPS))
                for (const [op, a, b] of step) {
                    if (op === 'type') text += a
                    else text = text.replace(a, b)
                }
            renderField()
            applyResults(text, '')
        }
        const run = async step => {
            reset()
            await step(400)
            let prev = ''
            for (const s of STEPS) {
                for (const [op, a, b] of s) {
                    if (op === 'type') await typeText(a, step)
                    else await replaceText(a, b, step)
                }
                renderField()
                await applyResults(text, prev, step)
                prev = text
                await step(1900)
            }
            await step(1800)
            renderField(text.length, [0, text.length])
            await step(500)
            text = ''
            renderField()
            await applyResults('', prev, step)
            await step(700)
        }
        if (MP.demo) MP.demo(demo, { run, rest })
        else rest()
    }

    // ---------------------------------------------------------------- exclude from index
    const EX_FILES = [
        { name: 'app.js.map', path: '~/Projects/site/build', icon: 'json' },
        { name: 'vendor.js.map', path: '~/Projects/site/build', icon: 'json' },
        { name: 'index.js', path: '~/Projects/site/node_modules/react', icon: 'txt' },
        { name: 'index.js', path: '~/Projects/site/node_modules/lodash', icon: 'txt' },
        { name: 'index.js', path: '~/Projects/site/src', icon: 'txt' },
        { name: 'app.js', path: '~/Projects/site/src', icon: 'txt' },
    ]
    // Option titles and rule lines as ExcludeFromIndex.swift builds them for the selected file.
    const EX_STEPS = [
        { sel: 0, pick: 0, rule: '/Projects/site/build/app.js.map', hits: [0] },
        { sel: 0, pick: 1, rule: '*.map', hits: [0, 1] },
        { sel: 2, pick: 2, rule: 'index.js', hits: [2, 3, 4] },
        { sel: 2, pick: 3, rule: '/Projects/site/node_modules/', hits: [2, 3] },
    ]
    const exOptions = f => {
        const ext = f.name.slice(f.name.lastIndexOf('.') + 1)
        return ['Exactly this path (recommended)', `All .${ext} files`, `All items named “${f.name}”`, 'Everything in a parent folder']
    }

    function initExclude() {
        const demo = document.getElementById('exclude-demo')
        if (!demo) return
        const list = demo.querySelector('.ex-results')
        const opts = demo.querySelector('.ex-options')
        const rule = demo.querySelector('.ex-rule')
        list.innerHTML = EX_FILES.map(f =>
            `<div class="exrow"><img src="${ICON(f.icon)}" alt=""><div class="qmain"><div class="qname">${esc(f.name)}</div><div class="qpath">${esc(f.path)}</div></div></div>`
        ).join('')
        const rowEls = [...list.children]

        const showOptions = (f, picked) => {
            opts.innerHTML = exOptions(f).map((t, i) =>
                `<div class="exopt${i === picked ? ' on' : ''}"><span class="dot"></span><span>${esc(t)}</span></div>`
            ).join('')
        }

        const reset = () => {
            rowEls.forEach(el => el.classList.remove('struck', 'gone', 'sel'))
            opts.innerHTML = ''
            rule.classList.remove('on')
        }
        // resting frame: "All .map files" picked, the two files it hides struck through
        const rest = () => {
            reset()
            const s = EX_STEPS[1]
            rowEls.forEach((el, i) => el.classList.toggle('sel', i === s.sel))
            showOptions(EX_FILES[s.sel], s.pick)
            rule.innerHTML = `<b>+</b> ${esc(s.rule)}`
            rule.classList.add('on')
            s.hits.forEach(i => rowEls[i].classList.add('struck'))
        }
        const run = async step => {
            reset()
            await step(300)
            for (const s of EX_STEPS) {
                rowEls.forEach((el, i) => el.classList.toggle('sel', i === s.sel))
                showOptions(EX_FILES[s.sel], -1)
                rule.classList.remove('on')
                await step(900)
                showOptions(EX_FILES[s.sel], s.pick)
                rule.innerHTML = `<b>+</b> ${esc(s.rule)}`
                rule.classList.add('on')
                await step(700)
                s.hits.forEach(i => rowEls[i].classList.add('struck'))
                await step(750)
                s.hits.forEach(i => rowEls[i].classList.add('gone'))
                await step(2000)
                rowEls.forEach(el => el.classList.remove('struck', 'gone', 'sel'))
                await step(700)
            }
        }
        if (MP.demo) MP.demo(demo, { run, rest })
        else rest()
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
    // Only one clip plays at a time. The loops play on their own: the one nearest the viewport centre
    // with at least half of it on screen. The three-up plays on click or tap, and a three-up clip
    // someone started takes over from the loops. Nothing plays while a film (the showcase, the Raycast
    // screencast) is playing on screen; scrolled until less than half of it shows, a film pauses. A
    // click or tap pauses any clip; a loop stays paused until it scrolls out of view. While motion is
    // paused nothing starts on its own, and clips play and stop on click or tap. Every clip gets
    // MotionPause's play/pause button and dim (MotionPause.clip).
    function initClips() {
        const clips = [...document.querySelectorAll('video.page-clip')]
        if (!clips.length) return

        const trio = clips.filter(v => v.closest('.trio-clip'))
        const loops = clips.filter(v => !trio.includes(v))
        const films = [document.getElementById('cling-video'), document.querySelector('#raycast-video-container video')].filter(Boolean)
        const onScreen = new Set()
        let queued = false
        // a loop someone clicked or tapped: kept playing, or kept stopped, until it scrolls out of view
        let held = null
        let heldStopped = false

        const filmPlaying = () => films.some(f => onScreen.has(f) && !f.paused && !f.ended)
        const halfShown = v => {
            // clips go by the observer; films and posters are measured directly (a film unhides and plays before the observer reports it)
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
        let autoFilm = document.getElementById('cling-video')
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
            // a film keeps the stage only while half of it is on screen: scrolled past, it stops and
            // its pause event hands the stage back to the clips
            for (const f of films) if (f.readyState >= 1 && !f.paused && !f.ended && !halfShown(f)) f.pause()
            if (MP.paused) return
            if (posterShown()) {
                const wait = SETTLE - (performance.now() - lastScroll)
                clearTimeout(settleTimer)
                if (wait > 0) return void (settleTimer = setTimeout(refocus, wait))
                startFilm(autoFilm)
                autoFilm = null
                return
            }
            const film = filmPlaying()
            const chosen = !film && trio.find(v => !v.paused)
            let best = null
            if (held && !halfShown(held)) held = null
            if (!film && !chosen && held) best = heldStopped ? null : held
            else if (!film && !chosen) {
                const mid = innerHeight / 2
                let bestDist = Infinity
                for (const v of loops) {
                    if (!halfShown(v)) continue
                    const r = v.getBoundingClientRect()
                    const dist = Math.abs(r.top + r.height / 2 - mid)
                    if (dist < bestDist) (bestDist = dist), (best = v)
                }
            }
            for (const v of loops) {
                if (v === best) v.paused && start(v)
                else if (!v.paused) v.pause()
            }
            for (const v of trio) if (!v.paused && (film || !onScreen.has(v))) v.pause()
        }
        const refocus = () => queued || ((queued = true), requestAnimationFrame(focus))

        const io = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (e.isIntersecting) onScreen.add(e.target)
                else onScreen.delete(e.target)
            }
            refocus()
        }, { threshold: [0, 0.3] })
        clips.forEach(v => io.observe(v))
        for (const f of films) {
            io.observe(f)
            for (const ev of ['play', 'pause', 'ended']) f.addEventListener(ev, refocus)
        }
        addEventListener('scroll', refocus, { passive: true })
        addEventListener('resize', refocus)
        MP.subscribe(paused => (paused || (held = null), refocus()))

        const playOne = v => {
            if (filmPlaying()) return
            clips.forEach(o => o !== v && !o.paused && o.pause())
            v.play()?.catch(() => {})
        }
        trio.forEach(v => {
            const wrap = v.closest('.trio-clip')
            v.addEventListener('play', refocus)
            v.addEventListener('pause', refocus)
            MP.clip(v, wrap, () => (v.paused ? playOne(v) : v.pause()))
        })
        // a loop clicked or tapped is held: stopped stays stopped, started keeps playing
        for (const v of loops) {
            MP.clip(v, v.closest('.demo-media') || v.parentElement, () => {
                if (MP.paused) return v.paused ? playOne(v) : v.pause()
                if (filmPlaying()) return
                held = v
                heldStopped = !v.paused
                focus()
            })
        }
    }

    // ---------------------------------------------------------------- film chapters
    // A thumb per section under the film (tools/cling-chapters.py). Clicking one starts the film if it has
    // not started and seeks to that section; while it plays, the section on screen is lifted and kept
    // in view inside the row (horizontally only, the page never scrolls for it).
    function initChapters() {
        const nav = document.getElementById('chapters')
        const film = document.getElementById('cling-video')
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
        initOperators()
        initExclude()
        initStats()
        initClips()
        initChapters()
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
})()
