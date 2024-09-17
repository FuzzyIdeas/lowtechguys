## How can I hide the dot completely on `macOS 14.4` and newer?

Since macOS Sonoma `14.4`, Apple provided a way to hide the recording indicator on *external displays* **without using an app**:

[Hide privacy indicators on external displays in macOS](https://support.apple.com/en-us/118449)

---

## How can I hide the dot completely on `macOS 12.2` until `macOS 14.4`?

YellowDot only colors the dot black or white, which might not be ideal for some situations.

Removing the dot in 12.2 and later requires altering system files, which YellowDot doesn't do.

[Tyshawn Cormier](https://github.com/cormiertyshawn895) came up with a very clever solution for this in his [RecordingIndicatorUtility](https://github.com/cormiertyshawn895/RecordingIndicatorUtility) app. Check it out if you still want to hide the dot!

----

## How do I quit YellowDot?

* Click on the menubar icon *(or launch YellowDot again if the icon is hidden)*
* Click on the **Quit** button

----

## Why would I want to hide the yellow dot?

The idea came from this HackerNews thread: [Apple added an orange dot that’s a showstopper for live visuals](https://news.ycombinator.com/item?id=29627382)

When projecting live visuals, you might want to make the screen background black to give the impression of floating effects. The yellow dot in the corner breaks that illusion.

The user **[Sydney San Martin](https://s4y.us/)** posted a command-line implementation in that thread called [undot](https://github.com/s4y/undot) and I decided to make an easy to use app for it.
