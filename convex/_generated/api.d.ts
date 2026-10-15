/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as evaluations from "../evaluations.js";
import type * as fileRules from "../fileRules.js";
import type * as http from "../http.js";
import type * as originRules from "../originRules.js";
import type * as profiles from "../profiles.js";
import type * as reportDetails from "../reportDetails.js";
import type * as reports from "../reports.js";
import type * as testMappingRules from "../testMappingRules.js";
import type * as testMatching from "../testMatching.js";
import type * as vision from "../vision.js";
import type * as visionJobs from "../visionJobs.js";
import type * as visionRules from "../visionRules.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  evaluations: typeof evaluations;
  fileRules: typeof fileRules;
  http: typeof http;
  originRules: typeof originRules;
  profiles: typeof profiles;
  reportDetails: typeof reportDetails;
  reports: typeof reports;
  testMappingRules: typeof testMappingRules;
  testMatching: typeof testMatching;
  vision: typeof vision;
  visionJobs: typeof visionJobs;
  visionRules: typeof visionRules;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
