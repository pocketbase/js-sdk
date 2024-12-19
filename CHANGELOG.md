## 0.24.0

- Added support for assigning `FormData` as body to individual batch requests ([pocketbase#6145](https://github.com/pocketbase/pocketbase/discussions/6145)).


## 0.23.0

- Added optional `pb.realtime.onDisconnect` hook function.
  _Note that the realtime client autoreconnect on its own and this hook is useful only for the cases where you want to apply a special behavior on server error or after closing the realtime connection._


## 0.22.1

- Fixed old `pb.authStore.isAdmin`/`pb.authStore.isAuthRecord` and marked them as deprecated in favour of `pb.authStore.isSuperuser` ([#323](https://github.com/pocketbase/js-sdk/issues/323)).
    _Note that with PocketBase v0.23.0 superusers are converted to a system auth collection so you can always simply check the value of `pb.authStore.record?.collectionName`._


## 0.22.0

**⚠️ This release introduces some breaking changes and works only with PocketBase v0.23.0+.**

- Added support for sending batch/transactional create/updated/delete/**upsert** requests with the new batch Web APIs.
    ```js
    const batch = pb.createBatch();

    batch.collection("example1").create({ ... });
    batch.collection("example2").update("RECORD_ID", { ... });
    batch.collection("example3").delete("RECORD_ID");
    batch.collection("example4").upsert({ ... });

    const result = await batch.send();
    ```

- Added support for authenticating with OTP (email code):
    ```js
    const result = await pb.collection("users").requestOTP("test@example.com");

    // ... show a modal for users to check their email and to enter the received code ...

    await pb.collection("users").authWithOTP(result.otpId, "EMAIL_CODE");
    ```

    Note that PocketBase v0.23.0 comes also with Multi-factor authentication (MFA) support.
    When enabled from the dashboard, the first auth attempt will result in 401 response and a `mfaId` response,
    that will have to be submitted with the second auth request. For example:
    ```js
    try {
      await pb.collection("users").authWithPassword("test@example.com", "1234567890");
    } catch (err) {
      const mfaId = err.response?.mfaId;
      if (!mfaId) {
        throw err; // not mfa -> rethrow
      }

      // the user needs to authenticate again with another auth method, for example OTP
      const result = await pb.collection("users").requestOTP("test@example.com");
      // ... show a modal for users to check their email and to enter the received code ...
      await pb.collection("users").authWithOTP(result.otpId, "EMAIL_CODE", { "mfaId": mfaId });
    }
    ```

- Added new `pb.collection("users").impersonate("RECORD_ID")` method for superusers.
    It authenticates with the specified record id and returns a new client with the impersonated auth state loaded in a memory store.
    ```js
    // authenticate as superusers (with v0.23.0 admins is converted to a special system auth collection "_superusers"):
    await pb.collection("_superusers").authWithPassword("test@example.com", "1234567890");

    // impersonate
    const impersonateClient = pb.collection("users").impersonate("USER_RECORD_ID", 3600 /* optional token duration in seconds */)

    // log the impersonate token and user data
    console.log(impersonateClient.authStore.token);
    console.log(impersonateClient.authStore.record);

    // send requests as the impersonated user
    impersonateClient.collection("example").getFullList();
    ```

- Added new `pb.collections.getScaffolds()` method to retrieve a type indexed map with the collection models (base, auth, view) loaded with their defaults.

- Added new `pb.collections.truncate(idOrName)` to delete all records associated with the specified collection.

- Added the submitted fetch options as 3rd last argument in the `pb.afterSend` hook.

- Instead of replacing the entire `pb.authStore.record`, on auth record update we now only replace the available returned response record data ([pocketbase#5638](https://github.com/pocketbase/pocketbase/issues/5638)).

- ⚠️ Admins are converted to `_superusers` auth collection and there is no longer `AdminService` and `AdminModel` types.
    `pb.admins` is soft-deprecated and aliased to `pb.collection("_superusers")`.
    ```js
    // before   ->  after
    pb.admins.* ->  pb.collection("_superusers").*
    ```

- ⚠️ `pb.authStore.model` is soft-deprecated and superseded by `pb.authStore.record`.

- ⚠️ Soft-deprecated the OAuth2 success auth `meta.avatarUrl` response field in favour of `meta.avatarURL` for consistency with the Go conventions.

- ⚠️ Changed `AuthMethodsList` inerface fields to accomodate the new auth methods and `listAuthMethods()` response.
    ```
    {
      "mfa": {
        "duration": 100,
        "enabled": true
      },
      "otp": {
        "duration": 0,
        "enabled": false
      },
      "password": {
        "enabled": true,
        "identityFields": ["email", "username"]
      },
      "oauth2": {
        "enabled": true,
        "providers": [{"name": "gitlab", ...}, {"name": "google", ...}]
      }
    }
    ```

- ⚠️ Require specifying collection id or name when sending test email because the email templates can be changed per collection.
    ```js
    // old
    pb.settings.testEmail(email, "verification")

    // new
    pb.settings.testEmail("users", email, "verification")
    ```

- ⚠️ Soft-deprecated and aliased `*Url()` -> `*URL()` methods for consistency with other similar native JS APIs and the accepted Go conventions.
    _The old methods still works but you may get a console warning to replace them because they will be removed in the future._
    ```js
    pb.baseUrl                  -> pb.baseURL
    pb.buildUrl()               -> pb.buildURL()
    pb.files.getUrl()           -> pb.files.getURL()
    pb.backups.getDownloadUrl() -> pb.backups.getDownloadURL()
    ```

- ⚠️ Renamed `CollectionModel.schema` to `CollectionModel.fields`.

- ⚠️ Renamed type `SchemaField` to `CollectionField`.


## 0.21.5

- Shallow copy the realtime subscribe `options` argument for consistency with the other methods ([#308](https://github.com/pocketbase/js-sdk/issues/308)).


## 0.21.4

- Fixed the `requestKey` handling in `authWithOAuth2({...})` to allow manually cancelling the entire OAuth2 pending request flow using `pb.cancelRequest(requestKey)`.
  _Due to the [`window.close` caveats](https://developer.mozilla.org/en-US/docs/Web/API/Window/close) note that the OAuth2 popup window may still remain open depending on which stage of the OAuth2 flow the cancellation has been invoked._


## 0.21.3

- Enforce temporary the `atob` polyfill for ReactNative until [Expo 51+ and React Native v0.74+ `atob` fix get released](https://github.com/reactwg/react-native-releases/issues/287).


## 0.21.2

- Exported `HealthService` types ([#289](https://github.com/pocketbase/js-sdk/issues/289)).


## 0.21.1

- Manually update the verified state of the current matching `AuthStore` model on successful "confirm-verification" call.

- Manually clear the current matching `AuthStore` on "confirm-email-change" call because previous tokens are always invalidated.

- Updated the `fetch` mock tests to check also the sent body params.

- Formatted the source and tests with prettier.


## 0.21.0

**⚠️ This release works only with PocketBase v0.21.0+ due to changes of how the `multipart/form-data` body is handled.**

- Properly sent json body with `multipart/form-data` requests.
  _This should fix the edge cases mentioned in the v0.20.3 release._

- Gracefully handle OAuth2 redirect error with the `authWithOAuth2()` call.


## 0.20.3

- Partial and temporary workaround for the auto `application/json` -> `multipart/form-data` request serialization of a `json` field when a `Blob`/`File` is found in the request body ([#274](https://github.com/pocketbase/js-sdk/issues/274)).

    The "fix" is partial because there are still 2 edge cases that are not handled - when a `json` field value is empty array (eg. `[]`) or array of strings (eg. `["a","b"]`).
    The reason for this is because the SDK doesn't have information about the field types and doesn't know which field is a `json` or an arrayable `select`, `file` or `relation`, so it can't serialize it properly on its own as `FormData` string value.

    If you are having troubles with persisting `json` values as part of a `multipart/form-data` request the easiest fix for now is to manually stringify the `json` field value:
    ```js
    await pb.collection("example").create({
      // having a Blob/File as object value will convert the request to multipart/form-data
      "someFileField": new Blob([123]),
      "someJsonField": JSON.stringify(["a","b","c"]),
    })
    ```

    A proper fix for this will be implemented with PocketBase v0.21.0 where we'll have support for a special `@jsonPayload` multipart body key, which will allow us to submit mixed `multipart/form-data` content (_kindof similar to the `multipart/mixed` MIME_).


## 0.20.2

- Throw 404 error for `getOne("")` when invoked with empty id ([#271](https://github.com/pocketbase/js-sdk/issues/271)).

- Added `@throw {ClientResponseError}` jsdoc annotation to the regular request methods ([#262](https://github.com/pocketbase/js-sdk/issues/262)).


## 0.20.1

- Propagate the `PB_CONNECT` event to allow listening to the realtime connect/reconnect events.
    ```js
    pb.realtime.subscribe("PB_CONNECT", (e) => {
      console.log(e.clientId);
    })
    ```

## 0.20.0

- Added `expand`, `filter`, `fields`, custom query and headers parameters support for the realtime subscriptions.
    ```js
    pb.collection("example").subscribe("*", (e) => {
      ...
    }, { filter: "someField > 10" });
    ```
    _This works only with PocketBase v0.20.0+._

- Changes to the logs service methods in relation to the logs generalization in PocketBase v0.20.0+:
    ```js
    pb.logs.getRequestsList(...)  -> pb.logs.getList(...)
    pb.logs.getRequest(...)       -> pb.logs.getOne(...)
    pb.logs.getRequestsStats(...) -> pb.logs.getStats(...)
    ```

- Added missing `SchemaField.presentable` field.

- Added new `AuthProviderInfo.displayName` string field.

- Added new `AuthMethodsList.onlyVerified` bool field.


## 0.19.0

- Added `pb.filter(rawExpr, params?)` helper to construct a filter string with placeholder parameters populated from an object.

    ```js
    const record = await pb.collection("example").getList(1, 20, {
      // the same as: "title ~ 'te\\'st' && (totalA = 123 || totalB = 123)"
      filter: pb.filter("title ~ {:title} && (totalA = {:num} || totalB = {:num})", { title: "te'st", num: 123 })
    })
    ```

    The supported placeholder parameter values are:

    - `string` (_single quotes will be autoescaped_)
    - `number`
    - `boolean`
    - `Date` object (_will be stringified into the format expected by PocketBase_)
    - `null`
    - anything else is converted to a string using `JSON.stringify()`


## 0.18.3

- Added optional generic support for the `RecordService` ([#251](https://github.com/pocketbase/js-sdk/issues/251)).
    This should allow specifying a single TypeScript definition for the client, eg. using type assertion:
    ```ts
    interface Task {
      id:   string;
      name: string;
    }

    interface Post {
      id:     string;
      title:  string;
      active: boolean;
    }

    interface TypedPocketBase extends PocketBase {
      collection(idOrName: string): RecordService // default fallback for any other collection
      collection(idOrName: 'tasks'): RecordService<Task>
      collection(idOrName: 'posts'): RecordService<Post>
    }

    ...

    const pb = new PocketBase("http://127.0.0.1:8090") as TypedPocketBase;

    // the same as pb.collection('tasks').getOne<Task>("RECORD_ID")
    await pb.collection('tasks').getOne("RECORD_ID") // -> results in Task

    // the same as pb.collection('posts').getOne<Post>("RECORD_ID")
    await pb.collection('posts').getOne("RECORD_ID") // -> results in Post
    ```


## 0.18.2

- Added support for assigning a `Promise` as `AsyncAuthStore` initial value ([#249](https://github.com/pocketbase/js-sdk/issues/249)).


## 0.18.1

- Fixed realtime subscriptions auto cancellation to use the proper `requestKey` param.


## 0.18.0

- Added `pb.backups.upload(data)` action (_available with PocketBase v0.18.0_).

- Added _experimental_ `autoRefreshThreshold` option to auto refresh (or reauthenticate) the AuthStore when authenticated as admin.
    _This could be used as an alternative to fixed Admin API keys._
    ```js
    await pb.admins.authWithPassword("test@example.com", "1234567890", {
      // This will trigger auto refresh or auto reauthentication in case
      // the token has expired or is going to expire in the next 30 minutes.
      autoRefreshThreshold: 30 * 60
    })
    ```


## 0.17.3

- Loosen the type check when calling `pb.files.getUrl(user, filename)` to allow passing the `pb.authStore.model` without type assertion.


## 0.17.2

- Fixed mulitple File/Blob array values not transformed properly to their FormData equivalent when an object syntax is used.


## 0.17.1

- Fixed typo in the deprecation console.warn messages ([#235](https://github.com/pocketbase/js-sdk/pull/235); thanks @heloineto).


## 0.17.0

- To simplify file uploads, we now allow sending the `multipart/form-data` request body also as plain object if at least one of the object props has `File` or `Blob` value.
    ```js
    // the standard way to create multipart/form-data body
    const data = new FormData();
    data.set("title", "lorem ipsum...")
    data.set("document", new File(...))

    // this is the same as above
    // (it will be converted behind the scenes to FormData)
    const data = {
      "title":    "lorem ipsum...",
      "document": new File(...),
    };

    await pb.collection("example").create(data);
    ```

- Added new `pb.authStore.isAdmin` and `pb.authStore.isAuthRecord` helpers to check the type of the current auth state.

- The default `LocalAuthStore` now listen to the browser [storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event),
  so that we can sync automatically the `pb.authStore` state between multiple tabs.

- Added new helper `AsyncAuthStore` class that can be used to integrate with any 3rd party async storage implementation (_usually this is needed when working with React Native_):
    ```js
    import AsyncStorage from "@react-native-async-storage/async-storage";
    import PocketBase, { AsyncAuthStore } from "pocketbase";

    const store = new AsyncAuthStore({
        save:    async (serialized) => AsyncStorage.setItem("pb_auth", serialized),
        initial: AsyncStorage.getItem("pb_auth"),
    });

    const pb = new PocketBase("https://example.com", store)
    ```

- `pb.files.getUrl()` now returns empty string in case an empty filename is passed.

- ⚠️ All API actions now return plain object (POJO) as response, aka. the custom class wrapping was removed and you no longer need to manually call `structuredClone(response)` when using with SSR frameworks.

    This could be a breaking change if you use the below classes (_and respectively their helper methods like `$isNew`, `$load()`, etc._) since they were replaced with plain TS interfaces:
    ```ts
    class BaseModel    -> interface BaseModel
    class Admin        -> interface AdminModel
    class Record       -> interface RecordModel
    class LogRequest   -> interface LogRequestModel
    class ExternalAuth -> interface ExternalAuthModel
    class Collection   -> interface CollectionModel
    class SchemaField  -> interface SchemaField
    class ListResult   -> interface ListResult
    ```

    _Side-note:_ If you use somewhere in your code the `Record` and `Admin` classes to determine the type of your `pb.authStore.model`,
    you can safely replace it with the new `pb.authStore.isAdmin` and `pb.authStore.isAuthRecord` getters.

- ⚠️ Added support for per-request `fetch` options, including also specifying completely custom `fetch` implementation.

    In addition to the default [`fetch` options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#options), the following configurable fields are supported:

    ```ts
    interface SendOptions extends RequestInit {
        // any other custom key will be merged with the query parameters
        // for backward compatibility and to minimize the verbosity
        [key: string]: any;

        // optional custom fetch function to use for sending the request
        fetch?: (url: RequestInfo | URL, config?: RequestInit) => Promise<Response>;

        // custom headers to send with the requests
        headers?: { [key: string]: string };

        // the body of the request (serialized automatically for json requests)
        body?: any;

        // query params that will be appended to the request url
        query?: { [key: string]: any };

        // the request identifier that can be used to cancel pending requests
        requestKey?:  string|null;

        // @deprecated use `requestKey:string` instead
        $cancelKey?:  string;

        // @deprecated use `requestKey:null` instead
        $autoCancel?: boolean;
    }
    ```

    For most users the above will not be a breaking change since there are available function overloads (_when possible_) to preserve the old behavior, but you can get a warning message in the console to update to the new format.
    For example:
    ```js
    // OLD (should still work but with a warning in the console)
    await pb.collection("example").authRefresh({}, {
      "expand": "someRelField",
    })

    // NEW
    await pb.collection("example").authRefresh({
      "expand": "someRelField",
      // send some additional header
      "headers": {
        "X-Custom-Header": "123",
      },
      "cache": "no-store" // also usually used by frameworks like Next.js
    })
    ```

- Eagerly open the default OAuth2 signin popup in case no custom `urlCallback` is provided as a workaround for Safari.

- Internal refactoring (updated dev dependencies, refactored the tests to use Vitest instead of Mocha, etc.).


## 0.16.0

- Added `skipTotal=1` query parameter by default for the `getFirstListItem()` and `getFullList()` requests.
  _Note that this have performance boost only with PocketBase v0.17+._

- Added optional `download=1` query parameter to force file urls with `Content-Disposition: attachment` (_supported with PocketBase v0.17+_).


## 0.15.3

- Automatically resolve pending realtime connect `Promise`s in case `unsubscribe` is called before
  `subscribe` is being able to complete ([pocketbase#2897](https://github.com/pocketbase/pocketbase/discussions/2897#discussioncomment-6423818)).


## 0.15.2

- Replaced `new URL(...)` with manual url parsing as it is not fully supported in React Native ([pocketbase#2484](https://github.com/pocketbase/pocketbase/discussions/2484#discussioncomment-6114540)).

- Fixed nested `ClientResponseError.originalError` wrapping and added `ClientResponseError` constructor tests.


## 0.15.1

- Cancel any pending subscriptions submit requests on realtime disconnect ([#204](https://github.com/pocketbase/js-sdk/issues/204)).


## 0.15.0

- Added `fields` to the optional query parameters for limiting the returned API fields (_available with PocketBase v0.16.0_).

- Added `pb.backups` service for the new PocketBase backup and restore APIs (_available with PocketBase v0.16.0_).

- Updated `pb.settings.testS3(filesystem)` to allow specifying a filesystem to test - `storage` or `backups` (_available with PocketBase v0.16.0_).


## 0.14.4

- Removed the legacy aliased `BaseModel.isNew` getter since it conflicts with similarly named record fields ([pocketbase#2385](https://github.com/pocketbase/pocketbase/discussions/2385)).
  _This helper is mainly used in the Admin UI, but if you are also using it in your code you can replace it with the `$` prefixed version, aka. `BaseModel.$isNew`._


## 0.14.3

- Added `OAuth2AuthConfig.query` prop to send optional query parameters with the `authWithOAuth2(config)` call.


## 0.14.2

- Use `location.origin + location.pathname` instead of full `location.href` when constructing the browser absolute url to ignore any extra hash or query parameter passed to the base url.
  _This is a small addition to the earlier change from v0.14.1._


## 0.14.1

- Use an absolute url when the SDK is initialized with a relative base path in a browser env to ensure that the generated OAuth2 redirect and file urls are absolute.


## 0.14.0

- Added simplified `authWithOAuth2()` version without having to implement custom redirect, deeplink or even page reload:
    ```js
    const authData = await pb.collection('users').authWithOAuth2({
      provider: 'google'
    })
    ```

    Works with PocketBase v0.15.0+.

    This method initializes a one-off realtime subscription and will
    open a popup window with the OAuth2 vendor page to authenticate.
    Once the external OAuth2 sign-in/sign-up flow is completed, the popup
    window will be automatically closed and the OAuth2 data sent back
    to the user through the previously established realtime connection.

    _Site-note_: when creating the OAuth2 app in the provider dashboard
    you have to configure `https://yourdomain.com/api/oauth2-redirect`
    as redirect URL.

    _The "manual" code exchange flow is still supported as `authWithOAuth2Code(provider, code, codeVerifier, redirectUrl)`._

    _For backward compatibility it is also available as soft-deprecated function overload of `authWithOAuth2(provider, code, codeVerifier, redirectUrl)`._

- Added new `pb.files` service:
    ```js
    // Builds and returns an absolute record file url for the provided filename.
    🔓 pb.files.getUrl(record, filename, queryParams = {});

    // Requests a new private file access token for the current auth model (admin or record).
    🔐 pb.files.getToken(queryParams = {});
    ```
    _`pb.getFileUrl()` is soft-deprecated and acts as alias calling `pb.files.getUrl()` under the hood._

    Works with PocketBase v0.15.0+.


## 0.13.1

- Added option to specify a generic `send()` return type and defined `SendOptions` type ([#171](https://github.com/pocketbase/js-sdk/pull/171); thanks @iamelevich).

- Deprecated `SchemaField.unique` prop since its function is replaced by `Collection.indexes` in the upcoming PocketBase v0.14.0 release.


## 0.13.0

- Aliased all `BaseModel` helpers with `$` equivalent to avoid conflicts with the dynamic record props ([#169](https://github.com/pocketbase/js-sdk/issues/169)).
  ```js
  isNew      -> $isNew
  load(data) -> $load(data)
  clone()    -> $clone()
  export()   -> $export()
  // ...
  ```
  _For backward compatibility, the old helpers will still continue to work if the record doesn't have a conflicting field name._

- Updated `pb.beforeSend` and `pb.afterSend` signatures to allow returning and awaiting an optional `Promise` ([#166](https://github.com/pocketbase/js-sdk/pull/166); thanks @Bobby-McBobface).

- Added `Collection.indexes` field for the new collection indexes support in the upcoming PocketBase v0.14.0.

- Added `pb.settings.generateAppleClientSecret()` for sending a request to generate Apple OAuth2 client secret in the upcoming PocketBase v0.14.0.


## 0.12.1

- Fixed request `multipart/form-data` body check to allow the React Native Android and iOS custom `FormData` implementation as valid `fetch` body ([#2002](https://github.com/pocketbase/pocketbase/discussions/2002)).


## 0.12.0

- Changed the return type of `pb.beforeSend` hook to allow modifying the request url ([#1930](https://github.com/pocketbase/pocketbase/discussions/1930)).
  ```js
  // old
  pb.beforeSend = function (url, options) {
    ...
    return options;
  }

  // new
  pb.beforeSend = function (url, options) {
    ...
    return { url, options };
  }
  ```
  The old return format is soft-deprecated and will still work, but you'll get a `console.warn` message to replace it.


## 0.11.1

- Exported the services class definitions to allow being used as argument types ([#153](https://github.com/pocketbase/js-sdk/issues/153)).
  ```js
  CrudService
  AdminService
  CollectionService
  LogService
  RealtimeService
  RecordService
  SettingsService
  ```

## 0.11.0

- Aliased/soft-deprecated `ClientResponseError.data` in favor of `ClientResponseError.response` to avoid the stuttering when accessing the inner error response `data` key (aka. `err.data.data` now is `err.response.data`).
  The `ClientResponseError.data` will still work but it is recommend for new code to use the `response` key.

- Added `getFullList(queryParams = {})` overload since the default batch size in most cases doesn't need to change (it can be defined as query parameter).
  The old form `getFullList(batch = 200, queryParams = {})` will still work, but it is recommend for new code to use the shorter form.


## 0.10.2

- Updated `getFileUrl()` to accept custom types as record argument.


## 0.10.1

- Added check for the collection name before auto updating the `pb.authStore` state on auth record update/delete.


## 0.10.0

- Added more helpful message for the `ECONNREFUSED ::1` localhost error (related to [#21](https://github.com/pocketbase/js-sdk/issues/21)).

- Preserved the "original" function and class names in the minified output for those who rely on `*.prototype.name`.

- Allowed sending the existing valid auth token with the `authWithPassword()` calls.

- Updated the Nuxt3 SSR examples to use the built-in `useCookie()` helper.


## 0.9.1

- Normalized nested `expand` items to `Record|Array<Record>` instances.


## 0.9.0

- Added `pb.health.check()` that checks the health status of the API service (_available in PocketBase v0.10.0_)


## 0.8.4

- Added type declarations for the action query parameters ([#102](https://github.com/pocketbase/js-sdk/pull/102); thanks @sewera).
  ```js
  BaseQueryParams
  ListQueryParams
  RecordQueryParams
  RecordListQueryParams
  LogStatsQueryParams
  FileQueryParams
  ```


## 0.8.3

- Renamed the declaration file extension from `.d.ts` to `.d.mts` to prevent type resolution issues ([#92](https://github.com/pocketbase/js-sdk/issues/92)).


## 0.8.2

- Allowed catching the initial realtime connect error as part of the `subscribe()` Promise resolution.

- Reimplemented the default `EventSource` retry mechanism for better control and more consistent behavior across different browsers.


## 0.8.1

This release contains only documentation fixes:

- Fixed code comment typos.

- Added note about loadFromCookie that you may need to call authRefresh to validate the loaded cookie state server-side.

- Updated the SSR examples to show the authRefresh call. _For the examples the authRefresh call is not required but it is there to remind users that it needs to be called if you want to do permission checks in a node env (eg. SSR) and rely on the `pb.authStore.isValid`._


## 0.8.0

> ⚠️ Please note that this release works only with the new PocketBase v0.8+ API!
>
> See the breaking changes below for what has changed since v0.7.x.

#### Non breaking changes

- Added support for optional custom `Record` types using TypeScript generics, eg.
  `pb.collection('example').getList<Tasks>()`.

- Added new `pb.autoCancellation(bool)` method to globally enable or disable auto cancellation (`true` by default).

- Added new crud method `getFirstListItem(filter)` to fetch a single item by a list filter.

- You can now set additional account `createData` when authenticating with OAuth2.

- Added `AuthMethodsList.usernamePassword` return field (we now support combined username/email authentication; see below `authWithPassword`).

#### Breaking changes

- Changed the contstructor from `PocketBase(url, lang?, store?)` to `PocketBase(url, store?, lang?)` (aka. the `lang` option is now last).

- For easier and more conventional parsing, all DateTime strings now have `Z` as suffix, so that you can do directly `new Date('2022-01-01 01:02:03.456Z')`.

- Moved `pb.records.getFileUrl()` to `pb.getFileUrl()`.

- Moved all `pb.records.*` handlers under `pb.collection().*`:
  ```
  pb.records.getFullList('example');                => pb.collection('example').getFullList();
  pb.records.getList('example');                    => pb.collection('example').getList();
  pb.records.getOne('example', 'RECORD_ID');        => pb.collection('example').getOne('RECORD_ID');
  (no old equivalent)                               => pb.collection('example').getFirstListItem(filter);
  pb.records.create('example', {...});              => pb.collection('example').create({...});
  pb.records.update('example', 'RECORD_ID', {...}); => pb.collection('example').update('RECORD_ID', {...});
  pb.records.delete('example', 'RECORD_ID');        => pb.collection('example').delete('RECORD_ID');
  ```

- The `pb.realtime` service has now a more general callback form so that it can be used with custom realtime handlers.
  Dedicated records specific subscribtions could be found under `pb.collection().*`:
  ```
  pb.realtime.subscribe('example', callback)           => pb.collection('example').subscribe("*", callback)
  pb.realtime.subscribe('example/RECORD_ID', callback) => pb.collection('example').subscribe('RECORD_ID', callback)
  pb.realtime.unsubscribe('example')                   => pb.collection('example').unsubscribe("*")
  pb.realtime.unsubscribe('example/RECORD_ID')         => pb.collection('example').unsubscribe('RECORD_ID')
  (no old equivalent)                                  => pb.collection('example').unsubscribe()
  ```
  Additionally, `subscribe()` now return `UnsubscribeFunc` that could be used to unsubscribe only from a single subscription listener.

- Moved all `pb.users.*` handlers under `pb.collection().*`:
  ```
  pb.users.listAuthMethods()                                                 => pb.collection('users').listAuthMethods()
  pb.users.authViaEmail(email, password)                                     => pb.collection('users').authWithPassword(usernameOrEmail, password)
  pb.users.authViaOAuth2(provider, code, codeVerifier, redirectUrl)          => pb.collection('users').authWithOAuth2(provider, code, codeVerifier, redirectUrl, createData = {})
  pb.users.refresh()                                                         => pb.collection('users').authRefresh()
  pb.users.requestPasswordReset(email)                                       => pb.collection('users').requestPasswordReset(email)
  pb.users.confirmPasswordReset(resetToken, newPassword, newPasswordConfirm) => pb.collection('users').confirmPasswordReset(resetToken, newPassword, newPasswordConfirm)
  pb.users.requestVerification(email)                                        => pb.collection('users').requestVerification(email)
  pb.users.confirmVerification(verificationToken)                            => pb.collection('users').confirmVerification(verificationToken)
  pb.users.requestEmailChange(newEmail)                                      => pb.collection('users').requestEmailChange(newEmail)
  pb.users.confirmEmailChange(emailChangeToken, password)                    => pb.collection('users').confirmEmailChange(emailChangeToken, password)
  pb.users.listExternalAuths(recordId)                                       => pb.collection('users').listExternalAuths(recordId)
  pb.users.unlinkExternalAuth(recordId, provider)                            => pb.collection('users').unlinkExternalAuth(recordId, provider)
  ```

- Changes in `pb.admins` for consistency with the new auth handlers in `pb.collection().*`:
  ```
  pb.admins.authViaEmail(email, password); => pb.admins.authWithPassword(email, password);
  pb.admins.refresh();                     => pb.admins.authRefresh();
  ```

- To prevent confusion with the auth method responses, the following methods now returns 204 with empty body (previously 200 with token and auth model):
  ```js
  pb.admins.confirmPasswordReset(...): Promise<bool>
  pb.collection("users").confirmPasswordReset(...): Promise<bool>
  pb.collection("users").confirmVerification(...): Promise<bool>
  pb.collection("users").confirmEmailChange(...): Promise<bool>
  ```

- Removed the `User` model because users are now regular records (aka. `Record`).
  **The old user fields `lastResetSentAt`, `lastVerificationSentAt` and `profile` are no longer available**
  (the `profile` fields are available under the `Record.*` property like any other fields).

- Renamed the special `Record` props:
  ```
  @collectionId   => collectionId
  @collectionName => collectionName
  @expand         => expand
  ```

- Since there is no longer `User` model, `pb.authStore.model` can now be of type `Record`, `Admin` or `null`.

- Removed `lastResetSentAt` from the `Admin` model.

- Replaced `ExternalAuth.userId` with 2 new `recordId` and `collectionId` props.

- Removed the deprecated uppercase service aliases:
  ```
  client.Users       => client.collection(*)
  client.Records     => client.collection(*)
  client.AuthStore   => client.authStore
  client.Realtime    => client.realtime
  client.Admins      => client.admins
  client.Collections => client.collections
  client.Logs        => client.logs
  client.Settings    => client.settings
  ```
