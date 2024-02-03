import Client from "@/Client";
import { isTokenExpired } from "@/stores/utils/jwt";

// reset previous auto refresh registrations
export function resetAutoRefresh(client: Client) {
    (client as any)._resetAutoRefresh?.();
}

export function registerAutoRefresh(
    client: Client,
    threshold: number,
    refreshFunc: () => Promise<any>,
    reauthenticateFunc: () => Promise<any>,
) {
    resetAutoRefresh(client);

    const oldBeforeSend = client.beforeSend;
    const oldModel = client.authStore.model;

    // unset the auto refresh in case the auth store was cleared
    // OR a new model was authenticated
    const unsubStoreChange = client.authStore.onChange((newToken, model) => {
        if (
            !newToken ||
            model?.id != oldModel?.id ||
            // check the collection id in case an admin and auth record share the same id
            ((model?.collectionId || oldModel?.collectionId) &&
                model?.collectionId != oldModel?.collectionId)
        ) {
            resetAutoRefresh(client);
        }
    });

    // initialize a reset function and attach it dynamically to the client
    (client as any)._resetAutoRefresh = function () {
        unsubStoreChange();
        client.beforeSend = oldBeforeSend;
        delete (client as any)._resetAutoRefresh;
    };

    client.beforeSend = async (url, sendOptions) => {
        const oldToken = client.authStore.token;

        if (sendOptions.query?.autoRefresh) {
            return oldBeforeSend ? oldBeforeSend(url, sendOptions) : { url, sendOptions };
        }

        let isValid = client.authStore.isValid;
        if (
            // is loosely valid
            isValid &&
            // but it is going to expire in the next "threshold" seconds
            isTokenExpired(client.authStore.token, threshold)
        ) {
            try {
                await refreshFunc();
            } catch (_) {
                isValid = false;
            }
        }

        // still invalid -> reauthenticate
        if (!isValid) {
            await reauthenticateFunc();
        }

        // the request wasn't sent with a custom token
        const headers = sendOptions.headers || {};
        for (let key in headers) {
            if (
                key.toLowerCase() == "authorization" &&
                // the request wasn't sent with a custom token
                oldToken == headers[key] &&
                client.authStore.token
            ) {
                // set the latest store token
                headers[key] = client.authStore.token;
                break;
            }
        }
        sendOptions.headers = headers;

        return oldBeforeSend ? oldBeforeSend(url, sendOptions) : { url, sendOptions };
    };
}
