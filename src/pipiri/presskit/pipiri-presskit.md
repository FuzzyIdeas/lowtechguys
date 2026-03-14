# Pipiri - Press Kit

## About

Pipiri is a Picture-in-Picture app for macOS. Press a hotkey and the focused window becomes a floating panel that stays on top across all Spaces. It works with any window, not just video players.

Useful for keeping an eye on terminals, logs, dashboards, AI agents, or video streams without switching windows.

## Key Facts

- **Developer:** The low-tech guys
- **Website:** [lowtechguys.com/pipiri](https://lowtechguys.com/pipiri)
- **Platform:** macOS 14.0+ (Sonoma and later)
- **Price:** 14-day free trial, then Free mode (PiP pauses after 30 min). License is a one-time €8 purchase for up to 5 Macs
- **Download:** [lowtechguys.com/pipiri](https://lowtechguys.com/pipiri)
- **Buy license:** [pipiri.subsol.one](https://pipiri.subsol.one)

## Features

- PiP any window with a single hotkey (fn + P by default)
- Region capture: drag to select a specific area of a window
- Quick region capture: double-click while holding fn to zoom into an area around the cursor
- Flexible zoom with scroll-to-pan when zoomed in
- Per-app frame rate (1 fps for terminals, 30-60 fps for video)
- Click-through mode with auto-hide when the cursor moves over the PiP
- Multi-window mode for capturing several windows at once
- Contrast and sharpness boost for small or low-contrast content
- Idle detection: visual indicator when captured content stops changing
- Configurable hotkeys
- Command-line control for scripting and automation
- Uses Apple's ScreenCaptureKit, same framework as macOS screen sharing

## Use cases

- Watching a long-running terminal command while working in another app
- Keeping logs visible while debugging
- Monitoring AI agent progress (Claude Code, Cursor, Copilot) while browsing
- Streaming video from apps that don't support native PiP (Twitter/X, Reddit, Twitch)
- Watching a dashboard or CI pipeline without switching windows
- Keeping a community chat (Discord, Twitch) visible while coding

## How it works

Pipiri uses Apple's ScreenCaptureKit to capture individual windows directly, without recording the entire screen. This keeps CPU and memory usage low, especially at lower frame rates.

## Included assets

- `pipiri-icon.png` -- App icon (1280x1280)
- `pipiri-screenshot.png` -- App screenshot
- `pipiri-ui.png` -- UI screenshot
- `pipiri-demo.mp4` -- Demo video

## Contact

For press inquiries, reach out at [lowtechguys.com/contact](https://lowtechguys.com/contact?app=Pipiri)
