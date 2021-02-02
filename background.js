import monetization from "./src/main.js";

browser.monetization.onStart.addListener((sessionId, spspResponse) => {
  console.group("onStart");
  console.log({ sessionId });
  console.log(spspResponse);
  monetization.start(sessionId, spspResponse, (amount, receipt) => {
    browser.monetization.completePayment(sessionId, amount, receipt);
  });
  console.groupEnd();
});

browser.monetization.onStop.addListener(sessionId => {
  console.group("onStop");
  console.log({ sessionId });
  monetization.stop(sessionId);
  console.groupEnd();
});

browser.monetization.onPause.addListener(sessionId => {
  console.group("onPause");
  console.log({ sessionId });
  monetization.pause(sessionId);
  console.groupEnd();
});

browser.monetization.onResume.addListener(sessionId => {
  console.group("onResume");
  console.log({ sessionId });
  monetization.resume(sessionId);
  console.groupEnd();
});
