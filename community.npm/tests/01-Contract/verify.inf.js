
'use strict';

exports.inf = async function (INF, ALIAS) {

    return {
        invoke: async function (pointer, value) {

            if (pointer === "ls") {

                console.log("VERIFY: ls", value.toString());

                await (new Promise(function (resolve, reject) {
                    const proc = INF.LIB.CHILD_PROCESS.spawn("ls", [ '-a', value.toString() ], {
                        cwd: INF.rootDir,
                        stdio: 'inherit',
                        shell: '/bin/bash'
                    });
                    proc.on('close', (code) => {
                        resolve();
                    });            
                }));

                console.log("VERIFY DONE");

                return true;
            } else
            if (pointer === "cat") {

                console.log("VERIFY: cat", value.toString());

                await (new Promise(function (resolve, reject) {
                    const proc = INF.LIB.CHILD_PROCESS.spawn("cat", [ value.toString() ], {
                        cwd: INF.rootDir,
                        stdio: 'inherit',
                        shell: '/bin/bash'
                    });
                    proc.on('close', (code) => {
                        resolve();
                    });            
                }));

                console.log("VERIFY DONE");

                return true;
            }
        }
    };
}
