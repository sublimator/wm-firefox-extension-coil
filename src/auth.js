import { gql, request } from "./utils.js";

async function login(email, password) {
  const query = gql`
    mutation Login($email: String!, $password: String!) {
      login(input: { email: $email, password: $password }) {
        token
      }
    }
  `;
  const data = await request(query, { email, password });
  return data.login.token;
}

async function refreshBtpToken(token) {
  const query = gql`
    query {
      refreshBtpToken {
        token
      }
    }
  `;
  const data = await request(query, {}, token);
  return data.refreshBtpToken.token;
}

export const tokens = {
  /** @type {String} */
  _token: null,
  /** @type {String} */
  _btpToken: null,

  async init(force = false) {
    if (!force && this._token && this._btpToken) {
      return;
    }

    const { email, password } = await browser.storage.local.get([
      "email",
      "password",
    ]);
    if (!email || !password) {
      throw new Error("Credentials not found.");
    }

    this._token = await login(email, password);
    this._btpToken = await refreshBtpToken(this._token);
  },

  get token() {
    return this._token;
  },
  get btpToken() {
    return this._btpToken;
  },
};
