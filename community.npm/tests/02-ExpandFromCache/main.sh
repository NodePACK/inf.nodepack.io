#!/usr/bin/env bash.origin.script

set -e

echo ">>>TEST_IGNORE_LINE:in [\d\.]+s$<<<"
echo ">>>TEST_IGNORE_LINE:vulnerabilities$<<<"
echo ">>>TEST_IGNORE_LINE:^\s*$<<<"

rm -Rf .~* node_modules || true

inf {
    "#": "../",

    "verify #": "../01-Contract/verify.",

    "verify # ls + 1": "../01-Contract/.~cache/io.nodepack.inf/community.npm/testpack",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .cache": "../01-Contract/.~cache",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +1": {
        "name": "testpack",
        "aspect": "dependencies",
        "stream": "0.1",
        "basePath": "./.~testpack~dependencies"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +2": {
        "name": "testpack",
        "aspect": "devDependencies",
        "stream": "0.1",
        "basePath": "./.~testpack~devDependencies"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +3": {
        "name": "testpack",
        "aspect": "devDependencies",
        "stream": "0.1",
        "basePath": "."
    },

    "org.pinf.genesis.inception # run()": "expand",

    "verify # ls + 2": "./.~testpack~*",
    "verify # ls + 3": "./.~io.nodepack.inf~*",
    "verify # ls + 4": "./node_modules/.bin"

}

echo "OK"
