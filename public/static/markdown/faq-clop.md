## How can I see app logs?

You can do that either through **Console.app** or through the `log` Terminal command.

### Terminal

**Streaming** logs for viewing:

```sh
log stream --level debug --source --style compact --predicate 'subsystem BEGINSWITH "com.lowtechguys.Clop"'
```

Streaming and **collecting** logs to a file:

```sh
log stream --level debug --style compact --predicate 'subsystem BEGINSWITH "com.lowtechguys.Clop"' | tee ~/Desktop/clop.txt
```

---

### Console.app

1. Write `com.lowtechguys.Clop` in the search bar and press `Enter`
2. Click on `Any` and choose `Subsystem`
2. Make sure `Info` and `Debug` messages are enabled in the `Action` menu
3. Start streaming logs

<div class="flex flex-center my-8">
    <img src="https://files.lowtechguys.com/console-subsystem-clop.png" alt="filtering console logs by subsystem" class="mr-1" />
    <img src="https://files.lunar.fyi/console-info-debug.webp" alt="showing console info debug messages" class="ml-1" />
</div>

---

#### Saving Console logs

In the Console window, select 1 log line, then press `Cmd-A` and `Cmd-C` to copy all log lines to clipboard.

After that you can press `Cmd-V` to paste it in a [Discord chat](https://discord.gg/99vACD8D5u), the [Contact form](/contact) or in an editor like TextEdit to save it to a file.

---

## License doesn't stay activated

First thing to try is to delete the license files, restart the app and retry activating.

To delete the files, press `Cmd-Shift-G` in Finder, paste this path and press Enter: `~/Library/Application Support/Clop/`

Then delete all files inside that folder and restart the app.

Another way is using the Terminal:

```sh
rm "$HOME/Library/Application Support/Clop/"*
killall Clop
open -a Clop
```

#### Make sure Paddle can be reached

*Paddle is the licensing provider that Clop is using.*

If the issue persists, try checking if Paddle's servers are reachable by your Mac. Ensure the following domains are not blocked in your network:

- `paddle.com`
- `paddleapi.com`
- `v3.paddleapi.com`

*For example, loading [v3.paddleapi.com/3.2/license/verify](https://v3.paddleapi.com/3.2/license/verify) in a browser (or with `curl`) should show a response like the following:*

```json
{
    "success": false,
    "error": {
        "code": 102,
        "message": "Unable to authenticate"
    }
}
```

*If it shows a browser error or if it keeps loading continuously, then the domain is blocked and that's preventing activation and license checking.*

Another thing to check is that you didn't block Clop's access to the internet with something like Little Snitch or LuLu.


