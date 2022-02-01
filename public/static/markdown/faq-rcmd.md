## What do I do if I have two apps with the same first letter (e.g. Music and Mail)?

Best way to handle this is to assign a custom key for the second app.

For example, if **rcmd** focuses *Mail* on `⌘` + `M` and you want to assign `⌘` + `U` for *Music*:

* Focus the *Music* app
* Press `⌘` + `⌥` + `U`

And that's it, from now on you can use `⌘` + `U` to focuse the *Music* app.

----

## What does Cycle do?

If you have multiple apps with the same first letter, pressing that letter multiple times will cycle between those apps.

For example, if you have *Safari*, *Spotify* and *Shortcuts* running:

* Pressing `⌘` + `S` will focus *Safari*
* Pressing `⌘` + `S` *again* will cycle and focus *Spotify*
* Pressing `⌘` + `S` *yet again* will cycle and focus *Shortcuts*

----

## Can I cycle between windows of the same app?

Unfortunately there's no macOS API that allows us to focus specific windows of an app.

The Accessibility API would allow this in some manner but it is not allowed on the App Store.

There is a macOS native way to switch between windows of the same app:

[![keyboard shortcut switch to windows of same app](/static/img/keyboard-shortcut-focus-window.png)](/static/img/keyboard-shortcut-focus-window.png)

----

## `Left Command` triggering rcmd?
## `Right Command`+`letter` not doing anything?

It's possible that your keyboard is sending the wrong key codes.

### Checking keycodes

You can check what keycodes get sent by downloading this simple app: [KeyCodes.zip](https://files.alinpanaitiu.com/KeyCodes.zip)

After launching it, check the **Log key up events and modifier changes** checkbox.

Now if you press your `Right Command` key and click on the Info button you should see:

* **Modifiers: 104884`8` / 0x1001`10`**
* **NX_DEVICE`RCMD`KEYMASK = `16` / 0x`10`**

For the `Left Command` key you should see:

* **Modifiers: 104884`0` / 0x1001`08`**
* **NX_DEVICE`LCMD`KEYMASK = `8` / 0x`8`**

[![keycodes app left and right command info](/static/img/keycodes-rcmd.png)](/static/img/keycodes-rcmd.png)

If you don't see those key codes exactly, then it's a problem with your keyboard mapping.

### Possible causes:

* Specific models of external keyboards
* Changing the **Modifier Keys** settings in **System Preferences**

[![modifier keys setting in macOS](/static/img/modifier-mapping.png)](/static/img/modifier-mapping.png)


#### Workaround

Keep in mind that you can always change the trigger key to something else than `Right Command` if that key is not working on your keyboard.

[![rcmd trigger setting](/static/img/rcmd-trigger-setting.png)](/static/img/rcmd-trigger-setting.png)
