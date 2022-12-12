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
