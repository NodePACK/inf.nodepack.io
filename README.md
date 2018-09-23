inf.nodepack.io
===============

> Pack a bunch of code packages into an archive for optimized batch provisioning in identical environments.


Usage
-----

```
#!/usr/bin/env inf
{
    "#": "io.nodepack.inf",

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
```


Development
-----------

    nvm use 10
    npm install
    npm test
