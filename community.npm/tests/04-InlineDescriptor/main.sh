#!/usr/bin/env bash.origin.script

echo "TEST_MATCH_IGNORE>>>"

rm -Rf .~* || true

inf {
    "#": "../",

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

    "org.pinf.genesis.inception # run()": "expand"
}

echo "<<<TEST_MATCH_IGNORE"

echo "OK"
