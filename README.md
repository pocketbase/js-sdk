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
    - [SSR integration](#ssr-integration)
    - [Security](#security)
- [Definitions](#definitions)
- [Development](#development)


## Installation

### Browser (manually via script tag)

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

### Node.js (via npm)

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
> 🔧 Node doesn't have native `EventSource` implementation, so in order to use the realtime service (aka. `client.realtime.subscribe()`) you'll need to load a `EventSource` polyfill.
> I recommend [EventSource/eventsource](https://github.com/EventSource/eventsource):
> ```js
> // npm install eventsource --save
> global.EventSource = require('eventsource');
> ```


## Usage

```js
import PocketBase from 'pocketbase';

const client = new PocketBase('http://127.0.0.1:8090');

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

### File upload

PocketBase Web API supports file upload via `multipart/form-data` requests,
which means that to upload a file it is enough to provide a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) object as body.

Here is a simple browser example of uploading multiple files together with some other regular fields:

```html
<input type="file" id="fileInput" />
```
```js
import PocketBase from 'pocketbase';

const client = new PocketBase('http://127.0.0.1:8090');

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

### Errors handling

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

### AuthStore

The SDK keeps track of the authenticated token and auth model for you via the `client.authStore` instance.

The default [`LocalAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/LocalAuthStore.ts) uses the browser's `LocalStorage` if available, otherwise - will fallback to runtime/memory (aka. on page refresh or service restart you'll have to authenticate again).

The default `client.authStore` extends [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and has the following public members that you can use:

```js
BaseAuthStore {
    // base fields
    token:   string          // the authenticated token
    model:   User|Admin|null // the authenticated User or Admin model
    isValid: boolean         // checks if the store has existing and unexpired token

    // main methods
    clear()            // "logout" the authenticated User or Admin
    save(token, model) // update the store with the new auth data
    onChange(callback, fireImmediately = false) // register a callback that will be called on store change

    // cookie parse and serialize helpers
    loadFromCookie(cookieHeader, key = 'pb_auth')
    exportToCookie(options = {}, key = 'pb_auth')
}
```

To _"logout"_ an authenticated user or admin, you can just call `client.authStore.clear()`.

To _"listen"_ for changes in the auth store, you can register a new listener via `client.authStore.onChange`, eg:
```js
// triggered everytime on store change
const removeListener1 = client.authStore.onChange((token, model) => {
    console.log('New store data 1:', token, model)
});

// triggered once right after registration and everytime on store change
const removeListener2 = client.authStore.onChange((token, model) => {
    console.log('New store data 2:', token, model)
}, true);

// (optional) removes the attached listeners
removeListener1();
removeListener2();
```

If you want to create your own `AuthStore`, you can extend [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and pass the new custom instance as constructor argument to the client:

```js
import PocketBase, { BaseAuthStore } from 'pocketbase';

class CustomAuthStore extends BaseAuthStore {
    save(token, model) {
        super.save(token, model);
        // your custom business logic...
    }
}

const client = new PocketBase('http://127.0.0.1:8090', 'en-US', new CustomAuthStore());
```

### Auto cancellation

The SDK client will auto cancel duplicated pending requests for you.
For example, if you have the following 3 duplicated calls, only the last one will be executed, while the first 2 will be cancelled with `ClientResponseError` error:

```js
client.records.getList('example', 1, 20) // cancelled
client.records.getList('example', 2, 20) // cancelled
client.records.getList('example', 3, 20) // executed
```

To change this behavior, you could make use of 2 special query parameters:

- `$autoCancel ` - set it to `false` to disable auto cancellation for this request
- `$cancelKey` - set it to a string that will be used as request identifier and based on which pending requests will be matched (default to `HTTP_METHOD + path`, eg. "GET /api/users")

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

> If you want to completelly disable the auto cancellation behavior, you could use the `client.beforeSend` hook and
delete the `reqConfig.signal` property.

### Send hooks

Sometimes you may want to modify the request sent data or to customize the response.

To accomplish this, the SDK provides 2 function hooks:

- `beforeSend` - triggered right before sending the `fetch` request, allowing you to inspect/modify the request config.
    ```js
    const client = new PocketBase('http://127.0.0.1:8090');

    client.beforeSend = function (url, reqConfig) {
        // For list of the possible reqConfig properties check
        // https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
        reqConfig.headers = Object.assign({}, reqConfig.headers, {
            'X-Custom-Header': 'example',
        });

        return reqConfig;
    };
    ```

- `afterSend` - triggered after successfully sending the `fetch` request, allowing you to inspect/modify the response object and its parsed data.
    ```js
    const client = new PocketBase('http://127.0.0.1:8090');

    client.afterSend = function (response, data) {
        // do something with the response state
        console.log(response.status);

        return Object.assign(data, {
            // extend the data...
            "additionalField": 123,
        });
    };
    ```

### SSR integration

Unfortunately, **there is no "one size fits all" solution** because each framework handle SSR differently (_and even in a single framework there is more than one way of doing things_).

But in general, the idea is to use a cookie based flow:

1. Create a new `PocketBase` instance for each server-side request
2. "Load/Feed" your `client.authStore` with data from the request cookie
3. Perform your application server-side actions
4. Before returning the response to the client, update the cookie with the latest `client.authStore` state

All [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) instances have 2 helper methods that
should make working with cookies a little bit easier:

```js
// update the store with the parsed data from the cookie string
client.authStore.loadFromCookie('pb_auth=...');

// exports the store data as cookie, with option to extend the default SameSite, Secure, HttpOnly, Path and Expires attributes
client.authStore.exportToCookie({ httpOnly: false }); // Output: 'pb_auth=...'
```

Below you could find several examples:

<details>
  <summary><strong>SvelteKit</strong></summary>

One way to integrate with SvelteKit SSR could be to create the PocketBase client in a [hook handle](https://kit.svelte.dev/docs/hooks#handle)
and pass it to the other server-side actions using the `event.locals`.

```js
// src/hooks.js
import PocketBase from 'pocketbase';

export async function handle({ event, resolve }) {
    event.locals.pocketbase = new PocketBase("http://127.0.0.1:8090");

    // load the store data from the request cookie string
    event.locals.pocketbase.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

    const response = await resolve(event);

    // send back the default 'pb_auth' cookie to the client with the latest store state
    response.headers.set('set-cookie', event.locals.pocketbase.authStore.exportToCookie());

    return response;
}
```

And then, in some of your server-side actions, you could directly access the previously created `event.locals.pocketbase` instance:

```js
// src/routes/login/+server.js
//
// creates a `POST /login` server-side endpoint
export function POST({ request, locals }) {
    const { email, password } = await request.json();

    const { token, user } = await locals.pocketbase.users.authViaEmail(email, password);

    return new Response('Success...');
}
```
</details>

<details>
  <summary><strong>Nuxt 3</strong></summary>

One way to integrate with Nuxt 3 SSR could be to create the PocketBase client in a [nuxt plugin](https://v3.nuxtjs.org/guide/directory-structure/plugins)
and provide it as a helper to the `nuxtApp` instance:

```js
// plugins/pocketbase.js
import PocketBase from 'pocketbase';

export default defineNuxtPlugin((nuxtApp) => {
  return {
    provide: {
      pocketbase: () => {
        const client = new PocketBase('http://127.0.0.1:8090');

        // load the store data from the request cookie string
        client.authStore.loadFromCookie(nuxtApp.ssrContext?.event?.req?.headers?.cookie || '');

        // send back the default 'pb_auth' cookie to the client with the latest store state
        client.authStore.onChange(() => {
          if (nuxtApp.ssrContext?.event?.res) {
            nuxtApp.ssrContext.event.res.setHeader('set-cookie', client.authStore.exportToCookie());
          }
        });

        return client;
      }
    }
  }
});
```

And then in your component you could access it like this:

```html
<template>
  <div>
    Show: {{ data }}
  </div>
</template>

<script setup>
  const { data } = await useAsyncData(async (nuxtApp) => {
    const client = nuxtApp.$pocketbase();

    // fetch and return all "demo" records...
    return await client.records.getFullList('demo');
  })
</script>
```

> For Nuxt 2 you could use similar approach, but instead of `nuxtApp` you could use a store state to store/create the local `PocketBase` instance.
</details>

<details>
  <summary><strong>Next.js</strong></summary>

Next.js doesn't seem to have a central place where you can read/modify the server request and response.
[There is support for middlewares](https://nextjs.org/docs/advanced-features/middleware),
but they are very limited and, at the time of writing, you can't pass data from a middleware to the `getServerSideProps` functions (https://github.com/vercel/next.js/discussions/31792).

One way to integrate with Next.js SSR could be to create a custom `PocketBase` instance in each of your `getServerSideProps`:

```jsx
import PocketBase, { BaseAuthStore } from 'pocketbase';

class NextAuthStore extends BaseAuthStore {
  constructor(req, res) {
    super();

    this.req = req;
    this.res = res;

    this.loadFromCookie(this.req?.headers?.cookie);
  }

  save(token, model) {
    super.save(token, model);

    this.res?.setHeader('set-cookie', this.exportToCookie());
  }

  clear() {
    super.clear();

    this.res?.setHeader('set-cookie', this.exportToCookie());
  }
}

export async function getServerSideProps({ req, res }) {
  const client = new PocketBase("http://127.0.0.1:8090");
  client.authStore = new NextAuthStore(req, res);

  // fetch example records...
  const result = await client.records.getList("example", 1, 30);

  return {
    props: {
      // ...
    },
  }
}

export default function Home() {
  return (
    <div>Hello world!</div>
  )
}
```
</details>

### Security

The most common frontend related vulnerability is XSS (and CSRF when dealing with cookies).
Fortunately, modern browsers can detect and mitigate most of this type of attacks if [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) is provided.

**To prevent a malicious user or 3rd party script to steal your PocketBase auth token, it is recommended to configure a basic CSP for your application (either as `meta` tag or HTTP header).**

This is out of the scope of the SDK, but you could find more resources about CSP at:

- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- https://content-security-policy.com


## Definitions

### Creating new client instance

```js
const client = new PocketBase(
    baseUrl = '/',
    lang = 'en-US',
    authStore = LocalAuthStore
);
```

### Instance methods

> Each instance method returns the `PocketBase` instance allowing chaining.

| Method                                  | Description                                                         |
|:----------------------------------------|:--------------------------------------------------------------------|
| `client.send(path, reqConfig = {})`     | Sends an api http request.                                          |
| `client.cancelAllRequests()`            | Cancels all pending requests.                                       |
| `client.cancelRequest(cancelKey)`       | Cancels single request by its cancellation token key.               |
| `client.buildUrl(path, reqConfig = {})` | Builds a full client url by safely concatenating the provided path. |


### API services

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
| 🔐`client.admins.delete(id, queryParams = {})`                                                                                                                                                     | Deletes an existing admin by its id.                                                                  |
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
| 🔐`client.users.delete(id, queryParams = {})`                                                                                                                                                      | Deletes an existing user by its id.                                                                   |
| 🔐`client.users.listExternalAuths(id, queryParams = {})`                                                                                                                                           | Lists all linked external auth providers for the specified user.                                      |
| 🔐`client.users.unlinkExternalAuth(id, provider, queryParams = {})`                                                                                                                                | Unlink a single external auth provider from the specified user.                                       |
| **[Realtime](https://pocketbase.io/docs/api-realtime)** <br/> _(for node environments you'll have to install an EventSource polyfill beforehand, eg. https://github.com/EventSource/eventsource)_ |                                                                                                       |
| 🔓`client.realtime.subscribe(subscription, callback)`                                                                                                                                              | Inits the sse connection (if not already) and register the subscription.                              |
| 🔓`client.realtime.unsubscribe(subscription = "")`                                                                                                                                                 | Unsubscribe from a subscription (if empty - unsubscribe from all registered subscriptions).           |
| **[Collections](https://pocketbase.io/docs/api-collections)**                                                                                                                                     |                                                                                                       |
| 🔐`client.collections.getList(page = 1, perPage = 30, queryParams = {})`                                                                                                                           | Returns paginated collections list.                                                                   |
| 🔐`client.collections.getFullList(batchSize = 100, queryParams = {})`                                                                                                                              | Returns a list with all collections batch fetched at once.                                            |
| 🔐`client.collections.getOne(id, queryParams = {})`                                                                                                                                                | Returns single collection by its id.                                                                  |
| 🔐`client.collections.create(bodyParams = {}, queryParams = {})`                                                                                                                                   | Creates a new collection.                                                                             |
| 🔐`client.collections.update(id, bodyParams = {}, queryParams = {})`                                                                                                                               | Updates an existing collection by its id.                                                             |
| 🔐`client.collections.delete(id, queryParams = {})`                                                                                                                                                | Deletes an existing collection by its id.                                                             |
| 🔐`client.collections.import(collections, deleteMissing = false, queryParams = {})`                                                                                                                | Imports the provided collections.                                                                     |
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
| 🔐`client.settings.testS3(queryParams = {})`                                                                                                                                                       | Performs a S3 storage connection test.                                                                |
| 🔐`client.settings.testEmail(toEmail, emailTemplate, queryParams = {})`                                                                                                                            | Sends a test email.                                                                                   |


## Development
```sh
# run unit tests
npm test

# build and minify for production
npm run build
```
