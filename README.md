PocketBase JavaScript SDK
======================================================================

Official JavaScript SDK (browser and node) for interacting with the [PocketBase API](https://pocketbase.io/docs).

- [Installation](#installation)
- [Usage](#usage)
- [Caveats](#caveats)
    - [File upload](#file-upload)
    - [Error handling](#error-handling)
    - [AuthStore](#authstore)
    - [Auto cancellation](#auto-cancellation)
    - [Custom Record types](#custom-record-types)
    - [Send hooks](#send-hooks)
    - [SSR integration](#ssr-integration)
    - [Security](#security)
- [Definitions](#definitions)
- [Development](#development)


## Installation

### Browser (manually via script tag)

```html
<script src="/path/to/dist/pocketbase.umd.js"></script>
<script type="text/javascript">
    const pb = new PocketBase("https://example.com")
    ...
</script>
```

_OR if you are using ES modules:_
```html
<script type="module">
    import PocketBase from '/path/to/dist/pocketbase.es.mjs'

    const pb = new PocketBase("https://example.com")
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
> import 'cross-fetch/polyfill';
> ```
---
> 🔧 Node doesn't have native `EventSource` implementation, so in order to use the realtime subscriptions you'll need to load a `EventSource` polyfill.
> ```js
> // for server: npm install eventsource --save
> import eventsource from 'eventsource';
>
> // for React Native: npm install react-native-sse --save
> import eventsource from "react-native-sse";
>
> global.EventSource = eventsource;
> ```


## Usage

```js
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

...

// list and filter "example" collection records
const result = await pb.collection('example').getList(1, 20, {
    filter: 'status = true && created > "2022-08-01 10:00:00"'
});

// authenticate as auth collection record
const userData = await pb.collection('users').authWithPassword('test@example.com', '123456');

// or as super-admin
const adminData = await pb.admins.authWithPassword('test@example.com', '123456');

// and much more...
```
> More detailed API docs and copy-paste examples could be found in the [API documentation for each service](https://pocketbase.io/docs/api-records/).


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

const pb = new PocketBase('http://127.0.0.1:8090');

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
const createdRecord = await pb.collection('example').create(formData);
```

### Error handling

All services return a standard [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-based response, so the error handling is straightforward:
```js
pb.collection('example').getList(1, 50).then((result) {
  // success...
  console.log('Result:', result);
}).catch((error) {
  // error...
  console.log('Error:', error);
});

// OR if you are using the async/await syntax:
try {
  const result = await pb.collection('example').getList(1, 50);
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
    response:      { ... },    // the API JSON error response
    isAbort:       boolean,    // is abort/cancellation error
    originalError: Error|null, // the original non-normalized error
}
```

### AuthStore

The SDK keeps track of the authenticated token and auth model for you via the `pb.authStore` instance.

The default [`LocalAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/LocalAuthStore.ts) uses the browser's `LocalStorage` if available, otherwise - will fallback to runtime/memory (aka. on page refresh or service restart you'll have to authenticate again).

The default `pb.authStore` extends [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and has the following public members that you can use:

```js
BaseAuthStore {
    // base fields
    token:   string            // the authenticated token
    model:   Record|Admin|null // the authenticated Record or Admin model
    isValid: boolean           // checks if the store has existing and unexpired token

    // main methods
    clear()            // "logout" the authenticated Record or Admin
    save(token, model) // update the store with the new auth data
    onChange(callback, fireImmediately = false) // register a callback that will be called on store change

    // cookie parse and serialize helpers
    loadFromCookie(cookieHeader, key = 'pb_auth')
    exportToCookie(options = {}, key = 'pb_auth')
}
```

To _"logout"_ an authenticated Record or Admin, you can just call `pb.authStore.clear()`.

To _"listen"_ for changes in the auth store, you can register a new listener via `pb.authStore.onChange`, eg:
```js
// triggered everytime on store change
const removeListener1 = pb.authStore.onChange((token, model) => {
    console.log('New store data 1:', token, model)
});

// triggered once right after registration and everytime on store change
const removeListener2 = pb.authStore.onChange((token, model) => {
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

const pb = new PocketBase('http://127.0.0.1:8090', new CustomAuthStore());
```

### Auto cancellation

The SDK client will auto cancel duplicated pending requests for you.
For example, if you have the following 3 duplicated endpoint calls, only the last one will be executed, while the first 2 will be cancelled with `ClientResponseError` error:

```js
pb.collection('example').getList(1, 20) // cancelled
pb.collection('example').getList(2, 20) // cancelled
pb.collection('example').getList(3, 20) // executed
```

To change this behavior, you could make use of 2 special query parameters:

- `$autoCancel ` - set it to `false` to disable auto cancellation for this request
- `$cancelKey` - set it to a string that will be used as request identifier and based on which pending requests will be matched (default to `HTTP_METHOD + path`, eg. "GET /api/users")

Example:

```js
pb.collection('example').getList(1, 20);                           // cancelled
pb.collection('example').getList(1, 20);                           // executed
pb.collection('example').getList(1, 20, { '$cancelKey': "test" })  // cancelled
pb.collection('example').getList(1, 20, { '$cancelKey': "test" })  // executed
pb.collection('example').getList(1, 20, { '$autoCancel': false }); // executed
pb.collection('example').getList(1, 20, { '$autoCancel': false })  // executed

// globally disable auto cancellation
pb.autoCancellation(false);

pb.collection('example').getList(1, 20); // executed
pb.collection('example').getList(1, 20); // executed
pb.collection('example').getList(1, 20); // executed
```

**If you want to completelly disable the auto cancellation behavior, you could set `pb.autoCancellation(false)`.**

To manually cancel pending requests, you could use `pb.cancelAllRequests()` or `pb.cancelRequest(cancelKey)`.


### Custom Record types

You could specify custom TypeScript definitions for your Record models using generics:

```ts
interface Task {
  // type the collection fields you want to use...
  id:   string;
  name: string;
}

pb.collection('tasks').getList<Task>(1, 20) // -> results in Promise<ListResult<Task>>
pb.collection('tasks').getOne<Task>("RECORD_ID")  // -> results in Promise<Task>
```

### Send hooks

Sometimes you may want to modify the request data or to customize the response.

To accomplish this, the SDK provides 2 function hooks:

- `beforeSend` - triggered right before sending the `fetch` request, allowing you to inspect/modify the request config.
    ```js
    const pb = new PocketBase('http://127.0.0.1:8090');

    pb.beforeSend = function (url, options) {
        // For list of the possible request options properties check
        // https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
        options.headers = Object.assign({}, options.headers, {
            'X-Custom-Header': 'example',
        });

        return { url, options };
    };
    ```

- `afterSend` - triggered after successfully sending the `fetch` request, allowing you to inspect/modify the response object and its parsed data.
    ```js
    const pb = new PocketBase('http://127.0.0.1:8090');

    pb.afterSend = function (response, data) {
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
2. "Load/Feed" your `pb.authStore` with data from the request cookie
3. Perform your application server-side actions
4. Before returning the response to the client, update the cookie with the latest `pb.authStore` state

All [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) instances have 2 helper methods that
should make working with cookies a little bit easier:

```js
// update the store with the parsed data from the cookie string
pb.authStore.loadFromCookie('pb_auth=...');

// exports the store data as cookie, with option to extend the default SameSite, Secure, HttpOnly, Path and Expires attributes
pb.authStore.exportToCookie({ httpOnly: false }); // Output: 'pb_auth=...'
```

Below you could find several examples:

<details>
  <summary><strong>SvelteKit</strong></summary>

One way to integrate with SvelteKit SSR could be to create the PocketBase client in a [hook handle](https://kit.svelte.dev/docs/hooks#handle)
and pass it to the other server-side actions using the `event.locals`.

```js
// src/hooks.server.js
import PocketBase from 'pocketbase';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    event.locals.pb = new PocketBase("http://127.0.0.1:8090");

    // load the store data from the request cookie string
    event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

    try {
        // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
        event.locals.pb.authStore.isValid && await event.locals.pb.collection('users').authRefresh();
    } catch (_) {
        // clear the auth store on failed refresh
        event.locals.pb.authStore.clear();
    }

    const response = await resolve(event);

    // send back the default 'pb_auth' cookie to the client with the latest store state
    response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie());

    return response;
}
```

And then, in some of your server-side actions, you could directly access the previously created `event.locals.pb` instance:

```js
// src/routes/login/+server.js
/**
 * Creates a `POST /login` server-side endpoint
 *
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
    const { email, password } = await request.json();

    const { token, record } = await locals.pb.collection('users').authWithPassword(email, password);

    return new Response('Success...');
}
```

For proper `locals.pb` type detection, you can also add `PocketBase` in your your global types definition:

```ts
// src/app.d.ts
import PocketBase from "pocketbase";

declare global {
    declare namespace App {
        interface Locals {
            pb: PocketBase
        }
    }
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

export default defineNuxtPlugin(async () => {
  const pb = new PocketBase('http://127.0.0.1:8090');

  const cookie = useCookie("pb_auth", {
    path:     "/",
    secure:   true,
    sameSite: "strict",
    httpOnly: false, // change to "true" if you want only server-side access
    maxAge:   604800,
  })

  // load the store data from the cookie value
  pb.authStore.save(cookie.value?.token, cookie.value?.model);

  // send back the default 'pb_auth' cookie to the client with the latest store state
  pb.authStore.onChange(() => {
    cookie.value = {
      token: pb.authStore.token,
      model: pb.authStore.model,
    };
  });

  try {
      // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
      pb.authStore.isValid && await pb.collection('users').authRefresh();
  } catch (_) {
      // clear the auth store on failed refresh
      pb.authStore.clear();
  }

  return {
    provide: { pb }
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
    // fetch and return all "example" records...
    const records = await nuxtApp.$pb.collection('example').getFullList();

    return structuredClone(records);
  })
</script>
```
</details>

<details>
  <summary><strong>Nuxt 2</strong></summary>

One way to integrate with Nuxt 2 SSR could be to create the PocketBase client in a [nuxt plugin](https://nuxtjs.org/docs/directory-structure/plugins#plugins-directory) and provide it as a helper to the `$root` context:

```js
// plugins/pocketbase.js
import PocketBase from  'pocketbase';

export default async (ctx, inject) => {
  const pb = new PocketBase('http://127.0.0.1:8090');

  // load the store data from the request cookie string
  pb.authStore.loadFromCookie(ctx.req?.headers?.cookie || '');

  // send back the default 'pb_auth' cookie to the client with the latest store state
  pb.authStore.onChange(() => {
    ctx.res?.setHeader('set-cookie', pb.authStore.exportToCookie());
  });

  try {
      // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
      pb.authStore.isValid && await pb.collection('users').authRefresh();
  } catch (_) {
      // clear the auth store on failed refresh
      pb.authStore.clear();
  }

  inject('pocketbase', pb);
};
```

And then in your component you could access it like this:

```html
<template>
  <div>
    Show: {{ items }}
  </div>
</template>

<script>
  export default {
    async asyncData({ $pocketbase }) {
      // fetch and return all "example" records...
      const items = await $pocketbase.collection('example').getFullList();

      return { items }
    }
  }
</script>
```
</details>

<details>
  <summary><strong>Next.js</strong></summary>

Next.js doesn't seem to have a central place where you can read/modify the server request and response.
[There is support for middlewares](https://nextjs.org/docs/advanced-features/middleware),
but they are very limited and, at the time of writing, you can't pass data from a middleware to the `getServerSideProps` functions (https://github.com/vercel/next.js/discussions/31792).

One way to integrate with Next.js SSR could be to create a custom `PocketBase` instance in each of your `getServerSideProps`:

```jsx
import PocketBase from 'pocketbase';

// you can place this helper in a separate file so that it can be reused
async function initPocketBase(req, res) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  // load the store data from the request cookie string
  pb.authStore.loadFromCookie(req?.headers?.cookie || '');

  // send back the default 'pb_auth' cookie to the client with the latest store state
  pb.authStore.onChange(() => {
    res?.setHeader('set-cookie', pb.authStore.exportToCookie());
  });

  try {
      // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
      pb.authStore.isValid && await pb.collection('users').authRefresh();
  } catch (_) {
      // clear the auth store on failed refresh
      pb.authStore.clear();
  }

  return pb
}

export async function getServerSideProps({ req, res }) {
  const pb = await initPocketBase(req, res)

  // fetch example records...
  const result = await pb.collection('example').getList(1, 30);

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
const pb = new PocketBase(baseUrl = '/', authStore = LocalAuthStore);
```

### Instance methods

> Each instance method returns the `PocketBase` instance allowing chaining.

| Method                                            | Description                                                                   |
|:--------------------------------------------------|:------------------------------------------------------------------------------|
| `pb.send(path, reqConfig = {})`                   | Sends an api http request.                                                    |
| `pb.autoCancellation(enable)`                     | Globally enable or disable auto cancellation for pending duplicated requests. |
| `pb.cancelAllRequests()`                          | Cancels all pending requests.                                                 |
| `pb.cancelRequest(cancelKey)`                     | Cancels single request by its cancellation token key.                         |
| `pb.buildUrl(path, reqConfig = {})`               | Builds a full client url by safely concatenating the provided path.           |


### Services

> Each service call returns a `Promise` object with the API response.

##### RecordService

###### _Crud handlers_

```js
// Returns a paginated records list.
🔓 pb.collection(collectionIdOrName).getList(page = 1, perPage = 30, queryParams = {});

// Returns a list with all records batch fetched at once
// (by default 200 items per request; to change it set the `batch` query param).
🔓 pb.collection(collectionIdOrName).getFullList(queryParams = {});

// Returns the first found record matching the specified filter.
🔓 pb.collection(collectionIdOrName).getFirstListItem(filter, queryParams = {});

// Returns a single record by its id.
🔓 pb.collection(collectionIdOrName).getOne(recordId, queryParams = {});

// Creates (aka. register) a new record.
🔓 pb.collection(collectionIdOrName).create(bodyParams = {}, queryParams = {});

// Updates an existing record by its id.
🔓 pb.collection(collectionIdOrName).update(recordId, bodyParams = {}, queryParams = {});

// Deletes a single record by its id.
🔓 pb.collection(collectionIdOrName).delete(recordId, queryParams = {});

```

###### _Realtime handlers_

```js
// Subscribe to realtime changes to the specified topic ("*" or recordId).
//
// It is safe to subscribe multiple times to the same topic.
//
// You can use the returned UnsubscribeFunc to remove a single registered subscription.
// If you want to remove all subscriptions related to the topic use unsubscribe(topic).
🔓 pb.collection(collectionIdOrName).subscribe(topic, callback);

// Unsubscribe from all registered subscriptions to the specified topic ("*" or recordId).
// If topic is not set, then it will remove all registered collection subscriptions.
🔓 pb.collection(collectionIdOrName).unsubscribe([topic]);
```

###### _Auth handlers_

> Available only for "auth" type collections.

```js
// Returns all available application auth methods.
🔓 pb.collection(collectionIdOrName).listAuthMethods(queryParams = {});

// Authenticates a record with their username/email and password.
🔓 pb.collection(collectionIdOrName).authWithPassword(usernameOrEmail, password, bodyParams = {}, queryParams = {});

// Authenticates a record with OAuth2 provider without custom redirects, deeplinks or even page reload.
🔓 pb.collection(collectionIdOrName).authWithOAuth2(authConfig);

// Authenticates a record with OAuth2 code.
🔓 pb.collection(collectionIdOrName).authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData = {}, bodyParams = {}, queryParams = {});

// Refreshes the current authenticated record model and auth token.
🔐 pb.collection(collectionIdOrName).authRefresh(bodyParams = {}, queryParams = {});

// Sends a user password reset email.
🔓 pb.collection(collectionIdOrName).requestPasswordReset(email, bodyParams = {}, queryParams = {});

// Confirms a record password reset request.
🔓 pb.collection(collectionIdOrName).confirmPasswordReset(resetToken, newPassword, newPasswordConfirm, bodyParams = {}, queryParams = {});

// Sends a record verification email request.
🔓 pb.collection(collectionIdOrName).requestVerification(email, bodyParams = {}, queryParams = {});

// Confirms a record email verification request.
🔓 pb.collection(collectionIdOrName).confirmVerification(verificationToken, bodyParams = {}, queryParams = {});

// Sends a record email change request to the provider email.
🔐 pb.collection(collectionIdOrName).requestEmailChange(newEmail, bodyParams = {}, queryParams = {});

// Confirms record new email address.
🔓 pb.collection(collectionIdOrName).confirmEmailChange(emailChangeToken, userPassword, bodyParams = {}, queryParams = {});

// Lists all linked external auth providers for the specified record.
🔐 pb.collection(collectionIdOrName).listExternalAuths(recordId, queryParams = {});

// Unlinks a single external auth provider relation from the specified record.
🔐 pb.collection(collectionIdOrName).unlinkExternalAuth(recordId, provider, queryParams = {});
```

---

##### FileService

```js
// Builds and returns an absolute record file url for the provided filename.
🔓 pb.files.getUrl(record, filename, queryParams = {});

// Requests a new private file access token for the current auth model (admin or record).
🔐 pb.files.getToken(queryParams = {});
```

---

##### AdminService

```js
// Authenticates an admin account by its email and password.
🔓 pb.admins.authWithPassword(email, password, bodyParams = {}, queryParams = {});

// Refreshes the current admin authenticated model and token.
🔐 pb.admins.authRefresh(bodyParams = {}, queryParams = {});

// Sends an admin password reset email.
🔓 pb.admins.requestPasswordReset(email, bodyParams = {}, queryParams = {});

// Confirms an admin password reset request.
🔓 pb.admins.confirmPasswordReset(resetToken, newPassword, newPasswordConfirm, bodyParams = {}, queryParams = {});

// Returns a paginated admins list.
🔐 pb.admins.getList(page = 1, perPage = 30, queryParams = {});

// Returns a list with all admins batch fetched at once
// (by default 200 items per request; to change it set the `batch` query param).
🔐 pb.admins.getFullList(queryParams = {});

// Returns the first found admin matching the specified filter.
🔐 pb.admins.getFirstListItem(filter, queryParams = {});

// Returns a single admin by their id.
🔐 pb.admins.getOne(id, queryParams = {});

// Creates a new admin.
🔐 pb.admins.create(bodyParams = {}, queryParams = {});

// Updates an existing admin by their id.
🔐 pb.admins.update(id, bodyParams = {}, queryParams = {});

// Deletes a single admin by their id.
🔐 pb.admins.delete(id, queryParams = {});
```

---

##### CollectionService

```js
// Returns a paginated collections list.
🔐 pb.collections.getList(page = 1, perPage = 30, queryParams = {});

// Returns a list with all collections batch fetched at once
// (by default 200 items per request; to change it set the `batch` query param).
🔐 pb.collections.getFullList(queryParams = {});

// Returns the first found collection matching the specified filter.
🔐 pb.collections.getFirstListItem(filter, queryParams = {});

// Returns a single collection by its id.
🔐 pb.collections.getOne(id, queryParams = {});

// Creates (aka. register) a new collection.
🔐 pb.collections.create(bodyParams = {}, queryParams = {});

// Updates an existing collection by its id.
🔐 pb.collections.update(id, bodyParams = {}, queryParams = {});

// Deletes a single collection by its id.
🔐 pb.collections.delete(id, queryParams = {});

// Imports the provided collections.
🔐 pb.collections.import(collections, deleteMissing = false, queryParams = {});
```

---

##### LogService

```js
// Returns a paginated log requests list.
🔐 pb.logs.getRequestsList(page = 1, perPage = 30, queryParams = {});

// Returns a single log request by its id.
🔐 pb.logs.getRequest(id, queryParams = {});
```

---

##### SettingsService

```js
// Returns a map with all available app settings.
🔐 pb.settings.getAll(queryParams = {});

// Bulk updates app settings.
🔐 pb.settings.update(bodyParams = {}, queryParams = {});

// Performs a S3 storage connection test.
🔐 pb.settings.testS3(filesystem = "storage", queryParams = {});

// Sends a test email (verification, password-reset, email-change).
🔐 pb.settings.testEmail(toEmail, template, queryParams = {});

// Generates a new Apple OAuth2 client secret.
🔐 pb.settings.generateAppleClientSecret(clientId, teamId, keyId, privateKey, duration, bodyParams = {}, queryParams = {});
```

---

##### RealtimeService

> This service is usually used with custom realtime actions.
> For records realtime subscriptions you can use the subscribe/unsubscribe
> methods available in the `pb.collection()` RecordService.

```js
// Initialize the realtime connection (if not already) and register the subscription listener.
🔓 pb.realtime.subscribe(topic, callback);

// Unsubscribe from all subscription listeners with the specified topic.
🔓 pb.realtime.unsubscribe(topic?);

// Unsubscribe from all subscription listeners starting with the specified topic prefix.
🔓 pb.realtime.unsubscribeByPrefix(topicPrefix);

// Unsubscribe from all subscriptions matching the specified topic and listener function.
🔓 pb.realtime.unsubscribeByTopicAndListener(topic, callback);
```

---

##### BackupService

```js
// Returns list with all available backup files.
🔐 pb.backups.getFullList(queryParams = {});

// Initializes a new backup.
🔐 pb.backups.create(basename = "", queryParams = {});

// Deletes a single backup by its name.
🔐 pb.backups.delete(key, queryParams = {});

// Initializes an app data restore from an existing backup.
🔐 pb.backups.restore(key, queryParams = {});

// Builds a download url for a single existing backup using an
// admin file token and the backup file key.
🔐 pb.backups.getDownloadUrl(token, key);
```

---

##### HealthService

```js
// Checks the health status of the api.
🔓 pb.health.check(queryParams = {});
```


## Development
```sh
# run unit tests
npm test

# build and minify for production
npm run build
```
