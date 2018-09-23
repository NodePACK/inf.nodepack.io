#!/usr/bin/env bash.origin.script

echo "TEST_MATCH_IGNORE>>>"

rm -Rf .~* || true

inf {
    "#": "../",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .cache": "./.~cache",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack": {
        "name": "testpack",
        "descriptor": "./package.json"
    },

    "org.pinf.genesis.inception # run()": "contract"
}

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
