// Pause all motion: a small toggle fixed at the bottom right, and the switch every self-moving piece
// of a page listens to. Load it in <head> WITHOUT defer, before the page's own scripts, so the root
// class is set before first paint; import stylus/motion-pause in the page's stylus for its look.
//
// State: paused when the visitor pressed the button, or when prefers-reduced-motion is on and they
// have not pressed Play all motion. Only a choice that differs from the media query's default is
// stored, so a visitor who later turns reduced motion on or off still gets the right default.
//
// While paused, <html> carries .motion-paused: CSS animations are frozen and transitions are instant
// (stylus/motion-pause.styl), every playing <video> is paused once, and nothing may start on its own.
// A visitor can still play anything by hand.
//
// API (window.MotionPause):
//   paused                 true while motion is paused
//   reduced                prefers-reduced-motion: reduce, live
//   subscribe(fn)          fn(paused) now and on every change; returns an unsubscribe function
//   set(paused)            change it from code (remembered like a press of the button)
//   clip(video, host?, toggle?)
//                          play/pause button over a clip: the play button while it is paused, a
//                          faint dim too once someone stopped it, both stronger on hover; nothing
//                          shows while it plays unhovered. Click the returned button to stop or
//                          start the clip from elsewhere (a label) so it counts as by hand. host
//                          defaults to the video's parent and needs to be the box the video is centred
//                          in. toggle() replaces the plain play/pause, so a page's own focus rules
//                          (which clip may play, a stopped clip staying stopped) apply to the button
//   demo(el, { run, rest, controls? })
//                          a self-running HTML demo. While motion plays and el is near the viewport,
//                          run(step) is called in a loop; while paused, rest() draws a still frame and
//                          a play button runs run(step) once. run must start from scratch each call and
//                          await step(ms) between beats: step sleeps, parks while el is off screen, and
//                          throws when the run is cancelled (so run needs no cleanup of its own;
//                          rest() is always called after a cancel). `controls` is where the play button
//                          goes (default el).
(() => {
    if (window.MotionPause) return
    const KEY = 'motion-paused'
    const root = document.documentElement
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const listeners = new Set()
    const LABEL = { pause: 'Pause all motion', play: 'Play all motion' }
    const CLIP_LABEL = { play: 'Play', pause: 'Pause' }
    const GLYPH = {
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>',
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.6v12.8a.9.9 0 0 0 1.37.77l10.2-6.4a.9.9 0 0 0 0-1.54l-10.2-6.4A.9.9 0 0 0 8.5 5.6z"/></svg>',
    }

    const read = () => {
        try {
            const v = localStorage.getItem(KEY)
            return v === '1' ? true : v === '0' ? false : null
        } catch {
            return null
        }
    }
    const write = paused => {
        try {
            if (paused === mq.matches) localStorage.removeItem(KEY)
            else localStorage.setItem(KEY, paused ? '1' : '0')
        } catch {}
    }

    let paused = null
    const apply = next => {
        if (next === paused) return
        paused = next
        root.classList.toggle('motion-paused', paused)
        if (paused) document.querySelectorAll('video').forEach(v => v.paused || v.pause())
        syncButton()
        listeners.forEach(fn => fn(paused))
    }
    const resolve = () => apply(read() ?? mq.matches)

    // ---------------------------------------------------------------- the button
    let button = null
    function syncButton() {
        if (!button) return
        const label = paused ? LABEL.play : LABEL.pause
        button.setAttribute('aria-pressed', String(paused))
        button.setAttribute('aria-label', label)
        button.querySelector('.mp-glyph').innerHTML = paused ? GLYPH.play : GLYPH.pause
        button.querySelector('.mp-tip').textContent = label
    }
    function mountButton() {
        if (button || !document.body) return
        button = document.createElement('button')
        button.type = 'button'
        button.className = 'mp-toggle'
        button.innerHTML = '<span class="mp-glyph"></span><span class="mp-tip" aria-hidden="true"></span>'
        button.addEventListener('click', () => MotionPause.set(!paused))
        document.body.append(button)
        syncButton()
    }

    // ---------------------------------------------------------------- manual play over a loop
    function clip(video, host = video.parentElement, toggle = null) {
        host.classList.add('mp-host')
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'mp-clip'
        const sync = () => {
            const playing = !video.paused && !video.ended
            host.classList.toggle('mp-playing', playing)
            btn.setAttribute('aria-label', playing ? CLIP_LABEL.pause : CLIP_LABEL.play)
            // the dim marks a clip someone stopped; one that simply has not started stays undimmed
            if (playing) host.classList.remove('mp-stopped')
        }
        btn.addEventListener('click', e => {
            // the host's own click handler would toggle a second time
            e.stopPropagation()
            if (!video.paused) host.classList.add('mp-stopped')
            if (toggle) return toggle()
            if (video.paused) {
                // one loop at a time when started by hand
                document.querySelectorAll('video').forEach(v => v !== video && !v.paused && v.pause())
                video.play()?.catch(() => {})
            } else video.pause()
        })
        for (const ev of ['play', 'playing', 'pause', 'ended']) video.addEventListener(ev, sync)
        sync()
        host.append(btn)
        return btn
    }

    // ---------------------------------------------------------------- self-running demos
    const CANCEL = Symbol('cancelled')
    function demo(el, { run, rest, controls = el }) {
        let visible = false
        let wakeVisible = null
        let token = 0
        let mode = 'idle' // 'auto' | 'manual' | 'idle'
        let kick = null

        new IntersectionObserver(entries => {
            visible = entries.some(e => e.isIntersecting)
            if (visible) wakeVisible?.(), (wakeVisible = null)
            if (visible && !paused && mode === 'idle') kick?.()
        }, { rootMargin: '100px 0px' }).observe(el)

        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'mp-demo'
        controls.classList.add('mp-demo-host')
        controls.append(btn)
        const syncBtn = () => {
            const playing = mode === 'manual'
            btn.innerHTML = playing ? GLYPH.pause : GLYPH.play
            btn.setAttribute('aria-label', playing ? CLIP_LABEL.pause : CLIP_LABEL.play)
            el.classList.toggle('mp-demo-running', mode !== 'idle')
        }

        const step = async (ms = 0, my) => {
            if (ms) await new Promise(r => setTimeout(r, ms))
            while (!visible && my === token) await new Promise(r => (wakeVisible = r))
            if (my !== token) throw CANCEL
        }
        const cancel = () => {
            token++
            wakeVisible?.()
            wakeVisible = null
        }
        const start = async m => {
            cancel()
            const my = token
            mode = m
            syncBtn()
            const s = ms => step(ms, my)
            try {
                do await run(s)
                while (m === 'auto' && my === token)
            } catch (e) {
                if (e !== CANCEL) console.error(e)
            }
            if (my !== token) return
            mode = 'idle'
            syncBtn()
            rest()
            // a run played by hand that ended after motion was resumed hands back to the loop
            if (!paused && visible) kick()
        }
        kick = () => start('auto')

        btn.addEventListener('click', () => {
            if (mode === 'manual') {
                cancel()
                mode = 'idle'
                syncBtn()
                rest()
            } else start('manual')
        })
        subscribe(p => {
            if (p) {
                if (mode === 'auto') {
                    cancel()
                    mode = 'idle'
                    syncBtn()
                }
                if (mode === 'idle') rest()
            } else if (mode !== 'manual') {
                mode = 'idle'
                if (visible) kick()
                else rest()
            }
            syncBtn()
        })
    }

    function subscribe(fn) {
        listeners.add(fn)
        fn(paused)
        return () => listeners.delete(fn)
    }

    const MotionPause = (window.MotionPause = {
        get paused() {
            return paused
        },
        get reduced() {
            return mq.matches
        },
        set(next) {
            write(!!next)
            apply(!!next)
        },
        subscribe,
        clip,
        demo,
    })

    resolve()
    mq.addEventListener('change', resolve)
    addEventListener('storage', e => e.key === KEY && resolve())
    if (document.body) mountButton()
    else document.addEventListener('DOMContentLoaded', mountButton)
})()
