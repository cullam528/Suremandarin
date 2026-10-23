# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

## Local-account security gateway

The global `auth-gateway` middleware runs after error handling and before body
parsing. POST requests to the REST API's `/auth/local`, `/auth/local/register`,
`/auth/forgot-password`, `/auth/reset-password`, and
`/auth/send-email-confirmation` endpoints require the server-only
`x-auth-gateway-secret` header. The local-provider callback alias is protected
too. Native Strapi request limits remain enabled. Admin sign-in, real social
provider callbacks, email confirmation, and authenticated account operations
retain their existing behavior.

After gateway authentication, a valid `x-auth-client-ip` assertion from the
frontend sets the request IP used by Strapi's existing limiter. The frontend
derives this value from its trusted ingress, so different members do not share
the Vercel egress address's quota. Forged public headers cannot set it. Missing
or malformed assertions retain the proxy-IP bucket as a conservative fallback.
Do not log this header; it contains a client IP (IPv6 is grouped by subnet).

Set `AUTH_GATEWAY_SECRET` identically on Strapi and the Next.js server. Generate
an independent 32-byte random value, encoded as exactly 64 hexadecimal
characters, using a password manager or a cryptographic random generator. Do
not copy a JWT secret, use a sample value, add `NEXT_PUBLIC_`, put the secret in
Git/client applications, or include the header in request logs. Validation can
check the format, not the randomness of an operator-chosen value.

Missing or malformed configuration prevents production Strapi startup. In other
environments, protected operations return 503 until configured. Missing or
invalid gateway headers return 403 before account handlers execute. There is no
development bypass. The configured REST prefix is respected.

Roll out the backend and frontend together in an approved maintenance window:

1. Prepare a fresh shared gateway credential and the frontend's CAPTCHA/shared
   rate-limit configuration in the deployment secret stores. Verify presence
   and scope without printing or retrieving secret values.
2. Validate both builds and normal account operations in an isolated staging
   environment. Update all legitimate account clients to call the protected
   Next.js `/api/auth/*` routes; mobile/third-party clients must never receive
   the gateway credential.
3. Release the frontend that applies its security checks and attaches the
   header, then release this backend guard. Coordinate these steps closely:
   the guard is not effective against direct Strapi calls until the backend is
   active, while activating it before compatible frontend code will interrupt
   account operations. Use staging credentials and controlled synthetic
   accounts for verification; do not issue live password-reset emails.
4. Verify a direct native account request is denied, website account flows work,
   and the CAPTCHA and shared limit services fail closed when unavailable. Roll
   back coordinated versions if needed; do not disable the guard as a quick fix.

The shared header establishes trust in the frontend, not end-user identity.
Only send it over HTTPS to the intended Strapi origin. A leaked credential or
compromised frontend server defeats that boundary and requires rotation on both
servers. GraphQL is not installed here; adding GraphQL, another REST prefix,
account plugin, or alternate account controller requires a fresh bypass review.
Social login and authenticated account operations retain separate existing
controls and are outside the CAPTCHA changes.

Run `npm run test:auth-gateway` for isolated middleware and real Koa-router tests.
They use synthetic configuration, loopback requests, and no database, mail
service, or production deployment.

After `npm run build`, run `npm run test:auth-staging` for real Strapi HTTP,
database, session and email-template checks with disposable SQLite. This needs
a working `better-sqlite3` native binding. The harness supplies a clean synthetic
environment, ignores repository `.env` files, blocks outbound connections and
captures mail locally; it does not prove real email delivery. See the
[Preview configuration and verification report](../docs/preview-validation-2026-10-23.md)
for hosted staging requirements and actual results.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
