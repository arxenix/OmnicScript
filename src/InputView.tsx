import React, {createRef} from 'react';
import MonacoEditor from 'react-monaco-editor';

type Props = {
   code: string;
   onChange?: (code: string, event: any) => void;
}

type State = {

}

function changeModelURI(monaco, editor, model1, newURI) {
    console.log("changing model uri");
    console.log(model1);
    // Assuming model1 is the previous model
    var model2 = monaco.editor.createModel(model1.getValue(), undefined, newURI);

    var cm2 = model2._commandManager;
    var cm1 = model1._commandManager;
    var temp;

    // SWAP currentOpenStackElement
    temp = cm2.currentOpenStackElement;
    cm2.currentOpenStackElement = cm1.currentOpenStackElement;
    cm1.currentOpenStackElement = temp;

    // SWAP past
    temp = cm2.past;
    cm2.past = cm1.past;
    cm1.past = temp;

    // SWAP future
    temp = cm2.future;
    cm2.future = cm1.future;
    cm1.future = temp;

    editor.setModel(model2);
    model1.dispose()
}

export class InputView extends React.Component<Props, State> {
    public static defaultProps = {
        code: '',
        onChange: ()=>{}
    };

    public monacoRef = createRef<MonacoEditor>();
    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
        return nextProps.code !== this.props.code;
    }

    editorDidMount(editor, monaco) {
        console.log("Mounted!");
        console.log(editor);
        console.log(monaco);

        console.log("before");
        console.log(editor.getModel());
        changeModelURI(monaco, editor, monaco.editor.getModels()[0], monaco.Uri.parse('file:///main.tsx'));
        console.log("after");
        console.log(editor.getModel());
    }


    editorWillMount(monaco) {
        console.log("will mount... setting defaults");
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2016,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            noLib: true,
           // typeRoots: ["node_modules/@types"]
        });

        fetch('./workshop.types.d.ts').then(r => r.text()).then(r => {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(r, 'file:///node_modules/@types/omnic/index.d.ts')
        })
    }

    render() {
        const {code, onChange} = this.props;
        const options = {
            automaticLayout: true
        };
        return (
            <div style={{border: '1px solid black'}}>
                <MonacoEditor
                    ref={this.monacoRef}
                    height='80vh'
                    width='100%'
                    value={code}
                    language='typescript'
                    editorWillMount={this.editorWillMount}
                    editorDidMount={this.editorDidMount}
                    options={options}
                    onChange={onChange}
                />
            </div>
        )
    }
}