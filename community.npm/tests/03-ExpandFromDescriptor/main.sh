#!/usr/bin/env bash.origin.script

echo "TEST_MATCH_IGNORE>>>"

rm -Rf .~* || true

inf {
    "#": "../",

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

    "org.pinf.genesis.inception # run()": "expand"
}

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
