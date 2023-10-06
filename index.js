'use strict';

const express = require('express');
const querystring = require('querystring');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { matchPath } = require('react-router');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const env = dotenv.config();
dotenvExpand.expand(env);

const { MULTI_ENV_SOURCES } = require('./utils/constants');
const PORT = process.env.PORT || 8001;
const MULTI_ENV_SOURCE = process.env.MULTI_ENV_SOURCE;
let PROXY_ORIGIN = process.env.PROXY_ORIGIN;
let SFCC_ORIGIN = process.env.SFCC_ORIGIN;
let PWA_ORIGIN = process.env.PWA_ORIGIN;
let MRT_RULES = Object.entries(process.env)
  .filter(([key, value]) => key.startsWith('MRT_RULE_') && value)
  .map(([_key, value]) => value); // eslint-disable-line no-unused-vars
const PWA_ROUTES = require('./routes');
const { evaluateRule } = require('./utils/mrt-rule-matcher');
const { iterate } = require('./utils/proxyHelpers');

const options = {
  target: SFCC_ORIGIN,
  secure: false,
  changeOrigin: true,
  autoRewrite: true,
  hostRewrite: true,
  cookieDomainRewrite: true,
  router: (req) => {
    // use cookies or hostname to determine env vars (PROXY_ORIGIN_ZZTE053, SFCC_ORIGIN_ZZTE053, PWA_ORIGIN_ZZTE053, ZZTE053_MRT_RULE_1)
    if (MULTI_ENV_SOURCE && Object.hasOwnProperty.call(MULTI_ENV_SOURCES, MULTI_ENV_SOURCE.toUpperCase()) && MULTI_ENV_SOURCES[MULTI_ENV_SOURCE.toUpperCase()]) {
      console.log(`multi environment enabled, checking ${MULTI_ENV_SOURCE} for env vars`);

      const cookies = req.headers.cookie;
      const parsedCookies = querystring.parse(cookies, '; ');
      let ccEnv = MULTI_ENV_SOURCE === MULTI_ENV_SOURCES.HOSTNAME ? req.hostname.split('.')[0] : parsedCookies['cc-env'];
      if (ccEnv) {
        ccEnv = ccEnv.toUpperCase();
        console.log(`checking env vars for: PROXY_ORIGIN_${ccEnv}, SFCC_ORIGIN_${ccEnv}, PWA_ORIGIN_${ccEnv}, ${ccEnv}_MRT_RULE_`);
        // proxy origin only needs to be updated for the hostname option
        if (MULTI_ENV_SOURCE === MULTI_ENV_SOURCES.HOSTNAME && process.env[`PROXY_ORIGIN_${ccEnv}`]) {
          PROXY_ORIGIN = process.env[`PROXY_ORIGIN_${ccEnv}`];
          console.log(`updated PROXY_ORIGIN to ${PROXY_ORIGIN}`);
        }
        if (process.env[`SFCC_ORIGIN_${ccEnv}`]) {
          SFCC_ORIGIN = process.env[`SFCC_ORIGIN_${ccEnv}`];
          console.log(`updated SFCC_ORIGIN to ${SFCC_ORIGIN}`);
        }
        if (process.env[`PWA_ORIGIN_${ccEnv}`]) {
          PWA_ORIGIN = process.env[`PWA_ORIGIN_${ccEnv}`];
          console.log(`updated PWA_ORIGIN to ${PWA_ORIGIN}`);
        }
        const MRT_RULES_ENV = Object.entries(process.env)
          .filter(([key, value]) => key.startsWith(`${ccEnv}_MRT_RULE_`) && value)
          .map(([_key, value]) => value); // eslint-disable-line no-unused-vars
        if (MRT_RULES_ENV.length) {
          MRT_RULES = MRT_RULES_ENV;
          console.log(`updated MRT_RULES to ${MRT_RULES}`);
        }
      }
    }

    if (MRT_RULES.length) {
      let match = MRT_RULES.some((rule) => evaluateRule(rule, {
        host: req.hostname,
        uri: req.url,
        path: req.path,
        cookies: req.headers.cookie || ''
      }));

      if (match) {
        console.log(`Proxying ${req.path} to ${PWA_ORIGIN}...`);
        return PWA_ORIGIN;
      }
    } else {
      let match = PWA_ROUTES.some((route) => {
        return matchPath(req.path, route);
      });

      if (match || req.path.startsWith('/mobify')) {
        return PWA_ORIGIN;
      }
    }

    console.log(`Proxying ${req.path} to ${SFCC_ORIGIN}...`);
    return SFCC_ORIGIN;
  },
  selfHandleResponse: true,
  onProxyRes: (proxyRes, req, res) => {
    return responseInterceptor(async (responseBuffer) => {
      const contentType = proxyRes?.headers['content-type'];
      if (!contentType) return responseBuffer;

      let response;
      let updatedResponse;

      switch (contentType.split(';')[0]) {
        case 'text/html':
          response = responseBuffer.toString('utf8');

          // some links are absolute URLs, replace them so they go through the proxy
          updatedResponse = response.replace(new RegExp(`${SFCC_ORIGIN}`, 'g'), PROXY_ORIGIN);

          // replace any redirects to the SFCC origin with the proxy origin (for example: URLUtils.https)
          if (proxyRes?.headers?.location && proxyRes?.headers?.location.includes(SFCC_ORIGIN)) {
            console.log(`Rewriting location header => ${proxyRes.headers.location}`);
            res.setHeader('location', proxyRes.headers.location.replace(SFCC_ORIGIN, PROXY_ORIGIN));
          }

          return updatedResponse;
        case 'application/json':
          try {
            response = JSON.parse(responseBuffer.toString('utf8'));
            return JSON.stringify(iterate(response, null, { SFCC_ORIGIN, PROXY_ORIGIN }));
          } catch (e) {
            console.error(`error parsing JSON input: ${e}`);
            return responseBuffer;
          }
        default:
          return responseBuffer;
      }
    })(proxyRes, req, res);
  }
};

const app = express();

app.use(createProxyMiddleware(options));

app.listen(PORT, () => {
  console.log(`Proxy server listening: ${PROXY_ORIGIN}`);
  if (MRT_RULES.length) {
    console.log('Using MRT rules to determine proxy target');
  }
});
