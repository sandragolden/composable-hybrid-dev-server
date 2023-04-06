'use strict';

/*
 * This is a simple implementation of the Cloudflare rule language to support
 * MRT rules for proxy.
 * It is not a complete implementation of the Cloudflare rule language but
 * implements the most common expressions and functions available for MRT routing
 * Reference: https://developers.cloudflare.com/ruleset-engine/rules-language/
 */

const assert = require('assert');

const EXPR_REPLACEMENTS = [
  {
    // to avoid modifying string prototype
    from: /\bhttp.request.uri.path\b/g,
    to: 'http.request._path'
  },
  {
    from: /\band\b/g,
    to: '&&'
  },
  {
    from: /\bor\b/g,
    to: '||'
  },
  {
    from: /\bnot\b/g,
    to: '!'
  },
  {
    from: /\beq\b/g,
    to: '==='
  },
  {
    from: /\smatches\s?("[^"]+")/g,
    to: '.match($1) '
  },
  {
    from: /\s~\s?("[^"]+")/g,
    to: '.match($1) '
  },
  {
    from: /\scontains\s?("[^"]+")/g,
    to: '.includes($1) '
  }
];

// subset of functions most useful for processing the fields available for MRT rules
const TRANSFORMS = {
  lower: (str) => str.toLowerCase(),
  upper: (str) => str.toUpperCase(),
  concat: (...args) => args.join(''),
  ends_with: (str, suffix) => str.endsWith(suffix),
  starts_with: (str, prefix) => str.startsWith(prefix),
  len: (str) => str.length,
  regex_replace: (str, regex, replacement) => str.replace(new RegExp(regex, 'g'), replacement)
};

/**
 * Parse rule expression to function
 *
 * @param {string} ruleExpression
 * @return {string} javascript expression that can be evaluated to match the rule
 */
function parseRuleExpression(ruleExpression) {
  EXPR_REPLACEMENTS.forEach(replacement => {
    ruleExpression = ruleExpression.replace(replacement.from, replacement.to);
  });

  return ruleExpression;
}

/**
 * @typedef {Object} RequestFields
 * @property {string} host hostname
 * @property {string} uri full uri including query string
 * @property {string} path path only
 * @property {string} cookies full cookies string
 */

/**
 * Evaluate a rule expression against the request fields
 *
 * @param {string} ruleExpression mrt rule expression
 * @param {RequestFields} requestFields fields of the request to match again
 * @return {boolean} does the rule evaluation to true for the given options
 */
function evaluateRule(ruleExpression, {
  host, uri, path, cookies = ''
} = {}) {
  const _expr = parseRuleExpression(ruleExpression);

  const args = ['http'].concat(Object.keys(TRANSFORMS)).concat(`return ${_expr}`);
  try {
    const func = new Function(...args);
    return !!func.apply(undefined, [{
      host: host,
      request: {
        uri: uri,
        _path: path
      },
      cookies: cookies
    }].concat(Object.values(TRANSFORMS)));
  } catch (e) {
    console.error('Error evaluating rule. Check compiled expression: ', _expr);
    throw e;
  }
}

// TESTS
if (require.main === module) {
  const TEST_RULES = [
    '(http.host eq "dev-customer.salesforce.com" and not ( http.request.uri.path matches "/on/path1/.*" or http.request.uri.path matches "/on/path2/.*" or http.request.uri.path matches ".*routeDetails=true" or http.request.uri.path eq "/path3.txt" ))',
    // test alternative syntax and functions
    'not http.host eq "dev-customer.example.com"'
  ];
  const TEST_RULES_2 = [
    // common for the proxy
    'http.host == "dev-customer.salesforce.com" and starts_with(http.request.uri.path, "/mobify")'
  ];
  const TEST_RULES_3 = [
    'http.cookies contains "supersecret"'
  ];
  const TEST_RULES_4 = [
    '(starts_with(http.host, "dev-customer") and not ( ends_with(http.host, "example.com")) and http.host ~ ".*salesforce\.com" and http.host contains "dev")'
  ];

  const TEST_HOST = 'dev-customer.salesforce.com';
  const TEST_COOKIES = 'blah=foo; blah2=bar';

  TEST_RULES.forEach(r => console.log(parseRuleExpression(r)));
  TEST_RULES_2.forEach(r => console.log(parseRuleExpression(r)));
  TEST_RULES_3.forEach(r => console.log(parseRuleExpression(r)));

  assert.equal(TEST_RULES.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/path3.txt?some=thing',
    path: '/path3.txt'
  })), false);

  assert.equal(TEST_RULES.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/foo/bar?some=thing',
    path: '/foo/bar'
  })), true);

  assert.equal(TEST_RULES_2.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/mobify/proxy/foo/bar',
    path: '/mobify/proxy/foo/bar'
  })), true);

  assert.equal(TEST_RULES.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/on/path2/something?some=thing',
    path: '/on/path2/something'
  })), false);

  assert.equal(TEST_RULES_3.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/on/path2/something?some=thing',
    path: '/on/path2/something'
  })), false);

  assert.equal(TEST_RULES_4.some(exp => evaluateRule(exp, {
    host: TEST_HOST,
    cookies: TEST_COOKIES,
    uri: '/on/path2/something?some=thing',
    path: '/on/path2/something'
  })), true);
}

module.exports = {
  evaluateRule,
  parseRuleExpression
};
