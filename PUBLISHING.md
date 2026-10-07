# Publish HealthStats MVP

Prepared for the existing Convex production deployment `zealous-kiwi-423`.
Expected public address after publishing: https://zealous-kiwi-423.convex.site
Production backend: https://zealous-kiwi-423.convex.cloud

## Before publishing

Convex currently reports the account is above Free plan limits. Review usage in https://dashboard.convex.dev/t/swet-sahay before sharing the app. No plan changes were made.

Production is separate from development: the existing reports on localhost will not be copied to the public app. Reports remain tied to each browser; sign-in does not yet migrate them to an account. Keep original reports. This remains an MVP limitation.

## Publish command

From `/Users/swetrana/build-sprint-app`, run:

```sh
npm run deploy
```

The command runs tests, backend type checks and the production dependency audit. It then configures production sign-in keys only if none exist, preserving existing keys, and sets the production site address. Convex Static Hosting builds against the production backend, deploys backend code, and uploads the built website.

Existing report upload/open and auth URLs retain their paths. No second host is used.

## Verification completed

- 35 automated tests pass.
- Backend type check and development push pass.
- Production Convex dry run passes; no indexes are deleted.
- Dependency audit reports zero vulnerabilities after updating @auth/core.
- Upload-storage integration passes against development.
- Full browser upload → select → prepare summary → original report flow passed with fictional photos.
- Production frontend build uses the production backend; Home and branding checked in browser.
- Build preview badge is absent in production.

No public website deployment has been performed. Production sign-in and the public upload/summary flow must be checked after deployment, using fictional reports. The local production-build preview does not prove that the production backend is live.

## After publishing

Open the public address, upload two fictional reports, select both, prepare the summary, verify dates and values, and open each source. Check sign-up/sign-in/sign-out and Home replays. Share the public link after those checks pass.

Future updates use the same command. Git push alone does not deploy.
