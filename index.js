'use strict';

const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { matchPath } = require('react-router');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const env = dotenv.config();
dotenvExpand.expand(env);

const PORT = process.env.PORT || 8001;
const PROXY_ORIGIN = process.env.PROXY_ORIGIN;
const SFCC_ORIGIN = process.env.SFCC_ORIGIN;
const PWA_ORIGIN = process.env.PWA_ORIGIN;
const MRT_RULES = Object.entries(process.env)
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
          if (proxyRes.headers.location?.includes(SFCC_ORIGIN)) {
            console.log(`Rewriting location header => ${proxyRes.headers.location}`);
            res.setHeader('location', proxyRes.headers.location.replace(SFCC_ORIGIN, PROXY_ORIGIN));
          }

          return updatedResponse;
        case 'application/json':
          response = JSON.parse(responseBuffer.toString('utf8'));
          return JSON.stringify(iterate(response, null));
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
