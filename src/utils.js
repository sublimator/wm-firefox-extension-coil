const GRAPHQL_API = "https://coil.com/graphql";

// "gql" just to get syntax highlighting in editors
export const gql = String.raw;

export async function request(query, variables, token = null) {
  const res = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data } = await res.json();
  return data;
}

// Use a fixed date in the distant future (2100-01-01T00:00:00.000Z) as the
// expiry of all outgoing packets. This ensures that payment will work even
// if the OS's clock is skewed. It will be replaced with a more reasonable
// expiry by the connector.
const FAR_FUTURE_EXPIRY = new Date(4102444800000);
export function getFarFutureExpiry(_destination) {
  return FAR_FUTURE_EXPIRY;
}

/** @type {(ms: number) => Promise<void>} */
export const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
export const onlyOnce = block => {
  let ran = false;
  return () => {
    if (!ran) {
      ran = true;
      block();
    }
  };
};
