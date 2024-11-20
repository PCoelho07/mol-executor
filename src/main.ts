import "dotenv/config";
import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import config from "./config";

type Metadata = {
    code: string;
    functionName: string;
}

type Question<I = unknown, O = unknown> = {
    input: Array<Array<I>>
    output: Array<O>
}

function getFunctionName(code: string): string {
    const regex = new RegExp(config.functionNameRegex);
    const match = code.match(regex);

    if (match === null) throw new Error(`${code} has no match to ${regex} regex`);

    return match[1];
}


function extractMetadataFromInput(filePath: string): Metadata {
    const fullPath = resolve(config.inputFilePath, `${filePath}`);
    const codeToTest = readFileSync(fullPath, { encoding: "utf-8", flag: "r" });
    const functionName = getFunctionName(codeToTest);

    return {
        code: codeToTest,
        functionName: functionName
    }
}

function getSubmitedCodeFilePath(name: string): string {
    const path = resolve(config.submitedCodeFilePath, `${name}.js`)

    if (!existsSync(config.submitedCodeFilePath)) {
        mkdirSync(config.submitedCodeFilePath);
    }

    return path;
}

function getQuestionDataByName(questionName: string): any {
    const questionPath = resolve("questions", questionName);

    if (!existsSync(questionPath)) throw new Error(`Question ${questionName} does not exists.`);

    const params = readFileSync(resolve(questionPath, "params.json"), { encoding: "utf8", flag: "r" });
    const paramsParsed = JSON.parse(params);
    return {
        input: paramsParsed.params.input,
        output: paramsParsed.params.output,
    }
}

function buildParamsByInputConfig(params: any[]) {
    return `(${params.join(', ')})`;
}

function injectInputCode(question: Question, metadata: Metadata): void {
    const params = buildParamsByInputConfig(question.input[0]);

    const templateCodePath = resolve(config.templateFile, "test.js");
    const templateCode = readFileSync(templateCodePath, { encoding: "utf-8", flag: "r" });
    const templateCodeInjected = `${metadata.code} ${templateCode.replace(config.whereToInjectCode, metadata.functionName + params)}`
    const submitedCodeFilePath = getSubmitedCodeFilePath(metadata.functionName);

    writeFileSync(submitedCodeFilePath, templateCodeInjected);
}

function compareResult(question: Question, result: unknown): boolean {
    const output = question.output[0];
    return output === result;
}

async function runInputCode(metadata: Metadata): Promise<unknown> {
    const submitedCodeFilePath = getSubmitedCodeFilePath(metadata.functionName);

    const runCode = async () => new Promise((resolve, reject) => {
        exec(`node ${submitedCodeFilePath}`, function(error, stdout) {
            if (error) {
                reject(error)
                return;
            }

            resolve(stdout);
        });
    })

    const result = await runCode();
    rmSync(submitedCodeFilePath);

    return result;
}

async function main() {
    const questionName = process.argv[2];
    const filePath = process.argv[3];

    const metadata = extractMetadataFromInput(filePath);
    const question = getQuestionDataByName(questionName);

    injectInputCode(question, metadata);

    const result = await runInputCode(metadata);
    const isSolved = compareResult(question, parseInt(result as string)); // GAMBS ALERT!

    const message = `[${questionName}] ${isSolved ? "Pass" : "Fail"}`

    console.log(message);
}

main();
