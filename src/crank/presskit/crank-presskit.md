# Crank - Press Kit

## About

Crank is an event-based automation app for macOS. Set scripts, apps, and Shortcuts to run automatically, triggered by system events. The concept is simple: add a trigger, set an action, and it just happens. No complex workflows, no manual required.

## Key Facts

- **Developer:** The low-tech guys
- **Website:** [lowtechguys.com/crank](https://lowtechguys.com/crank)
- **Platform:** macOS 14.0+ (Sonoma and later)
- **Price:** Free for up to 3 rules (no time limit), 14-day free trial for Pro
- **Download:** [lowtechguys.com/crank](https://lowtechguys.com/crank)
- **Buy license:** [crank.subsol.one](https://crank.subsol.one)

## Features

- 30+ system event triggers (Bluetooth, Wi-Fi, USB, Power, Displays, Calendar, and more)
- Actions: Shell Scripts, AppleScript, Shortcuts, Notifications, Launch App, Open URL, Open File
- Write actions in plain English using Gemini or ChatGPT
- Time window scheduling and rate limiting
- Event log and action history for debugging
- Text fields can reference event data like device name, file path, battery level
- Rule sharing via unique URLs
- Everything runs locally, no data sent to servers unless you opt into AI features

## Triggers

Crank listens for system events across the following categories:

- **Bluetooth** -- device connected, device disconnected, Bluetooth on/off
- **Wi-Fi** -- network joined, network left, Wi-Fi on/off
- **USB** -- device connected, device disconnected
- **Power** -- battery level, charging, screen lock/unlock, sleep/wake
- **Displays** -- monitor connected, monitor disconnected, display count changed
- **Application** -- app launched, quit, focused, defocused, not responding
- **App Windows** -- window opened, closed, focused, or defocused (with title, bounds, app info)
- **Time** -- a specific time of day reached
- **Calendar** -- event upcoming, event started
- **File Watcher** -- file created, changed, or deleted in a watched directory
- **Download** -- any file downloaded, or a file matching a name pattern
- **Screenshot** -- screenshot taken
- **Clipboard** -- item added to clipboard, specific content type detected
- **Process** -- any process launched or quit, filtered by name
- **Notifications** -- notification received from any app (macOS 15+)
- **Messages** -- iMessage/SMS received or sent
- **Mail** -- email received in Apple Mail
- **Privacy** -- camera, microphone, screen recording, or location in use
- **LAN** -- ethernet cable connected or disconnected
- **Focus Mode** -- a Focus mode turned on or off
- **Lid** (MacBook only) -- lid opened or closed
- **Ambient Light** (MacBook only) -- light level crossed a threshold
- **Lid Angle** (MacBook only) -- lid angle crossed a threshold
- **Resource Usage** -- CPU, GPU, RAM, thermal state, swap, or disk usage crossed a threshold
- **Spotlight** -- files being tagged in Finder, files matching a type, or files larger than a specific size
- **Audio** -- output/input device changed or connected
- **Visual Change** -- content change or idle detected in a Pipiri PiP window
- **User Activity** -- user has been idle for a certain time, or active for too long
- **Webhook** -- receive messages from ntfy.sh topics via persistent streaming connection
- **Volume** -- external drive or disk image mounted/unmounted
- **Periodic** -- fire on a cron schedule (standard 5-field expressions)
- **Boot** -- run once after system boot (within the first 5 minutes)
- **Script** -- a custom script that can trigger on zero exit code

## Actions

Each rule runs one action when it fires:

- **Shell Script** -- run any zsh script, with event details available as environment variables
- **AppleScript** -- execute an AppleScript snippet
- **Shortcuts** -- run a macOS Shortcut by name
- **Notification** -- post a system notification with a custom title and body
- **Launch App** -- open an application
- **Open URL** -- open a URL in the default browser or a specific app
- **Open File** -- open a file, optionally with a specific app

## Use Cases

- Turn off notifications when a call starts
- Clear quarantine flag on a downloaded file
- Connect to a VPN when joining a specific Wi-Fi network
- Reposition windows when connecting a monitor
- Enable HDR when watching a movie, disable it when getting back to work
- Move downloaded invoice PDFs to an accounting folder
- Switch audio output when connecting Bluetooth headphones
- Disconnect Bluetooth devices before closing the MacBook lid
- Turn off True Tone and Night Shift when editing photos or videos

## Included Assets

- `crank-icon.png` -- App icon (1280x1280)
- `crank-icon-shadow.png` -- App icon with shadow
- `crank-screenshot.png` -- App screenshot
- `crank-ui.png` -- UI screenshot
- `crank-demo.mp4` -- Demo video
- `crank-focus-reading.mp4` -- Video showing a Focus Mode rule: when Reading Focus is enabled, open Books and play piano on Spotify

## Contact

For press inquiries, reach out at [lowtechguys.com/contact](https://lowtechguys.com/contact?app=Crank)
