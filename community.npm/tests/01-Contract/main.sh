#!/usr/bin/env bash.origin.script

set -e

echo ">>>TEST_IGNORE_LINE:in [\d\.]+s$<<<"
echo ">>>TEST_IGNORE_LINE:vulnerabilities$<<<"
echo ">>>TEST_IGNORE_LINE:^\s*$<<<"

rm -Rf .~* || true

inf {
    "#": "../../",

    "verify #": "./verify.",

    "verify # ls + 1": "./.~cache",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .cache": "./.~cache",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack + 1": {
        "name": "testpack",
        "descriptor": "./package1.json"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack + 2": {
        "name": "testpack",
        "stream": "0.1",
        "descriptor": "./package1.json"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack + 3": {
        "name": "testpack",
        "stream": "0",
        "descriptor": "./package1.json"
    },

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack + 4": {
        "name": "testpack",
        "stream": "0",
        "descriptor": "./package2.json",
        "aspect": "dependencies"
    },

    "org.pinf.genesis.inception # run()": "contract",

    "verify # ls + 2": "./.~cache/io.nodepack.inf/community.npm/testpack",
    "verify # ls + 3": "./.~cache/io.nodepack.inf/community.npm/testpack/*/*",

    "verify # cat + 1": "./.~cache/io.nodepack.inf/community.npm/testpack/v0_v10_darwin_x64/devDependencies/package.json",
    "verify # cat + 2": "./.~cache/io.nodepack.inf/community.npm/testpack/v0.1_v10_darwin_x64/devDependencies/package.json",
    "verify # cat + 3": "./.~cache/io.nodepack.inf/community.npm/testpack/v10_darwin_x64/devDependencies/package.json"

}

echo "OK"
