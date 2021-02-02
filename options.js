const $ = sel => document.querySelector(sel);

$("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const email = $("#email").value;
  const password = $("#password").value;
  if (!email || !password) return;

  const button = $("form button");
  button.disabled = true;
  await browser.storage.local.set({ email, password });
  await new Promise(res => setTimeout(res, 1000));
  button.disabled = false;
});

browser.storage.local
  .get(["email", "password"])
  .then(({ email, password }) => {
    if (email) $("#email").value = email;
    if (password) $("#password").value = password;
  })
  .catch(console.error);
