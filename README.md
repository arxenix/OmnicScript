# OmnicScript
A high-level language (and an editor for it) that compiles down to workshop rules.

The frontend is written in TypeScript + React. The code editor used is Monaco.

The compiler is also written in TypeScript, and therefore no backend is required (compilation is done on the frontend). It compiles to a RuleFile, a .json file representing the rules to input into OW. You can use the RuleInputBot to enter them into Overwatch automatically.

[Docs Here](https://omnicscript-docs.arxenix.dev)


# Todo
- move compiler to its own package/module
- better UI
- add more features to compiler
  - variable decls
  - if/else
  - for loops

