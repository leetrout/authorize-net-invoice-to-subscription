# Authorize.net webhook transformer

This code transforms an Authorize.net payload to include a new
property `subscriptionIds`.

It does not filter on supported events but only considers the
`entityName` which can be `subscription` or `transaction`.

Not all transaction events may work.

Example input:

```json
{
  "notificationId": "01f00be0-2e...320744ebe2",
  "eventType": "net.authorize.payment.authcapture.created",
  "eventDate": "2022-06-27T22:29:35.137562Z",
  "webhookId": "8f2d...a38",
  "payload": {
    "responseCode": 1,
    "authCode": "...",
    "avsResponse": "Y",
    "authAmount": 14.25,
    "entityName": "transaction",
    "id": "400...53"
  }
}
```

Example output:

```json
{
  "notificationId": "01f00be0-2e...320744ebe2",
  "eventType": "net.authorize.payment.authcapture.created",
  "eventDate": "2022-06-27T22:29:35.137562Z",
  "webhookId": "8f2d...a38",
  "payload": {
    "responseCode": 1,
    "authCode": "...",
    "avsResponse": "Y",
    "authAmount": 14.25,
    "entityName": "transaction",
    "id": "400...53"
  }
  "subscriptionIds": [ "1234" ]
}
```

## Development

This repo is configured to support developing as a Google Cloud Function.

```
npm start
```


## Deployment

TODO
