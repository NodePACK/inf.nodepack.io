#!/usr/bin/env bash.origin.script

set -e

echo ">>>TEST_IGNORE_LINE:in [\d\.]+s$<<<"
echo ">>>TEST_IGNORE_LINE:vulnerabilities$<<<"
echo ">>>TEST_IGNORE_LINE:^\s*$<<<"

rm -Rf .~* node_modules || true

inf {
    "#": "../../",

    "verify #": "../01-Contract/verify.",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +1": {
        "name": "testpack",
        "descriptor": "./package.json",
        "aspect": "dependencies",
        "basePath": "./.~testpack~dependencies"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +2": {
        "name": "testpack",
        "descriptor": "./package.json",
        "aspect": "devDependencies",
        "basePath": "./.~testpack~devDependencies"
    },

    "org.pinf.genesis.inception # run()": "expand",

    "verify # ls + 1": "./.~testpack~*",
    "verify # ls + 2": "./.~io.nodepack.inf~*",
    "verify # ls + 3": "./node_modules"

}

echo "-----"

set +e

echo ">>>TEST_IGNORE_LINE:^\s+at<<<"
echo ">>>TEST_IGNORE_LINE:^\[inf\] filepath: <<<"

# Test that will throw because 'basePath = .' and '.cache' not set.
inf {
    "#": "../../",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack +1": {
        "name": "testpack",
        "descriptor": "./package.json",
        "aspect": "devDependencies",
        "basePath": "."
    },

    "org.pinf.genesis.inception # run()": "expand"
}

echo "OK"
