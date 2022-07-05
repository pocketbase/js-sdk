PocketBase JavaScript SDK
======================================================================

Official JavaScript SDK (browser and node) for interacting with the [PocketBase API](https://pocketbase.io/docs).

- [Installation](#installation)
- [Examples](#examples)
- [Definitions](#definitions)
- [Development](#development)


## Installation

#### NPM (node, bundlers)
```sh
npm install pocketbase --save
```

```js
import PocketBase from 'pocketbase'
```

#### Manual (browser, node)

```html
<script src="/path/to/dist/pocketbase.umd.js"></script>
```

_OR if you are using JavaScript modules:_
```html
<script type="module">
    import PocketBase from "/path/to/dist/pocketbase.es.js"
    ...
</script>
```

## Examples

```js
const client = new PocketBase('http://localhost:8090');

...

// list and filter "demo" collection records
const result = await client.Records.getList("demo", 1, 20, {
    filter: "status = true && totalComments > 0"
});

// authenticate as regular user
const userData = await client.Users.authViaEmail("test@example.com", "password");


// or as admin
const adminData = await client.Admins.authViaEmail("test@example.com", "password");

// and much more...
```
> More detailed API docs and copy-paste examples could be found in the [API documentation for each service](https://pocketbase.io/docs/api-authentication).


## Definitions

#### Creating new client instance

```js
const client = new PocketBase(
    baseUrl = '/',
    lang = 'en-US',
    authStore = LocalAuthStore,
    httpConfig = {},
);
```

#### Instance methods

> Each instance method returns the `PocketBase` instance allowing chaining.

| Method                            | Description                                           |
|:----------------------------------|:------------------------------------------------------|
| `client.cancelRequest(cancelKey)` | Cancels single request by its cancellation token key. |
| `client.cancelAllRequests()`      | Cancels all pending requests.                         |
| `client.send(reqConfig = {})`     | Sends an api http request.                            |


#### API services

> Each service call returns a `Promise` object with the API response.


| Resource                                                                                                                                                                                          | Description                                                                                           |
|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------------|
| **[Admins](https://pocketbase.io/docs/api-admins)**                                                                                                                                               |                                                                                                       |
| 🔓`client.Admins.authViaEmail(email, password, bodyParams = {}, queryParams = {})`                                                                                                                 | Authenticate an admin account by its email and password and returns a new admin token and admin data. |
| 🔐`client.Admins.refresh(bodyParams = {}, queryParams = {})`                                                                                                                                       | Refreshes the current admin authenticated instance and returns a new admin token and admin data.      |
| 🔓`client.Admins.requestPasswordReset(email, bodyParams = {}, queryParams = {})`                                                                                                                   | Sends admin password reset request.                                                                   |
| 🔓`client.Admins.confirmPasswordReset(passwordResetToken, password, passwordConfirm, bodyParams = {}, queryParams = {})`                                                                           | Confirms admin password reset request.                                                                |
| 🔐`client.Admins.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                                | Returns paginated admins list.                                                                        |
| 🔐`client.Admins.getFullList(batchSize = 100, queryParams = {})`                                                                                                                                   | Returns a list with all admins batch fetched at once.                                                 |
| 🔐`client.Admins.getOne(id, queryParams = {})`                                                                                                                                                     | Returns single admin by its id.                                                                       |
| 🔐`client.Admins.create(bodyParams = {}, queryParams = {})`                                                                                                                                        | Creates a new admin.                                                                                  |
| 🔐`client.Admins.update(id, bodyParams = {}, queryParams = {})`                                                                                                                                    | Updates an existing admin by its id.                                                                  |
| 🔐`client.Admins.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                                    | Deletes an existing admin by its id.                                                                  |
| **[Users](https://pocketbase.io/docs/api-users)**                                                                                                                                                 |                                                                                                       |
| 🔓`client.Users.listAuthMethods(queryParams = {})`                                                                                                                                                 | Returns all available application auth methods.                                                       |
| 🔓`client.Users.authViaEmail(email, password, bodyParams = {}, queryParams = {})`                                                                                                                  | Authenticate a user account by its email and password and returns a new user token and user data.     |
| 🔓`client.Users.authViaOAuth2(clientName, code, codeVerifier, redirectUrl, bodyParams = {}, queryParams = {})`                                                                                     | Authenticate a user via OAuth2 client provider.                                                       |
| 🔐`client.Users.refresh(bodyParams = {}, queryParams = {})`                                                                                                                                        | Refreshes the current user authenticated instance and returns a new user token and user data.         |
| 🔓`client.Users.requestPasswordReset(email, bodyParams = {}, queryParams = {})`                                                                                                                    | Sends user password reset request.                                                                    |
| 🔓`client.Users.confirmPasswordReset(passwordResetToken, password, passwordConfirm, bodyParams = {}, queryParams = {})`                                                                            | Confirms user password reset request.                                                                 |
| 🔓`client.Users.requestVerification(email, bodyParams = {}, queryParams = {})`                                                                                                                     | Sends user verification email request.                                                                |
| 🔓`client.Users.confirmVerification(verificationToken, bodyParams = {}, queryParams = {})`                                                                                                         | Confirms user email verification request.                                                             |
| 🔐`client.Users.requestEmailChange(newEmail, bodyParams = {}, queryParams = {})`                                                                                                                   | Sends an email change request to the authenticated user.                                              |
| 🔓`client.Users.confirmEmailChange(emailChangeToken, password, bodyParams = {}, queryParams = {})`                                                                                                 | Confirms user new email address.                                                                      |
| 🔐`client.Users.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                                 | Returns paginated users list.                                                                         |
| 🔐`client.Users.getFullList(batchSize = 100, queryParams = {})`                                                                                                                                    | Returns a list with all users batch fetched at once.                                                  |
| 🔐`client.Users.getOne(id, queryParams = {})`                                                                                                                                                      | Returns single user by its id.                                                                        |
| 🔐`client.Users.create(bodyParams = {}, queryParams = {})`                                                                                                                                         | Creates a new user.                                                                                   |
| 🔐`client.Users.update(id, bodyParams = {}, queryParams = {})`                                                                                                                                     | Updates an existing user by its id.                                                                   |
| 🔐`client.Users.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                                     | Deletes an existing user by its id.                                                                   |
| **[Realtime](https://pocketbase.io/docs/api-realtime)** <br/> _(for node environments you'll have to install an EventSource polyfill beforehand, eg. https://github.com/EventSource/eventsource)_ |                                                                                                       |
| 🔓`client.Realtime.subscribe(subscription, callback)`                                                                                                                                              | Inits the sse connection (if not already) and register the subscription.                              |
| 🔓`client.Realtime.unsubscribe(subscription = "")`                                                                                                                                                 | Unsubscribe from a subscription (if empty - unsubscibe from all registered subscriptions).            |
| **[Collections](https://pocketbase.io/docs/api-collections)**                                                                                                                                     |                                                                                                       |
| 🔐`client.Collections.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                           | Returns paginated collections list.                                                                   |
| 🔐`client.Collections.getFullList(batchSize = 100, queryParams = {})`                                                                                                                              | Returns a list with all collections batch fetched at once.                                            |
| 🔐`client.Collections.getOne(id, queryParams = {})`                                                                                                                                                | Returns single collection by its id.                                                                  |
| 🔐`client.Collections.create(bodyParams = {}, queryParams = {})`                                                                                                                                   | Creates a new collection.                                                                             |
| 🔐`client.Collections.update(id, bodyParams = {}, queryParams = {})`                                                                                                                               | Updates an existing collection by its id.                                                             |
| 🔐`client.Collections.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                               | Deletes an existing collection by its id.                                                             |
| **[Records](https://pocketbase.io/docs/api-records)**                                                                                                                                             |                                                                                                       |
| 🔓`client.Records.getList(collectionIdOrName, page = 1, perPage = 30, queryParams = {})`                                                                                                           | Returns paginated records list.                                                                       |
| 🔓`client.Records.getFullList(collectionIdOrName, batchSize = 100, queryParams = {})`                                                                                                              | Returns a list with all records batch fetched at once.                                                |
| 🔓`client.Records.getOne(collectionIdOrName, id, queryParams = {})`                                                                                                                                | Returns single record by its id.                                                                      |
| 🔓`client.Records.create(collectionIdOrName, bodyParams = {}, queryParams = {})`                                                                                                                   | Creates a new record.                                                                                 |
| 🔓`client.Records.update(collectionIdOrName, id, bodyParams = {}, queryParams = {})`                                                                                                               | Updates an existing record by its id.                                                                 |
| 🔓`client.Records.delete(collectionIdOrName, id, bodyParams = {}, queryParams = {})`                                                                                                               | Deletes an existing record by its id.                                                                 |
| **[Logs](https://pocketbase.io/docs/api-logs)**                                                                                                                                                   |                                                                                                       |
| 🔐`client.Logs.getRequestsList(page = 1, perPage = 30, queryParams = {})`                                                                                                                          | Returns paginated request logs list.                                                                  |
| 🔐`client.Logs.getRequest(id, queryParams = {})`                                                                                                                                                   | Returns a single request log by its id.                                                               |
| 🔐`client.Logs.getRequestsStats(queryParams = {})`                                                                                                                                                 | Returns request logs statistics.                                                                      |
| **[Settings](https://pocketbase.io/docs/api-records)**                                                                                                                                            |                                                                                                       |
| 🔐`client.Settings.getAll(queryParams = {})`                                                                                                                                                       | Fetch all available app settings.                                                                     |
| 🔐`client.Settings.update(bodyParams = {}, queryParams = {})`                                                                                                                                      | Bulk updates app settings.                                                                            |


## Development
```sh
# run unit tests
npm test

# build and minify for production
npm run build
```
