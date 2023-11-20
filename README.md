# Composable Local Hybrid Dev Server

This repo contains sample Node.js app that can be used to develop and test hybrid deployment shopper flows across PWA Kit and SFRA/SiteGenesis.

This server is a reverse proxy that forward requests to two origins:

1. Remote origin (usually this is your SFRA or SiteGenesis site)
2. Local origin (usually this is your local PWA dev server)

It serves two sites under the same domain locally and enables developers to test hybrid deployment shopper flows.

## Get started

### Prerequisite
- Node.js ^14.x

### Installation
```sh
git clone git@github.com:SalesforceCommerceCloud/composable-hybrid-dev-server.git && cd composable-hybrid-dev-server
npm install
```

### Update configuration

Open [routes.js](routes.js) and change the following variable:

`routes` - Add all PWA routes:
```javascript
const routes = [
    { path: "/login" },
    { path: "/registration" },
    { path: "/reset-password" },
    { path: "/account" },
    { path: "/account/orders" },
    { path: "/account/orders/:orderNo" },
    { path: "/account/wishlist" },
    { path: "/product/:productId" },
    { path: "/search" },
    { path: "/category/:categoryId" }
];
```

### Setup Your .env File
- Rename the example file [sample.env](sample.env) to `.env` in the root of the repository:
```sh
cp sample.env .env
```

- Open the `.env` file and edit the following information. Please update these values to reflect your sandbox environment's configuration properties.

```
######################################################################
# http-proxy-middleware Configuration Properties
######################################################################
PORT=8001
PROXY_ORIGIN=http://localhost:${PORT}
SFCC_ORIGIN=https://abcd-001.dx.commercecloud.salesforce.com
PWA_ORIGIN=https://your-app-name.mobify-storefront.com
PREPEND_LOCALE_TO_PATH=true
PREPEND_SITEID_TO_PATH=true

# OPTIONAL: If you want to use the same proxy for multiple environments. Value should be "hostname" or "cookie"
# MULTI_ENV_SOURCE=hostname
```
The following table describes each of the .env file variables that are leveraged.
| Property Name             | Description                                                                                         |
|---------------------------|-----------------------------------------------------------------------------------------------------|
| PORT                      | Proxy Port (ex: `8001`)                                                                             |
| PROXY_ORIGIN              | The proxy endpoint (ex: `http://localhost:${PORT}` or `https://your-app-name.herokuapp.com`         |
| SFCC_ORIGIN               | The SFCC instance URL (ex: `https://abcd-001.dx.commercecloud.salesforce.com`)                      |
| PWA_ORIGIN                | The PWA instance URL (ex: `http://localhost:3000` or `https://your-app-name.mobify-storefront.com`) |
| PREPEND_LOCALE_TO_PATH    | Should the routes include locale in the mapping (ex: `/en_US/`)                                     |
| PREPEND_SITEID_TO_PATH    | Should the routes include Site ID in the mapping (ex: `/RefArch/`)                                  |
| MULTI_ENV_SOURCE          | Optional: If you want to use the same proxy for multiple environments. Value should be `hostname` or `cookie` (see below) |
| MRT_RULE_#                | Optional: Numbered rules that map to PWA using MRT rules (see below)                                          |

### (optional) MRT Rules

If at least 1 `MRT_RULE_#` env variable is provided these will be used instead of the hardcoded routes in `routes.js` to
determine which routes should be proxied to the PWA origin. Each `MRT_RULE_#` environment var should be in the form of
the rule expression. See [createMrtRules](https://developer.salesforce.com/docs/commerce/commerce-api/references/cdn-api-process-apis?meta=createMrtRules)

```
# Direct requests for anything that doesn't look like a SFCC sandbox to pwa-kit
MRT_RULE_1='(http.host eq "localhost" and not
    http.request.uri.path matches "^/on/"
    and not http.request.uri.path matches "^/s/")'

# or Direct requests specifically meant for pwa-kit explicitly
MRT_RULE_1='(http.host eq "localhost" and (
    http.request.uri.path eq "/" or
    http.request.uri.path matches "^/callback" or
    http.request.uri.path matches "^/mobify" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/login" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/reset-password" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/registration" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/account" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/account/orders" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/account/orders/(\\w+)" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/account/wishlist" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/product/(\\w+)" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/search" or
    http.request.uri.path matches "^/(\\w+)/([-\\w]+)/category/(\\w+)"))'
```

Note: `http.host` **is** matched, so it's recommended to use `localhost` as the host or omit the check entirely for local development as this will match the proxy origin (localhost in dev, etc.)

### (optional) Multi-Environment Support
If you want to use the same proxy for multiple SFCC environments, you can set the `MULTI_ENV_SOURCE` environment variable to [`hostname`](#multi-environment-support--hostname) or [`cookie`](#multi-environment-support--cookie). This will allow you to use the same proxy for multiple environments.

The proxy will use the hostname or cookie value to dynamically fetch the target from environment variables. See examples below.

#### Multi-Environment Support : Hostname
```text
MULTI_ENV_SOURCE=hostname
```
Configure a CNAME for each environment you want to proxy to. The first part of the hostname will be used to determine which environment to proxy to. For example, if you have the following CNAMEs:

| CNAME                     | KEY           | ENV VARIABLES                                                                                                                                                                                                                                                                                       |
|---------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `sfra.example.com`        | `SFRA`        | `PROXY_ORIGIN_SFRA`=`https://sfra.example.com`<br/>`PWA_ORIGIN_SFRA`=`https://hybrid-sfra.mobify-storefront.com`<br/>`SFCC_ORIGIN_SFRA`=`https://abcd-001.dx.commercecloud.salesforce.com`<br/>`SFRA_MRT_RULE_1`=rule1<br/>`SFRA_MRT_RULE_2`=rule2                                                  |
| `sitegenesis.example.com` | `SITEGENESIS` | `PROXY_ORIGIN_SITEGENESIS`=`https://sitegenesis.example.com`<br/>`PWA_ORIGIN_SITEGENESIS`=`https://hybrid-sitegenesis.mobify-storefront.com`<br/>`SFCC_ORIGIN_SITEGENESIS`=`https://abcd-002.dx.commercecloud.salesforce.com`<br/>`SITEGENESIS_MRT_RULE_1`=rule1<br/>`SITEGENESIS_MRT_RULE_2`=rule2 |                                         |

#### Multi-Environment Support : Cookie
```text
MULTI_ENV_SOURCE=cookie
```
In the browser, add a cookie named `cc-env`. The cookie value will be used to determine which environment to proxy to. When using the cookie option, the default `PROXY_ORIGIN` is assumed.  For example, if you have the following `cc-env` value:

| COOKIE VALUE | KEY       | ENV VARIABLES                                                                                                                                                                                                   |
|--------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ABCD001`    | `ABCD001` | `PWA_ORIGIN_ABCD001`=`https://example-abcd001.mobify-storefront.com`<br/>`SFCC_ORIGIN_ABCD001`=`https://abcd-001.dx.commercecloud.salesforce.com`<br/>`ABCD001_MRT_RULE_1`=rule1<br/>`ABCD001_MRT_RULE_2`=rule2 |
| `ABCD002`    | `ABCD002` | `PWA_ORIGIN_ABCD002`=`https://example-abcd002.mobify-storefront.com`<br/>`SFCC_ORIGIN_ABCD002`=`https://abcd-002.dx.commercecloud.salesforce.com`<br/>`ABCD002_MRT_RULE_1`=rule1<br/>`ABCD002_MRT_RULE_2`=rule2 |                                                               

### Run the server
You need to make sure you have the PWA local development server running on another terminal tab.
```sh
npm start

# output: Proxy server listening: http://localhost:8001
```

Then open browser http://localhost:8001, you should have both the SFRA/SiteGenesis and PWA sites running on the same domain.

## Deploy to Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://dashboard.heroku.com/new-app?template=https://github.com/sandragolden/composable-hybrid-dev-server)

> :zap: When deploying to Heroku, don't forget to add your Heroku App URL as a `redirectUri` on your SLAS Client:
> ```json 
> "redirectUri": [
>    "https://your-app-name.herokuapp.com/callback"
> ]
> ```

## License

Licensed under the current NDA and licensing agreement in place with your organization. (This is explicitly **not** open source licensing.)

## Support

**This project should not be treated as Salesforce Product.** It is an example implementation of a reverse proxy to be used for local development of a hybrid composable storefront. Customers and partners implement this at-will with no expectation of roadmap, technical support,
defect resolution, production-style SLAs.

This project is maintained by the **Salesforce Community**. Salesforce Commerce Cloud or Salesforce Platform Technical
Support do not support this project or its setup.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

For feature requests or bugs, please open a [GitHub issue](https://github.com/SalesforceCommerceCloud/composable-hybrid-dev-server/issues). 
