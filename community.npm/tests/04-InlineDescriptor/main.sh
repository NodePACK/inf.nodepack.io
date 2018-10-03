#!/usr/bin/env bash.origin.script

set -e

echo "TEST_MATCH_IGNORE>>>"

rm -Rf .~* || true

inf {
    "#": "../../",

    "verify #": "../01-Contract/verify.",

    "org.pinf.genesis.inception/io.nodepack.inf/community.npm # .[]pack": {
        "name": "testpack",
        "descriptor": {
            "dependencies": {
                "graceful-fs": "4.1.11"
            }
        },
        "aspect": "dependencies",
        "basePath": "./.~testpack~dependencies"
    },

    "org.pinf.genesis.inception # run()": "expand",

    "verify # ls + 1": "./.~testpack~*",
    "verify # ls + 2": "./.~io.nodepack.inf~*",
    "verify # ls + 3": "./node_modules"

}

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
