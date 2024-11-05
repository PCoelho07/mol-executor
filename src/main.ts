import { exec } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const generateNewCode = (codeToBeInjected: string): string => {
    const path = resolve("src/executors/node/run.ts");
    const currentCode = readFileSync(path, { encoding: "utf-8", flag: "r"});
    const codeReplaced = currentCode.replace(/<code>/gm, codeToBeInjected); 
    return codeReplaced;
}

const injectCodeToFunction = (code: string): void => {
    const path = resolve("src/executors/node/run.ts");
    writeFileSync(path, code);
}

const buildAndRunFunction = (): void => {
    exec("cd ./src/executors/node; npm run build; npm start;", { timeout: 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`); 
            return;
        }

        console.log(`stdout: ${stdout}`); 
        console.log(`stderr: ${stderr}`); 
    });
}

const runInjectedCode = (codeToBeInjected: string) => {
    const newCode = generateNewCode(codeToBeInjected);
    injectCodeToFunction(newCode);
    buildAndRunFunction();
}

const main = () => {
    const code = process.argv[2];
    console.log(code);
    runInjectedCode(code);
}  


main();
