## Monitors turned black?

Don't worry, Gamma Dimmer can't make permanent changes to your displays. Usually this can be fixed easily by *reconnecting the monitors* or *restarting the computer*.

The 2 most common causes for this issue are **[Color Profiles](#1-color-profiles)** and **[other Gamma-altering apps](#2-other-apps-that-change-gamma)**.

----

### 1. Color Profiles

Because of a macOS bug in the **Gamma API**, your screen can go black and stay that way until you disconnect and reconnect the monitor.

There's no complete fix for this as it is a macOS bug, but you can lower the chances of it appearing using the following steps:

* Use a **default color profile** in *System Preferences* -> *Displays*
* Switch to **Overlay mode** to disable Gamma changes


#### Technical explanation

>This usually happens when custom color profiles are used, but it was reported on some default monitor profiles as well.

>The bug is usually triggered when the app tries to reset the gamma tables to their default values by calling the `CGDisplayRestoreColorSyncSettings()` system method.

>This should be a completely normal use case, and the call should simply do nothing if the gamma tables are already at their default values.
But for unknown reasons, this API call will sometimes set all RGB Gamma tables to `0` and all colors will show up as black.

----

### 2. Other apps that change Gamma

* [f.lux](https://justgetflux.com/)
* [Lunar](https://lunar.fyi)
* [Gamma Control](https://michelf.ca/projects/gamma-control/)
* etc.

If both Gamma Dimmer and one of these apps are used at the same time, the Gamma tables might be set to invalid values as the apps
will try to override each other's changes.

If you want to keep using those apps, the best choice is to switch Gamma Dimmer to **Overlay mode**.

----

## Dimming not working?

Some types of monitors don't have support for Gamma dimming *(DisplayLink, Luna Display, Sidecar etc.)*.

To force using a *Dark Overlay* instead of *Gamma*, enable the **Use dark overlay instead of Gamma dimming** setting and restart the app.

[![switch overlay button](https://files.lowtechguys.com/gammadimmer-switch-overlay.png)](https://files.lowtechguys.com/gammadimmer-switch-overlay.png)

There are cases where not even the dark overlay works *(some mirroring setups, virtual displays etc.)*.

Sometimes, **restarting the computer** or **disabling mirroring** can also fix the issue, but in case nothing works, please [contact us here](/contact?app=GammaDimmer).

----

## Can *Gamma Dimmer* control the real brightness of the monitor?

No.

To change the real brightness of the monitor, a macOS app needs to use [Display Data Channel (DDC)](https://en.wikipedia.org/wiki/Display_Data_Channel) which is not allowed on the App Store.

For that functionality, you'll need to use [Lunar Pro](https://lunar.fyi/) which does support DDC and can only be downloaded outside the App Store.

Check the [comparison table below](#comparison) to see what features *Gamma Dimmer* has compared to the **[Lunar](https://lunar.fyi)**.

----

## Can I get a refund?

Sure! The App Store provides refunds in the first *14 days* after a purchase.

To get one, click on *"Report a Problem"* on the app page in the App Store and select *"Request a refund"*.
