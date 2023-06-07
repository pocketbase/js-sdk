## 0.15.2

- Replaced `new URL(...)` with manual url parsing as it is not fully supported in React Native ([pocketbase#2484](https://github.com/pocketbase/pocketbase/discussions/2484#discussioncomment-6114540)).

- Fixed nested `ClientResponseErrors.originalError` wrapping and added `ClientResponseErrors` constructor tests.


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
