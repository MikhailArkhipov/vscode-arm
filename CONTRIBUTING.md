The extension is all TypeScript. It does not employ language server and language features are implemented directly.

### Setup
1. Install [VS Code](https://code.visualstudio.com/download).
2. Fork and clone the [repo](https://github.com/MikhailArkhipov/vscode-arm).
3. Install [node.js](https://nodejs.org/en)
4. Open command prompt.
5. From the cloned root run `npm install`.
6. Run `npm run build`.
7. Run VS Code.
8. Install extensions: 
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer)
- [Test Adapter](https://marketplace.visualstudio.com/items?itemName=ms-vscode.test-adapter-converter)
- [Jest Test Explorer](https://marketplace.visualstudio.com/items?itemName=kavod-io.vscode-jest-test-adapter).
9. Open folder in VS Code.
10. You should be able to run the extension and tests from VS Code.

### Coding guidelines
Nothing special, standard TypeScript conventions. For formatting - tab size is 2, spaces only. Test runner is [Jest](https://jestjs.io/).

### Circular dependencies
After adding new files do run `madge --circular .` from the root to detect any circular dependencies and avoid headaches at runtime such as *caught* exceptions like `TypeError: Class extends value undefined is not a constructor or null`. Alternatively, install [dpdm](https://github.com/acrazing/dpdm), although [`madge`](https://www.npmjs.com/package/madge) seems to detect more and better.
- `npm i -g dpdm`
- `dpdm ./src/extension.ts`

### Code sources
Tokenizer and parser are based on my Microsoft work on [R Tools](https://github.com/MikhailArkhipov/vscode-r), simplified, translated to TypeScript and adapted for the ARM assembly language syntax (GAS/GCC variety).

### Instruction documentation
[Instruction documentation](https://github.com/MikhailArkhipov/vscode-arm/tree/main/src/instruction_sets) for A32 and A64 was generated from free ARM sources, downloads are [here](https://developer.arm.com/downloads/-/exploration-tools). Archives are huge so re-shipping them is probably not an option. Generator code is in sources, `arm.convertHtmlToIndex` command can be activated in the [extension](https://github.com/MikhailArkhipov/vscode-arm/blob/main/src/extension.ts). [Generator source code](https://github.com/MikhailArkhipov/vscode-arm/blob/main/src/instructions/index.ts).

### Directives documentation
Fetched directly from GAS/GCC Web site. No local caching is implemented at the moment. See [documentation.ts](https://github.com/MikhailArkhipov/vscode-arm/blob/main/src/documentation/documentation.ts)