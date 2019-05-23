import {
    ArrayLiteralExpression,
    BinaryExpression,
    Block,
    CallExpression, EnumDeclaration,
    ExpressionStatement,
    FunctionExpression,
    Identifier,
    Node,
    NumericLiteral,
    PrefixUnaryExpression,
    Project,
    PropertyAccessExpression,
    StringLiteral,
    SyntaxKind
} from "ts-morph";
import {serialize, serializeAs, Serialize} from "cerialize";

class Arg {
    @serialize value: string;
    @serializeAs(Arg) args?: Arg[];

    public constructor(value: string, ...args: Arg[]) {
        this.value = value;
        this.args = args;
    }
}

class Action {
    @serialize action: string;
    @serializeAs(Arg) args?: Arg[];

    public constructor(action: string, ...args: Arg[]) {
        this.action = action;
        this.args = args;
    }

}

class Rule {
    @serialize title: string;
    @serialize event: string;
    @serialize team?: string;
    @serialize player?: string;
    @serializeAs(Arg) conditions?: Arg[][];
    @serializeAs(Action) actions?: Action[];

    public constructor(title: string, event: string, team?: string, player?: string, conditions?: Arg[][], actions?: Action[]) {
        this.title = title;
        this.event = event;
        this.team = team;
        this.player = player;
        this.conditions = conditions;
        this.actions = actions;
    }

}

class RootObject {
    @serializeAs(Rule) rules: Rule[];

    public constructor(...rules: Rule[]) {
        this.rules = rules;
    }
}

function cleanSource(source) {
    let lastSrc = source.getFullText();
    while (true) {
        source.fixUnusedIdentifiers();
        let newSrc = source.getFullText();
        if (lastSrc === newSrc)
            break;
        else
            lastSrc = newSrc;
    }
}


export async function compile(script: string) {
    //const wsFuncMap = await fetch('./wsFuncMap.json').then(r => r.json());
    const wsFuncMap = await fetch('./wsFuncMap.json').then(r => r.json());
    const typeDecls = await fetch('./workshop.types.d.ts').then(r => r.text());
    console.log("compiling...");
    const project = new Project({useVirtualFileSystem: true});
    const fs = project.getFileSystem();
    fs.mkdir('./node_modules/@types');
    project.createSourceFile("./script.ts", script);
    project.createSourceFile('./node_modules/@types/omnic/index.d.ts', typeDecls);

    // get compiler errs
    const diagnostics = project.getPreEmitDiagnostics();
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));

    const sourceFile = project.getSourceFileOrThrow("./script.ts");
    // const declFile = project.getSourceFileOrThrow("./node_modules/@types/workshop.types/index.d.ts");

    // TODO - reuse funccall code
    class NamedFunctionCall {
        name: string;
        args: Node[];
    }


    cleanSource(sourceFile);
    console.log(sourceFile.print());

    const rootNode = sourceFile.getChildSyntaxListOrThrow();


    class CompilerError extends Error {
        constructor(node: Node, message?: string) {
            super(`Error at line ${node.getStartLineNumber(false)} pos ${node.getStartLinePos(false)} to line ${node.getEndLineNumber()}: ${message}. \nNode: \n${node.print()}\n`);
        }
    }

    function assert(node: Node, condition: boolean, errText: string) {
        if (!condition) {
            throw new CompilerError(node, errText);
        }
    }

    function compileValue(node: Node): Arg {
        if (node.getKind() === SyntaxKind.NumericLiteral) {
            const val = (node as NumericLiteral).getLiteralValue();
            //TODO - proper number literal formatting
            return new Arg("NUMBER", new Arg(val.toString()));
        } else if (node.getKind() === SyntaxKind.TrueKeyword) {
            return new Arg("TRUE");
        } else if (node.getKind() === SyntaxKind.FalseKeyword) {
            return new Arg("FALSE");
        } else if (node.getKind() === SyntaxKind.NullKeyword) {
            return new Arg("NULL");
        } else if (node.getKind() === SyntaxKind.PrefixUnaryExpression) {
            const prefixUnaryExpression = node as PrefixUnaryExpression;
            const operator = prefixUnaryExpression.getOperatorToken();
            const NOT_TOKEN = 52;
            if (operator === NOT_TOKEN) {
                // !value -> NOT(value)
                return new Arg("NOT", compileValue(prefixUnaryExpression.getOperand()));
            } else {
                throw new CompilerError(prefixUnaryExpression, "Unimplemented prefix operator");
            }
        } else if (node.getKind() === SyntaxKind.BinaryExpression) {
            const binaryExpression = node as BinaryExpression;
            const operator = binaryExpression.getOperatorToken().getText();
            const left = binaryExpression.getLeft();
            const right = binaryExpression.getRight();
            const opDict = {
                "+": "ADD",
                "-": "SUBTRACT",
                "*": "MULTIPLY",
                "/": "DIVIDE",
                "**": "RAISE TO POWER",
                "||": "OR",
                "&&": "AND"
            };
            if (operator === "===" || operator === "!==" || operator === ">=" || operator === "<=" || operator === "<" || operator === ">") {
                let fixedOperator = operator;
                if (fixedOperator === "===")
                    fixedOperator = "==";
                if (fixedOperator === "!==")
                    fixedOperator = "!=";
                return new Arg("COMPARE",
                    compileValue(left),
                    new Arg(fixedOperator),
                    compileValue(right)
                );
            } else if (operator in opDict) {
                return new Arg(opDict[operator], compileValue(left), compileValue(right));
            }
            // TODO - other binary operators?
            else {
                throw new CompilerError(binaryExpression, "Unimplemented operator");
            }
        } else if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
            // TODO - handle property access properly
            const propertyAccessExpression = node as PropertyAccessExpression;
            const varName = (propertyAccessExpression.getExpression() as Identifier).getText();
            const propName = propertyAccessExpression.getName();
            //const enumValue = propertyAccessExpression.getType().getText(declFile);
            const enumValue = namespace[varName][propName];
            return new Arg(enumValue);
        } else if (node.getKind() === SyntaxKind.ExpressionStatement) {
            const expressionStatement = node as ExpressionStatement;
            const expression = expressionStatement.getExpression();
            return compileValue(expression);
        } else if (node.getKind() === SyntaxKind.CallExpression) {
            // function call
            const callExpression = node as CallExpression;
            const callExpressionExpression = callExpression.getExpression();
            if (callExpressionExpression.getKind() === SyntaxKind.Identifier) {
                const funcName = (callExpressionExpression as Identifier).getText();
                if (funcName in namespace) {
                    const realFuncName = namespace[funcName].getName();
                    const args = callExpression.getArguments().map(a => compileValue(a));
                    return new Arg(wsFuncMap.values[realFuncName], ...args);
                } else {
                    // should never be hit
                    throw new CompilerError(callExpression, "Unknown function called");
                }
            } else {
                throw new CompilerError(callExpression, "Unimplemented function call syntax");
            }
        } else if (node.getKind() === SyntaxKind.Identifier) {
            // variable
            const identifier = node as Identifier;
            const varName = identifier.getText();
            if (varName in namespace) {
                const realVarName = namespace[varName].getName();
                return new Arg(wsFuncMap.values[realVarName]);
            }
            else {
                throw new CompilerError(identifier, "Unknown variable name");
            }
        } else {
            throw new CompilerError(node, "Unimplemented or invalid syntax");
        }
    }

    function compileConditionNode(node: Node): Arg[] {
        //TODO optimize for comparisons (no need to compare == TRUE)
        const operator = new Arg("==");
        const right = new Arg("TRUE");
        return [compileValue(node), operator, right];
        // are there other cases to worry about? later - user defined functions?
    }

    function compileActionNode(node: Node): Action {
        //TODO - figure out a clean way to figure out how to reuse this funcCall code
        if (node.getKind() === SyntaxKind.ExpressionStatement) {
            const expressionStatement = node as ExpressionStatement;
            const expression = expressionStatement.getExpression();
            if (expression.getKind() === SyntaxKind.CallExpression) {
                // function call
                const callExpression = expression as CallExpression;
                const callExpressionExpression = callExpression.getExpression();
                if (callExpressionExpression.getKind() === SyntaxKind.Identifier) {
                    const funcName = (callExpressionExpression as Identifier).getText();
                    if (funcName in namespace) {
                        const realFuncName = namespace[funcName].getName();
                        if (realFuncName in wsFuncMap.actions) {
                            const args = callExpression.getArguments().map(a => compileValue(a));
                            return new Action(wsFuncMap.actions[funcName], ...args);
                        } else {
                            throw new CompilerError(callExpression, "You can only call actions at the top level.");
                        }
                    } else {
                        // should never be hit
                        throw new CompilerError(callExpression, "Unknown function called");
                    }
                } else {
                    throw new CompilerError(callExpressionExpression, "Unimplemented or invalid call expression type");
                }
            } else {
                throw new CompilerError(expression, "Unimplemented or invalid expression type");
            }
        } else {
            throw new CompilerError(node, "Unimplemented or invalid syntax");
        }
    }

    // process imports

    const namespace = {};
    for (const importDeclaration of rootNode.getChildrenOfKind(SyntaxKind.ImportDeclaration)) {
        const importClause = importDeclaration.getImportClauseOrThrow();
        const namedImports = importClause.getNamedImports();
        for (const namedImport of namedImports) {
            const nameNode = namedImport.getNameNode();
            const nodeToImport = nameNode.getDefinitionNodes()[0];
            const aliasNode = namedImport.getAliasNode();
            const alias = (aliasNode === undefined) ? nameNode.getText() : aliasNode.getText();
            if (nodeToImport.getKind() === SyntaxKind.EnumDeclaration) {
                const enumDeclaration = nodeToImport as EnumDeclaration;
                const enumDict = {};
                for (const enumMember of enumDeclaration.getMembers()) {
                    enumDict[enumMember.getName()] = enumMember.getValue();
                }
                namespace[alias] = enumDict;
            } else {
                namespace[alias] = nodeToImport;
            }
            console.log(`Imported node ${nameNode.getText()} as ${alias}`);
        }
    }


    // for now, only funcCalls are allowed as root expressions

    const rules: Rule[] = [];
    for (const expression of rootNode.getChildrenOfKind(SyntaxKind.ExpressionStatement)) {
        assert(expression, expression.getChildAtIndex(0).getKind() === SyntaxKind.CallExpression, "can only have rules or var declarations at top-level");
        const ruleCall = expression.getChildAtIndexIfKindOrThrow(0, SyntaxKind.CallExpression);
        assert(ruleCall, ruleCall.getChildAtIndex(0).getKind() === SyntaxKind.CallExpression, "can only have rules or var declarations at top-level");
        const ruleConstruct = ruleCall.getChildAtIndexIfKindOrThrow(0, SyntaxKind.CallExpression);
        const ruleTitleArg = ruleConstruct.getArguments()[0];
        assert(ruleTitleArg, ruleTitleArg.getKind() === SyntaxKind.StringLiteral, "rule title must be a string literal");
        const ruleTitle = (ruleTitleArg as StringLiteral).getLiteralValue();
        console.log(`Compiling rule: ${ruleTitle}`);

        const ruleEvent = compileValue(ruleConstruct.getArguments()[1]).value;
        const ruleTeam = (ruleConstruct.getArguments().length >= 3) ? compileValue(ruleConstruct.getArguments()[2]).value : undefined;
        const rulePlayer = (ruleConstruct.getArguments().length === 4) ? compileValue(ruleConstruct.getArguments()[3]).value : undefined;

        const ruleIdentifier = ruleConstruct.getChildAtIndexIfKindOrThrow(0, SyntaxKind.Identifier);
        assert(ruleIdentifier, ruleIdentifier.getText() === "rule", "can only have rules or var declarations at top-level");

        const ruleConditions = ruleCall.getArguments()[0] as ArrayLiteralExpression;

        const conditions: Arg[][] = [];
        for (const conditionElement of ruleConditions.getElements()) {
            conditions.push(compileConditionNode(conditionElement));
        }

        const ruleActions = ruleCall.getArguments()[1] as FunctionExpression;
        assert(ruleActions, ruleActions.getParameters().length === 0, "rule action fn can't have parameters");
        const ruleActionsBody = ruleActions.getBody() as Block;

        const actions: Action[] = [];
        for (const statement of ruleActionsBody.getStatements()) {
            actions.push(compileActionNode(statement));
        }

        rules.push(new Rule(ruleTitle, ruleEvent, ruleTeam, rulePlayer, conditions, actions));
    }

    return JSON.stringify(Serialize(new RootObject(...rules)), null, 4);
}
