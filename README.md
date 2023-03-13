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
git clone git@github.com:SalesforceCommerceCloud/composable-hybrid-dev-server.git
cd composable-hybrid-dev-server
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
```
The following table describes each of the B2C Commerce specific .env file variables that are leveraged by b2c-crm-sync's build and deployment tools.
| Property Name             | Description                                                                                         |
|---------------------------|-----------------------------------------------------------------------------------------------------|
| PORT                      | Proxy Port (ex: `8001`)                                                                             |
| PROXY_ORIGIN              | The proxy endpoint (ex: `http://localhost:${PORT}` or `https://your-app-name.herokuapp.com`         |
| SFCC_ORIGIN               | The SFCC instance URL (ex: `https://abcd-001.dx.commercecloud.salesforce.com`)                      |
| PWA_ORIGIN                | The PWA instance URL (ex: `http://localhost:3000` or `https://your-app-name.mobify-storefront.com`) |
| PREPEND_LOCALE_TO_PATH    | Should the routes include locale in the mapping (ex: `/en_US/`)                                     |
| PREPEND_SITEID_TO_PATH    | Should the routes include Site ID in the mapping (ex: `/RefArch/`)                                  |

### Run the server
You need to make sure you have the PWA local development server running on another terminal tab.
```sh
npm start

# output: Proxy server listening: http://localhost:8001
```

Then open browser http://localhost:8001, you should have both the SFRA/SiteGenesis and PWA sites running on the same domain.

## License

Licensed under the current NDA and licensing agreement in place with your organization. (This is explicitly **not** open source licensing.)

## Support

**This project should not be treated as Salesforce Product.** It is an example implementation of a reverse proxy to be used for local development of a hybrid composable storefront. Customers and partners implement this at-will with no expectation of roadmap, technical support,
defect resolution, production-style SLAs.

This project is maintained by the **Salesforce Community**. Salesforce Commerce Cloud or Salesforce Platform Technical
Support do not support this project or its setup.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

For feature requests or bugs, please open a [GitHub issue](https://github.com/SalesforceCommerceCloud/composable-hybrid-dev-server/issues). 
