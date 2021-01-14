const state = {};

// Start monetization for a payment pointer and send one complete notification a
// bit later.
browser.monetization.onStart.addListener((sessionId, spspResponse) => {
  state[sessionId] = 'start';
  console.group('onStart');
  console.log({ sessionId });
  console.log(spspResponse);
  console.groupEnd();
  setTimeout(() => {
    browser.monetization.completePayment(sessionId, {
      value: '60',
      assetScale: 2,
      assetCode: 'USD',
    });
  }, 500 + 2000 * Math.random());
});

// On the first "start" call, schedule a session refresh after some time.
browser.monetization.onStart.addListener(function listener(sessionId) {
  console.log(`⏲ Refresh scheduled: ${sessionId}`);
  setTimeout(async () => {
    console.log(`⏰ Refresh: ${sessionId}`);
    const newSessionId = await browser.monetization.refresh(sessionId);
    console.log({ newSessionId });
  }, 3000 + Math.random() * 3000);
  browser.monetization.onStart.removeListener(listener);
});

browser.monetization.onStop.addListener(sessionId => {
  state[sessionId] = 'stop';
  console.group('onStop');
  console.log({ sessionId });
  console.groupEnd();
});

browser.monetization.onPause.addListener(sessionId => {
  state[sessionId] = 'pause';
  console.group('onPause');
  console.log({ sessionId });
  console.groupEnd();
});

browser.monetization.onResume.addListener(sessionId => {
  state[sessionId] = 'resume';
  console.group('onResume');
  console.log({ sessionId });
  console.groupEnd();
});
