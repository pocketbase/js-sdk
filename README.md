PocketBase JavaScript SDK
======================================================================

Official JavaScript SDK (browser and node) for interacting with the [PocketBase API](https://pocketbase.io/docs).

- [Installation](#installation)
- [Usage](#usage)
- [Caveats](#caveats)
    - [File upload](#file-upload)
    - [Errors handling](#errors-handling)
    - [AuthStore](#authstore)
    - [Auto cancellation](#auto-cancellation)
    - [Send hooks](#send-hooks)
- [Definitions](#definitions)
- [Development](#development)


## Installation

#### Browser (manually via script tag)

```html
<script src="/path/to/dist/pocketbase.umd.js"></script>
```

_OR if you are using ES modules:_
```html
<script type="module">
    import PocketBase from '/path/to/dist/pocketbase.es.mjs'
    ...
</script>
```

#### Node.js (via npm)

```sh
npm install pocketbase --save
```

```js
// Using ES modules (default)
import PocketBase from 'pocketbase'

// OR if you are using CommonJS modules
const PocketBase = require('pocketbase/cjs')
```

> 🔧 For **Node < 17** you'll need to load a `fetch()` polyfill.
> I recommend [lquixada/cross-fetch](https://github.com/lquixada/cross-fetch):
> ```js
> // npm install cross-fetch --save
> require('cross-fetch/polyfill');
> ```
---
> 🔧 Node doesn't have native `EvenSource` implementation, so in order to use the realtime service (aka. `client.realtime.subscribe()`) you'll need to load a `EventSource` polyfill.
> I recommend [EventSource/eventsource](https://github.com/EventSource/eventsource):
> ```js
> // npm install eventsource --save
> global.EventSource = require('eventsource');
> ```
---

## Usage

```js
import PocketBase from 'pocketbase';

const client = new PocketBase('http://localhost:8090');

...

// list and filter "example" collection records
const result = await client.records.getList('example', 1, 20, {
    filter: 'status = true && created > "2022-08-01 10:00:00"'
});

// authenticate as regular user
const userData = await client.users.authViaEmail('test@example.com', '123456');


// or as admin
const adminData = await client.admins.authViaEmail('test@example.com', '123456');

// and much more...
```
> More detailed API docs and copy-paste examples could be found in the [API documentation for each service](https://pocketbase.io/docs/api-authentication).


## Caveats

#### File upload

PocketBase Web API supports file upload via `multipart/form-data` requests,
which means that to upload a file it is enough to provide a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) object as body.

Here is a simple browser example of uploading multiple files together with some other regular fields:

```html
<input type="file" id="fileInput" />
```
```js
import PocketBase from 'pocketbase';

const client = new PocketBase('http://localhost:8090');

...

const formData = new FormData();

const fileInput = document.getElementById('fileInput');

// listen to file input changes and add the selected files to the form data
fileInput.addEventListener('change', function () {
    for (let file of fileInput.files) {
        formData.append('documents', file);
    }
});

// set some other regular text field value
formData.append('title', 'Hello world!');

...

// upload and create new record
const createdRecord = await client.Records.create('example', formData);
```

#### Errors handling

All services return a standard [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-based response, so the error handling is straightforward:
```js
client.records.getList('example', 1, 50).then((result) {
  // success...
  console.log('Result:', result);
}).catch((error) {
  // error...
  console.log('Error:', error);
});

// OR if you are using the async/await syntax:
try {
  const result = await client.records.getList('example', 1, 50);
  console.log('Result:', result);
} catch (error) {
  console.log('Error:', error);
}
```

The response error is normalized and always returned as `ClientResponseError` object with the following public fields that you could use:
```js
ClientResponseError {
    url:           string,     // requested url
    status:        number,     // response status code
    data:          { ... },    // the API JSON error response
    isAbort:       boolean,    // is abort/cancellation error
    originalError: Error|null, // the original non-normalized error
}
```

#### AuthStore

The SDK keeps track of the authenticated token and auth model for you via the `client.authStore` instance.
It has the following public members that you can use:

```js
AuthStore {
    // fields
    token:   string     // the authenticated token
    model:   User|Admin // the authenticated User or Admin model
    isValid: boolean    // checks if the store has existing and unexpired token

    // methods
    clear()                    // "logout" the authenticated User or Admin
    save(token, model)         // update the store with the new auth data
    onChange(fn(token, model)) // register a store change listener callback function
}
```

By default the SDK initialize a [`LocalAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/LocalAuthStore.ts), which uses the browser's `LocalStorage` if available, otherwise - will fallback to runtime/memory store (aka. on page refresh or service restart you'll have to authenticate again).

To _"logout"_ an authenticated user or admin, you can just call `client.authStore.clear()`.

To _"listen"_ for changes in the auth store, you can register a new listener via the `client.authStore.onChange`, eg:
```js
const removeListener = client.authStore.onChange((token, model) => {
    console.log('New store data:', token, model)
});

removeListener(); // (optional) removes the attached listener function
```

If you want to create your own `AuthStore`, you can extend [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and pass the new custom instance as constructor argument to the client:

```js
import PocketBase, { BaseAuthStore } from 'pocketbase';

class CustomAuthStore extends BaseAuthStore {
    ...
}

const client = new PocketBase('http://localhost:8090', 'en-US', CustomAuthStore());
```

#### Auto cancellation

The SDK client will auto cancel duplicated pending requests for you.
For example, if you have the following 3 duplicated calls, only the last one will be executed, while the first 2 will be cancelled with `ClientResponseError` error:

```js
client.records.getList('example', 1, 20) // cancelled
client.records.getList('example', 1, 20) // cancelled
client.records.getList('example', 1, 20) // executed
```

To change this behavior, you could make use of 2 special query parameters:

- `$autoCancel ` - set it to `false` to disable auto cancellation for this request
- `$cancelKey` - set it to a string that will be used as request identifier and based on which pending duplicated requests will be matched (default to `HTTP_METHOD + url`, eg. "get /api/users?page=1")

Example:

```js
client.records.getList('example', 1, 20);                           // cancelled
client.records.getList('example', 1, 20);                           // executed
client.records.getList('example', 1, 20, { '$autoCancel': false }); // executed
client.records.getList('example', 1, 20, { '$autoCancel': false })  // executed
client.records.getList('example', 1, 20, { '$cancelKey': "test" })  // cancelled
client.records.getList('example', 1, 20, { '$cancelKey': "test" })  // executed
```

To manually cancel pending requests, you could use `client.cancelAllRequests()` or `client.cancelRequest(cancelKey)`.

#### Send hooks

Sometimes you may want to modify the request sent data or to cursomize the response.

To accomplish this, the SDK provides 2 function hooks:

- `beforeSend` - triggered right before sending the `fetch` request, allowing you to inspect/modify the request config.
    ```js
    const client = new PocketBase('http://localhost:8090');

    client.beforeSend = function (url, reqConfig) {
        // For list of the possible reqConfig properties check
        // https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
        reqConfig.headers = Object.assign(reqConfig.headers, {
            'X-Custom-Header': 'example',
        });

        return reqConfig;
    };
    ```

- `afterSend` - triggered after successfully sending the `fetch` request, allowing you to inspect/modify the response object and its parsed data.
    ```js
    const client = new PocketBase('http://localhost:8090');

    client.afterSend = function (response, data) {
        // do something with the response state
        console.log(response.status);

        return Object.assign(data, {
            // extend the data...
            "additionalField": 123,
        });
    };
    ```

## Definitions

#### Creating new client instance

```js
const client = new PocketBase(
    baseUrl = '/',
    lang = 'en-US',
    authStore = LocalAuthStore
);
```

#### Instance methods

> Each instance method returns the `PocketBase` instance allowing chaining.

| Method                                  | Description                                                         |
|:----------------------------------------|:--------------------------------------------------------------------|
| `client.send(path, reqConfig = {})`     | Sends an api http request.                                          |
| `client.cancelAllRequests()`            | Cancels all pending requests.                                       |
| `client.cancelRequest(cancelKey)`       | Cancels single request by its cancellation token key.               |
| `client.buildUrl(path, reqConfig = {})` | Builds a full client url by safely concatenating the provided path. |


#### API services

> Each service call returns a `Promise` object with the API response.


| Resource                                                                                                                                                                                          | Description                                                                                           |
|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------------|
| **[Admins](https://pocketbase.io/docs/api-admins)**                                                                                                                                               |                                                                                                       |
| 🔓`client.admins.authViaEmail(email, password, bodyParams = {}, queryParams = {})`                                                                                                                 | Authenticate an admin account by its email and password and returns a new admin token and admin data. |
| 🔐`client.admins.refresh(bodyParams = {}, queryParams = {})`                                                                                                                                       | Refreshes the current admin authenticated instance and returns a new admin token and admin data.      |
| 🔓`client.admins.requestPasswordReset(email, bodyParams = {}, queryParams = {})`                                                                                                                   | Sends admin password reset request.                                                                   |
| 🔓`client.admins.confirmPasswordReset(passwordResetToken, password, passwordConfirm, bodyParams = {}, queryParams = {})`                                                                           | Confirms admin password reset request.                                                                |
| 🔐`client.admins.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                                | Returns paginated admins list.                                                                        |
| 🔐`client.admins.getFullList(batchSize = 100, queryParams = {})`                                                                                                                                   | Returns a list with all admins batch fetched at once.                                                 |
| 🔐`client.admins.getOne(id, queryParams = {})`                                                                                                                                                     | Returns single admin by its id.                                                                       |
| 🔐`client.admins.create(bodyParams = {}, queryParams = {})`                                                                                                                                        | Creates a new admin.                                                                                  |
| 🔐`client.admins.update(id, bodyParams = {}, queryParams = {})`                                                                                                                                    | Updates an existing admin by its id.                                                                  |
| 🔐`client.admins.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                                    | Deletes an existing admin by its id.                                                                  |
| **[Users](https://pocketbase.io/docs/api-users)**                                                                                                                                                 |                                                                                                       |
| 🔓`client.users.listAuthMethods(queryParams = {})`                                                                                                                                                 | Returns all available application auth methods.                                                       |
| 🔓`client.users.authViaEmail(email, password, bodyParams = {}, queryParams = {})`                                                                                                                  | Authenticate a user account by its email and password and returns a new user token and user data.     |
| 🔓`client.users.authViaOAuth2(clientName, code, codeVerifier, redirectUrl, bodyParams = {}, queryParams = {})`                                                                                     | Authenticate a user via OAuth2 client provider.                                                       |
| 🔐`client.users.refresh(bodyParams = {}, queryParams = {})`                                                                                                                                        | Refreshes the current user authenticated instance and returns a new user token and user data.         |
| 🔓`client.users.requestPasswordReset(email, bodyParams = {}, queryParams = {})`                                                                                                                    | Sends user password reset request.                                                                    |
| 🔓`client.users.confirmPasswordReset(passwordResetToken, password, passwordConfirm, bodyParams = {}, queryParams = {})`                                                                            | Confirms user password reset request.                                                                 |
| 🔓`client.users.requestVerification(email, bodyParams = {}, queryParams = {})`                                                                                                                     | Sends user verification email request.                                                                |
| 🔓`client.users.confirmVerification(verificationToken, bodyParams = {}, queryParams = {})`                                                                                                         | Confirms user email verification request.                                                             |
| 🔐`client.users.requestEmailChange(newEmail, bodyParams = {}, queryParams = {})`                                                                                                                   | Sends an email change request to the authenticated user.                                              |
| 🔓`client.users.confirmEmailChange(emailChangeToken, password, bodyParams = {}, queryParams = {})`                                                                                                 | Confirms user new email address.                                                                      |
| 🔐`client.users.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                                 | Returns paginated users list.                                                                         |
| 🔐`client.users.getFullList(batchSize = 100, queryParams = {})`                                                                                                                                    | Returns a list with all users batch fetched at once.                                                  |
| 🔐`client.users.getOne(id, queryParams = {})`                                                                                                                                                      | Returns single user by its id.                                                                        |
| 🔐`client.users.create(bodyParams = {}, queryParams = {})`                                                                                                                                         | Creates a new user.                                                                                   |
| 🔐`client.users.update(id, bodyParams = {}, queryParams = {})`                                                                                                                                     | Updates an existing user by its id.                                                                   |
| 🔐`client.users.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                                     | Deletes an existing user by its id.                                                                   |
| **[Realtime](https://pocketbase.io/docs/api-realtime)** <br/> _(for node environments you'll have to install an EventSource polyfill beforehand, eg. https://github.com/EventSource/eventsource)_ |                                                                                                       |
| 🔓`client.realtime.subscribe(subscription, callback)`                                                                                                                                              | Inits the sse connection (if not already) and register the subscription.                              |
| 🔓`client.realtime.unsubscribe(subscription = "")`                                                                                                                                                 | Unsubscribe from a subscription (if empty - unsubscibe from all registered subscriptions).            |
| **[Collections](https://pocketbase.io/docs/api-collections)**                                                                                                                                     |                                                                                                       |
| 🔐`client.collections.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                           | Returns paginated collections list.                                                                   |
| 🔐`client.collections.getFullList(batchSize = 100, queryParams = {})`                                                                                                                              | Returns a list with all collections batch fetched at once.                                            |
| 🔐`client.collections.getOne(id, queryParams = {})`                                                                                                                                                | Returns single collection by its id.                                                                  |
| 🔐`client.collections.create(bodyParams = {}, queryParams = {})`                                                                                                                                   | Creates a new collection.                                                                             |
| 🔐`client.collections.update(id, bodyParams = {}, queryParams = {})`                                                                                                                               | Updates an existing collection by its id.                                                             |
| 🔐`client.collections.delete(id, bodyParams = {}, queryParams = {})`                                                                                                                               | Deletes an existing collection by its id.                                                             |
| **[Records](https://pocketbase.io/docs/api-records)**                                                                                                                                             |                                                                                                       |
| 🔓`client.records.getList(collectionIdOrName, page = 1, perPage = 30, queryParams = {})`                                                                                                           | Returns paginated records list.                                                                       |
| 🔓`client.records.getFullList(collectionIdOrName, batchSize = 100, queryParams = {})`                                                                                                              | Returns a list with all records batch fetched at once.                                                |
| 🔓`client.records.getOne(collectionIdOrName, id, queryParams = {})`                                                                                                                                | Returns single record by its id.                                                                      |
| 🔓`client.records.create(collectionIdOrName, bodyParams = {}, queryParams = {})`                                                                                                                   | Creates a new record.                                                                                 |
| 🔓`client.records.update(collectionIdOrName, id, bodyParams = {}, queryParams = {})`                                                                                                               | Updates an existing record by its id.                                                                 |
| 🔓`client.records.delete(collectionIdOrName, id, bodyParams = {}, queryParams = {})`                                                                                                               | Deletes an existing record by its id.                                                                 |
| **[Logs](https://pocketbase.io/docs/api-logs)**                                                                                                                                                   |                                                                                                       |
| 🔐`client.logs.getRequestsList(page = 1, perPage = 30, queryParams = {})`                                                                                                                          | Returns paginated request logs list.                                                                  |
| 🔐`client.logs.getRequest(id, queryParams = {})`                                                                                                                                                   | Returns a single request log by its id.                                                               |
| 🔐`client.logs.getRequestsStats(queryParams = {})`                                                                                                                                                 | Returns request logs statistics.                                                                      |
| **[Settings](https://pocketbase.io/docs/api-records)**                                                                                                                                            |                                                                                                       |
| 🔐`client.settings.getAll(queryParams = {})`                                                                                                                                                       | Fetch all available app settings.                                                                     |
| 🔐`client.settings.update(bodyParams = {}, queryParams = {})`                                                                                                                                      | Bulk updates app settings.                                                                            |


## Development
```sh
# run unit tests
npm test

# build and minify for production
npm run build
```
