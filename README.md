PocketBase JavaScript SDK
======================================================================

Official JavaScript SDK (browser and node) for interacting with the [PocketBase API](https://pocketbase.io/docs).

- [Installation](#installation)
- [Usage](#usage)
- [Caveats](#caveats)
    - [Binding filter parameters](#binding-filter-parameters)
    - [File upload](#file-upload)
    - [Error handling](#error-handling)
    - [Auth store](#auth-store)
        - [LocalAuthStore (default)](#localauthstore-default)
        - [AsyncAuthStore (_usually used with React Native_)](#asyncauthstore)
        - [Custom auth store](#custom-auth-store)
        - [Common auth store fields and methods](#common-auth-store-fields-and-methods)
    - [Auto cancellation](#auto-cancellation)
    - [Specify TypeScript definitions](#specify-typescript-definitions)
    - [Custom request options](#custom-request-options)
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

### Binding filter parameters

The SDK comes with a helper `pb.filter(expr, params)` method to generate a filter string with placeholder parameters (`{:paramName}`) populated from an object.

**This method is also recommended when using the SDK in Node/Deno/Bun server-side list queries and accepting untrusted user input as `filter` string arguments, because it will take care to properly escape the generated string expression, avoiding eventual string injection attacks** (_on the client-side this is not much of an issue_).

```js
const records = await pb.collection("example").getList(1, 20, {
  // the same as: "title ~ 'te\\'st' && (totalA = 123 || totalB = 123)"
  filter: pb.filter("title ~ {:title} && (totalA = {:num} || totalB = {:num})", { title: "te'st", num: 123 })
})
```

The supported placeholder parameter values are:

- `string` (_single quotes are autoescaped_)
- `number`
- `boolean`
- `Date` object (_will be stringified into the format expected by PocketBase_)
- `null`
- everything else is converted to a string using `JSON.stringify()`


### File upload

PocketBase Web API supports file upload via `multipart/form-data` requests,
which means that to upload a file it is enough to provide either a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) instance OR plain object with `File`/`Blob` prop values.

- Using `FormData` as body:
    ```js
    // the standard way to create multipart/form-data body
    const data = new FormData();
    data.set('title', 'lorem ipsum...')
    data.set('document', new File(...))

    await pb.collection('example').create(data);
    ```

- Using plain object as body _(this is the same as above and it will be converted to `FormData` behind the scenes)_:
    ```js
    const data = {
      'title':    'lorem ipsum...',
      'document': new File(...),
    };

    await pb.collection('example').create(data);
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

### Auth store

The SDK keeps track of the authenticated token and auth model for you via the `pb.authStore` instance.

##### LocalAuthStore (default)

The default [`LocalAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/LocalAuthStore.ts) uses the browser's `LocalStorage` if available, otherwise - will fallback to runtime/memory (aka. on page refresh or service restart you'll have to authenticate again).

Conveniently, the default store also takes care to automatically sync the auth store state between multiple tabs.

> _**NB!** Deno also supports `LocalStorage` but keep in mind that, unlike in browsers where the client is the only user, by default Deno `LocalStorage` will be shared by all clients making requests to your server!_

##### AsyncAuthStore

The SDK comes also with a helper [`AsyncAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/AsyncAuthStore.ts) that you can use to integrate with any 3rd party async storage implementation (_usually this is needed when working with React Native_):
```js
import AsyncStorage from '@react-native-async-storage/async-storage';
import PocketBase, { AsyncAuthStore } from 'pocketbase';

const store = new AsyncAuthStore({
    save:    async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
    initial: AsyncStorage.getItem('pb_auth'),
});

const pb = new PocketBase('http://127.0.0.1:8090', store)
```

##### Custom auth store

In some situations it could be easier to create your own custom auth store. For this you can extend [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and pass the new custom instance as constructor argument to the client:

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

##### Common auth store fields and methods

The default `pb.authStore` extends [`BaseAuthStore`](https://github.com/pocketbase/js-sdk/blob/master/src/stores/BaseAuthStore.ts) and has the following public members that you can use:

```js
BaseAuthStore {
    // base fields
    model:        RecordModel|AdminModel|null // the authenticated auth record or admin model
    token:        string // the authenticated token
    isValid:      boolean // checks if the store has existing and unexpired token
    isAdmin:      boolean // checks if the store state is for admin
    isAuthRecord: boolean // checks if the store state is for an auth record

    // main methods
    clear()            // "logout" the authenticated record or admin model
    save(token, model) // update the store with the new auth data
    onChange(callback, fireImmediately = false) // register a callback that will be called on store change

    // cookie parse and serialize helpers
    loadFromCookie(cookieHeader, key = 'pb_auth')
    exportToCookie(options = {}, key = 'pb_auth')
}
```

To _"logout"_ an authenticated record or admin you can call `pb.authStore.clear()`.

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


### Auto cancellation

The SDK client will auto cancel duplicated pending requests for you.
For example, if you have the following 3 duplicated endpoint calls, only the last one will be executed, while the first 2 will be cancelled with `ClientResponseError` error:

```js
pb.collection('example').getList(1, 20) // cancelled
pb.collection('example').getList(2, 20) // cancelled
pb.collection('example').getList(3, 20) // executed
```

To change this behavior per request basis, you can adjust the `requestKey: null|string` special query parameter.
Set it to `null` to unset the default request identifier and to disable auto cancellation for the specific request.
Or set it to a unique string that will be used as request identifier and based on which pending requests will be matched (default to `HTTP_METHOD + path`, eg. "GET /api/users")

Example:

```js
pb.collection('example').getList(1, 20);                        // cancelled
pb.collection('example').getList(1, 20);                        // executed
pb.collection('example').getList(1, 20, { requestKey: "test" }) // cancelled
pb.collection('example').getList(1, 20, { requestKey: "test" }) // executed
pb.collection('example').getList(1, 20, { requestKey: null })   // executed
pb.collection('example').getList(1, 20, { requestKey: null })   // executed

// globally disable auto cancellation
pb.autoCancellation(false);

pb.collection('example').getList(1, 20); // executed
pb.collection('example').getList(1, 20); // executed
pb.collection('example').getList(1, 20); // executed
```

**If you want to globally disable the auto cancellation behavior, you could set `pb.autoCancellation(false)`.**

To manually cancel pending requests, you could use `pb.cancelAllRequests()` or `pb.cancelRequest(requestKey)`.


### Specify TypeScript definitions

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

Alternatively, if you don't want to type the generic argument every time you can define a global PocketBase type using type assertion:

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

pb.collection('tasks').getOne("RECORD_ID") // -> results in Promise<Task>
pb.collection('posts').getOne("RECORD_ID") // -> results in Promise<Post>
```


### Custom request options

All API services accept an optional `options` argument (usually the last one and of type [`SendOptions`](https://github.com/pocketbase/js-sdk/blob/master/src/services/utils/options.ts)), that can be used to provide:

- custom headers for a single request
- custom fetch options
- or even your own `fetch` implementation

For example:

```js
pb.collection('example').getList(1, 20, {
    expand:          'someRel',
    otherQueryParam: '123',

    // custom headers
    headers: {
        'X-Custom-Header': 'example',
    },

    // custom fetch options
    keepalive: false,
    cache:     'no-store',

    // or custom fetch implementation
    fetch: async (url, config) => { ... },
})
```

_Note that for backward compatability and to minimize the verbosity, any "unknown" top-level field will be treated as query parameter._


### Send hooks

Sometimes you may want to modify the request data globally or to customize the response.

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
    event.locals.pb = new PocketBase('http://127.0.0.1:8090');

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
import PocketBase from 'pocketbase';

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
  <summary><strong>Astro</strong></summary>

To integrate with Astro SSR, you could create the PocketBase client in the [Middleware](https://docs.astro.build/en/guides/middleware) and pass it to the Astro components using the `Astro.locals`.

```ts 
// src/middleware/index.ts
import PocketBase from 'pocketbase';

import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async ({ locals, request }: any, next: () => any) => {
    locals.pb = new PocketBase('http://127.0.0.1:8090');

    // load the store data from the request cookie string
    locals.pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

    try {
        // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
        locals.pb.authStore.isValid && await locals.pb.collection('users').authRefresh();
    } catch (_) {
        // clear the auth store on failed refresh
        locals.pb.authStore.clear();
    }

    const response = await next();

    // send back the default 'pb_auth' cookie to the client with the latest store state
    response.headers.append('set-cookie', locals.pb.authStore.exportToCookie());

    return response;
});
```

And then, in your Astro file's component script, you could directly access the previously created `locals.pb` instance:

```ts
// src/pages/index.astro
---
const locals = Astro.locals;

const userAuth = async () => {
    const { token, record } = await locals.pb.collection('users').authWithPassword('test@example.com', '123456');

    return new Response('Success...');
};
---
```

Although middleware functionality is available in both `SSG` and `SSR` projects, you would likely want to handle any sensitive data on the server side. Update your `output` configuration to `'server'`:

```mjs
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
    output: 'server'
});
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

  const cookie = useCookie('pb_auth', {
    path:     '/',
    secure:   true,
    sameSite: 'strict',
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


**Depending on how and where you use the JS SDK, it is also recommended to use the helper `pb.filter(expr, params)` when constructing filter strings with untrusted user input to avoid eventual string injection attacks (see [Binding filter parameters](#binding-filter-parameters)).**


## Definitions

### Creating new client instance

```js
const pb = new PocketBase(baseUrl = '/', authStore = LocalAuthStore);
```

### Instance methods

> Each instance method returns the `PocketBase` instance allowing chaining.

| Method                            | Description                                                                   |
|:----------------------------------|:------------------------------------------------------------------------------|
| `pb.send(path, sendOptions = {})` | Sends an api http request.                                                    |
| `pb.autoCancellation(enable)`     | Globally enable or disable auto cancellation for pending duplicated requests. |
| `pb.cancelAllRequests()`          | Cancels all pending requests.                                                 |
| `pb.cancelRequest(cancelKey)`     | Cancels single request by its cancellation token key.                         |
| `pb.buildUrl(path)`               | Builds a full client url by safely concatenating the provided path.           |


### Services

> Each service call returns a `Promise` object with the API response.

##### RecordService

###### _Crud handlers_

```js
// Returns a paginated records list.
🔓 pb.collection(collectionIdOrName).getList(page = 1, perPage = 30, options = {});

// Returns a list with all records batch fetched at once
// (by default 200 items per request; to change it set the `batch` param).
🔓 pb.collection(collectionIdOrName).getFullList(options = {});

// Returns the first found record matching the specified filter.
🔓 pb.collection(collectionIdOrName).getFirstListItem(filter, options = {});

// Returns a single record by its id.
🔓 pb.collection(collectionIdOrName).getOne(recordId, options = {});

// Creates (aka. register) a new record.
🔓 pb.collection(collectionIdOrName).create(bodyParams = {}, options = {});

// Updates an existing record by its id.
🔓 pb.collection(collectionIdOrName).update(recordId, bodyParams = {}, options = {});

// Deletes a single record by its id.
🔓 pb.collection(collectionIdOrName).delete(recordId, options = {});

```

###### _Realtime handlers_

```js
// Subscribe to realtime changes to the specified topic ("*" or recordId).
//
// It is safe to subscribe multiple times to the same topic.
//
// You can use the returned UnsubscribeFunc to remove a single registered subscription.
// If you want to remove all subscriptions related to the topic use unsubscribe(topic).
🔓 pb.collection(collectionIdOrName).subscribe(topic, callback, options = {});

// Unsubscribe from all registered subscriptions to the specified topic ("*" or recordId).
// If topic is not set, then it will remove all registered collection subscriptions.
🔓 pb.collection(collectionIdOrName).unsubscribe([topic]);
```

###### _Auth handlers_

> Available only for "auth" type collections.

```js
// Returns all available application auth methods.
🔓 pb.collection(collectionIdOrName).listAuthMethods(options = {});

// Authenticates a record with their username/email and password.
🔓 pb.collection(collectionIdOrName).authWithPassword(usernameOrEmail, password, options = {});

// Authenticates a record with OAuth2 provider without custom redirects, deeplinks or even page reload.
🔓 pb.collection(collectionIdOrName).authWithOAuth2(authConfig);

// Authenticates a record with OAuth2 code.
🔓 pb.collection(collectionIdOrName).authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData = {}, options = {});

// Refreshes the current authenticated record model and auth token.
🔐 pb.collection(collectionIdOrName).authRefresh(options = {});

// Sends a user password reset email.
🔓 pb.collection(collectionIdOrName).requestPasswordReset(email, options = {});

// Confirms a record password reset request.
🔓 pb.collection(collectionIdOrName).confirmPasswordReset(resetToken, newPassword, newPasswordConfirm, options = {});

// Sends a record verification email request.
🔓 pb.collection(collectionIdOrName).requestVerification(email, options = {});

// Confirms a record email verification request.
🔓 pb.collection(collectionIdOrName).confirmVerification(verificationToken, options = {});

// Sends a record email change request to the provider email.
🔐 pb.collection(collectionIdOrName).requestEmailChange(newEmail, options = {});

// Confirms record new email address.
🔓 pb.collection(collectionIdOrName).confirmEmailChange(emailChangeToken, userPassword, options = {});

// Lists all linked external auth providers for the specified record.
🔐 pb.collection(collectionIdOrName).listExternalAuths(recordId, options = {});

// Unlinks a single external auth provider relation from the specified record.
🔐 pb.collection(collectionIdOrName).unlinkExternalAuth(recordId, provider, options = {});
```

---

##### FileService

```js
// Builds and returns an absolute record file url for the provided filename.
🔓 pb.files.getUrl(record, filename, options = {});

// Requests a new private file access token for the current auth model (admin or record).
🔐 pb.files.getToken(options = {});
```

---

##### AdminService

```js
// Authenticates an admin account by its email and password.
🔓 pb.admins.authWithPassword(email, password, options = {});

// Refreshes the current admin authenticated model and token.
🔐 pb.admins.authRefresh(options = {});

// Sends an admin password reset email.
🔓 pb.admins.requestPasswordReset(email, options = {});

// Confirms an admin password reset request.
🔓 pb.admins.confirmPasswordReset(resetToken, newPassword, newPasswordConfirm, options = {});

// Returns a paginated admins list.
🔐 pb.admins.getList(page = 1, perPage = 30, options = {});

// Returns a list with all admins batch fetched at once
// (by default 200 items per request; to change it set the `batch` query param).
🔐 pb.admins.getFullList(options = {});

// Returns the first found admin matching the specified filter.
🔐 pb.admins.getFirstListItem(filter, options = {});

// Returns a single admin by their id.
🔐 pb.admins.getOne(id, options = {});

// Creates a new admin.
🔐 pb.admins.create(bodyParams = {}, options = {});

// Updates an existing admin by their id.
🔐 pb.admins.update(id, bodyParams = {}, options = {});

// Deletes a single admin by their id.
🔐 pb.admins.delete(id, options = {});
```

---

##### CollectionService

```js
// Returns a paginated collections list.
🔐 pb.collections.getList(page = 1, perPage = 30, options = {});

// Returns a list with all collections batch fetched at once
// (by default 200 items per request; to change it set the `batch` query param).
🔐 pb.collections.getFullList(options = {});

// Returns the first found collection matching the specified filter.
🔐 pb.collections.getFirstListItem(filter, options = {});

// Returns a single collection by its id.
🔐 pb.collections.getOne(id, options = {});

// Creates (aka. register) a new collection.
🔐 pb.collections.create(bodyParams = {}, options = {});

// Updates an existing collection by its id.
🔐 pb.collections.update(id, bodyParams = {}, options = {});

// Deletes a single collection by its id.
🔐 pb.collections.delete(id, options = {});

// Imports the provided collections.
🔐 pb.collections.import(collections, deleteMissing = false, options = {});
```

---

##### LogService

```js
// Returns a paginated logs list.
🔐 pb.logs.getList(page = 1, perPage = 30, options = {});

// Returns a single log by its id.
🔐 pb.logs.getOne(id, options = {});

// Returns logs statistics.
🔐 pb.logs.getStats(options = {});
```

---

##### SettingsService

```js
// Returns a map with all available app settings.
🔐 pb.settings.getAll(options = {});

// Bulk updates app settings.
🔐 pb.settings.update(bodyParams = {}, options = {});

// Performs a S3 storage connection test.
🔐 pb.settings.testS3(filesystem = "storage", options = {});

// Sends a test email (verification, password-reset, email-change).
🔐 pb.settings.testEmail(toEmail, template, options = {});

// Generates a new Apple OAuth2 client secret.
🔐 pb.settings.generateAppleClientSecret(clientId, teamId, keyId, privateKey, duration, options = {});
```

---

##### RealtimeService

> This service is usually used with custom realtime actions.
> For records realtime subscriptions you can use the subscribe/unsubscribe
> methods available in the `pb.collection()` RecordService.

```js
// Initialize the realtime connection (if not already) and register the subscription listener.
//
// You can subscribe to the `PB_CONNECT` event if you want to listen to the realtime connection connect/reconnect events.
🔓 pb.realtime.subscribe(topic, callback, options = {});

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
🔐 pb.backups.getFullList(options = {});

// Initializes a new backup.
🔐 pb.backups.create(basename = "", options = {});

// Upload an existing app data backup.
🔐 pb.backups.upload({ file: File/Blob }, options = {});

// Deletes a single backup by its name.
🔐 pb.backups.delete(key, options = {});

// Initializes an app data restore from an existing backup.
🔐 pb.backups.restore(key, options = {});

// Builds a download url for a single existing backup using an
// admin file token and the backup file key.
🔐 pb.backups.getDownloadUrl(token, key);
```

---

##### HealthService

```js
// Checks the health status of the api.
🔓 pb.health.check(options = {});
```


## Development
```sh
# run unit tests
npm test

# run prettier
npm run format

# build and minify for production
npm run build
```
