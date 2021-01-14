Boilterplate for a WebMonetization extension to work with a native prototype WebMonetization implementation of Firefox at https://github.com/sidvishnoi/gecko-webmonetization/.

## How to use?

1. Download the zip and extract.
2. Download a Firefox release from https://github.com/sidvishnoi/gecko-webmonetization/releases/tag/2021-01-13.
3. Load extension:
   1. Visit `about:debugging#/runtime/this-firefox`
   2. Click "Load Temporary Add-on…" and select any file from the extension folder when prompted.
4. Visit [Sample WebMonetization Website](https://mystifying-roentgen-ff4022.netlify.app/) and open devtools console.

---

<details>
<summary>Sample WebMonetization Website Source Code</summary>

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>WM Website</title>
    <link rel="monetization" href="https://ilp.uphold.com/24HhrUGG7ekn" />
    <link rel="monetization" href="https://example.com/payment-pointer" />
  </head>
  <body>
    <h1>WebMonetization Author Website</h1>
    <p>Change the payment pointers using JS or Devtools console.</p>
    <script>
      console.log(navigator.monetization);

      navigator.monetization.addEventListener('progress', ev => {
        console.log(ev);
        console.log(ev instanceof MonetizationProgressEvent);
        console.log({ type: ev.type });
        const { sessionId, amount, assetScale, assetCode, receipt } = ev;
        console.log(sessionId, { amount, assetScale, assetCode }, receipt);
        console.log(ev.target);
        console.log({ isTrusted: ev.isTrusted });
      });
    </script>
  </body>
</html>
```

</details>
